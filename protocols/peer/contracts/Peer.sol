/*
  Copyright 2019 Swap Holdings Ltd.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;

import "@airswap/peer/contracts/interfaces/IPeer.sol";
import "@airswap/swap/contracts/interfaces/ISwap.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

/**
  * @title Peer: Deployable Trading Rules for the Swap Protocol
  * @notice Supports fungible tokens (ERC-20)
  * @dev inherits IPeer, Ownable uses SafeMath library
  */
contract Peer is IPeer, Ownable {
  using SafeMath for uint256;

  // Swap contract to be used to settle trades
  ISwap public swapContract;

  // Mapping of takerToken to makerToken for rule lookup
  mapping (address => mapping (address => Rule)) public rules;

  // Mapping of whitelisted addresses that can call on behalf of owner
  mapping (address => bool) private whitelist;

  // ERC-20 (fungible token) interface identifier (ERC-165)
  bytes4 constant internal ERC20_INTERFACE_ID = 0x277f8169;

  /**
    * @notice Contract Constructor
    * @param _swapContract address of the swap contract the peer will deploy with
    * @param _peerContractOwner address that should be the owner of the peer
    */
  constructor(
    address _swapContract,
    address _peerContractOwner
  ) public {
    swapContract = ISwap(_swapContract);
    if (_peerContractOwner != address(0)) {
      whitelist[_peerContractOwner] = true;
      super.transferOwnership(_peerContractOwner);
    }
  }

  /**
    * @notice determines if an address to interact with this peer
    * @param addressToCheck the address to check if whitelisted or not 
    */
  function isWhitelisted(address addressToCheck) external returns(bool) {
    return whitelist[addressToCheck];
  }

  /**
    * @notice adds to the list of whitelisted accounts that can interact with this peer
    * @dev only callable by the owner of the contract
    * @param addressToAdd the address to add to the whitelist
    */
  function addToWhitelist(address addressToAdd) external onlyOwner {
    //TODO: emit
    whitelist[addressToAdd] = true;
  }

  /**
    * @notice removes from the list of whitelisted accounts that can interact with this peer
    * @dev only callable by the owner of the contract
    * @param addressToRemove the address to add to the whitelist
    */
  function removeFromWhitelist(address addressToRemove) external onlyOwner {
    //TODO: emit
    require(addressToRemove != owner(), "OWNER_MUST_BE_WHITELISTED");
    whitelist[addressToRemove] = false;
  }

  function transferOwnership(address newOwner) public onlyOwner {
    whitelist[newOwner] = true;
    whitelist[owner()] = false;
    super.transferOwnership(newOwner);
  }

  /**
    * @dev only whitelisted ensures that only whitelisted parties can call the method it modifies
    */
  modifier onlyWhitelisted() {
    require(whitelist[msg.sender] == true, "CALLER_NOT_WHITELISTED");
    _;
  }

  /**
    * @notice Set a Trading Rule
    * @dev only callable by the owner of the contract
    * @param _takerToken address The address of an ERC-20 token the peer would send
    * @param _makerToken address The address of an ERC-20 token the consumer would send
    * @param _maxTakerAmount uint256 The maximum amount of ERC-20 token the peer would send
    * @param _priceCoef uint256 The whole number that will be multiplied by 10^(-priceExp) - the price coefficient
    * @param _priceExp uint256 The exponent of the price to indicate location of the decimal priceCoef * 10^(-priceExp)
    */
  function setRule(
    address _takerToken,
    address _makerToken,
    uint256 _maxTakerAmount,
    uint256 _priceCoef,
    uint256 _priceExp
  ) external onlyWhitelisted {

    rules[_takerToken][_makerToken] = Rule({
      maxTakerAmount: _maxTakerAmount,
      priceCoef: _priceCoef,
      priceExp: _priceExp
    });

    emit SetRule(
      _takerToken,
      _makerToken,
      _maxTakerAmount,
      _priceCoef,
      _priceExp
    );
  }

  /**
    * @notice Unset a Trading Rule
    * @dev only callable by the owner of the contract, removes from a mapping
    * @param _takerToken address The address of an ERC-20 token the peer would send
    * @param _makerToken address The address of an ERC-20 token the consumer would send
    */
  function unsetRule(
    address _takerToken,
    address _makerToken
  ) external onlyWhitelisted {

    // Delete the rule.
    delete rules[_takerToken][_makerToken];

    emit UnsetRule(
      _takerToken,
      _makerToken
    );
  }

  /**
    * @notice Get a Maker-Side Quote from the Peer
    * @param _takerParam uint256 The amount of ERC-20 token the peer would send
    * @param _takerToken address The address of an ERC-20 token the peer would send
    * @param _makerToken address The address of an ERC-20 token the consumer would send
    * @return uint256 makerParam The amount of ERC-20 token the consumer would send
    */
  function getMakerSideQuote(
    uint256 _takerParam,
    address _takerToken,
    address _makerToken
  ) external view returns (
    uint256 makerParam
  ) {

    Rule memory rule = rules[_takerToken][_makerToken];

    // Ensure that a rule exists.
    if(rule.maxTakerAmount > 0) {

      // Ensure the _takerParam does not exceed maximum for the rule.
      if(_takerParam <= rule.maxTakerAmount) {

        makerParam = _takerParam
            .mul(rule.priceCoef)
            .div(10 ** rule.priceExp);

        // Return the quote.
        return makerParam;
      }
    }
    return 0;
  }

  /**
    * @notice Get a Taker-Side Quote from the Peer
    * @param _makerParam uint256 The amount of ERC-20 token the consumer would send
    * @param _makerToken address The address of an ERC-20 token the consumer would send
    * @param _takerToken address The address of an ERC-20 token the peer would send
    * @return uint256 takerParam The amount of ERC-20 token the peer would send
    */
  function getTakerSideQuote(
    uint256 _makerParam,
    address _makerToken,
    address _takerToken
  ) external view returns (
    uint256 takerParam
  ) {

    Rule memory rule = rules[_takerToken][_makerToken];

    // Ensure that a rule exists.
    if(rule.maxTakerAmount > 0) {

      // Calculate the _takerParam.
      takerParam = _makerParam
        .mul(10 ** rule.priceExp).div(rule.priceCoef);

      // Ensure the takerParam does not exceed maximum and is greater than zero.
      if(takerParam <= rule.maxTakerAmount && takerParam > 0) {
        return takerParam;
      }
    }
    return 0;
  }

  /**
    * @notice Get a Maximum Quote from the Peer
    * @param _takerToken address The address of an ERC-20 token the peer would send
    * @param _makerToken address The address of an ERC-20 token the consumer would send
    * @return uint256 takerParam The amount the peer would send
    * @return uint256 makerParam The amount the consumer would send
    */
  function getMaxQuote(
    address _takerToken,
    address _makerToken
  ) external view returns (
    uint256 takerParam,
    uint256 makerParam
  ) {

    Rule memory rule = rules[_takerToken][_makerToken];

    // Ensure that a rule exists.
    if(rule.maxTakerAmount > 0) {

      // Return the maxTakerAmount and calculated _makerParam.
      return (
        rule.maxTakerAmount,
        rule.maxTakerAmount.mul(rule.priceCoef).div(10 ** rule.priceExp)
      );
    }
    return (0, 0);
  }

  /**
    * @notice Provide an Order
    * @dev Rules get reset with new maxTakerAmount
    * @param _order Types.Order
    */
  function provideOrder(
    Types.Order calldata _order
  ) external {

    Rule memory rule = rules[_order.taker.token][_order.maker.token];

    require(_order.maker.wallet == msg.sender,
      "MAKER_MUST_BE_SENDER");

    require(_order.maker.kind == ERC20_INTERFACE_ID,
      "MAKER_MUST_BE_ERC20");

    require(_order.taker.kind == ERC20_INTERFACE_ID,
      "TAKER_MUST_BE_ERC20");

    // Ensure that a rule exists.
    require(rule.maxTakerAmount != 0,
      "TOKEN_PAIR_INACTIVE");

    // Ensure the order does not exceed the maximum amount.
    require(_order.taker.param <= rule.maxTakerAmount,
      "AMOUNT_EXCEEDS_MAX");

    // Ensure the order is priced according to the rule.
    require(_order.taker.param == _order.maker.param
      .mul(10 ** rule.priceExp).div(rule.priceCoef),
      "PRICE_INCORRECT");

    // Overwrite the rule with a decremented maxTakerAmount.
    rules[_order.taker.token][_order.maker.token] = Rule({
      maxTakerAmount: (rule.maxTakerAmount).sub(_order.taker.param),
      priceCoef: rule.priceCoef,
      priceExp: rule.priceExp
    });

    // Perform the swap.
    swapContract.swap(_order);

  }
}
