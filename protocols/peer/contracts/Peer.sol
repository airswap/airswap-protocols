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
      transferOwnership(_peerContractOwner);
    }
  }

  /**
    * @notice Set a Trading Rule
    * @dev only callable by the owner of the contract
    * @param _takerToken address The token address that the Peer would send in a trade
    * @param _makerToken address The token address that the Consumer would send in a trade
    * @param _maxTakerAmount uint256 The maximum amount of token the Peer would send
    * @param _priceCoef uint256 The whole number that will be multiplied by 10^(-priceExp) - the price coefficient
    * @param _priceExp uint256 The exponent of the price to indicate location of the decimal priceCoef * 10^(-priceExp)
    */
  function setRule(
    address _takerToken,
    address _makerToken,
    uint256 _maxTakerAmount,
    uint256 _priceCoef,
    uint256 _priceExp
  ) external onlyOwner {

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
    * @param _takerToken address The token address that the peer would send in a trade
    * @param _makerToken address The token address that the consumer would send in a trade
    */
  function unsetRule(
    address _takerToken,
    address _makerToken
  ) external onlyOwner {

    // Delete the rule.
    delete rules[_takerToken][_makerToken];

    emit UnsetRule(
      _takerToken,
      _makerToken
    );
  }

  /**
    * @notice Get a Buy Quote from the Peer
    * @param _takerAmount uint256 The amount the Peer would send
    * @param _takerToken address The token that the Peer would send
    * @param _makerToken address The token that the Consumer would send
    * @return uint256 _makerAmount The amount the Consumer would send
    */
  function getBuyQuote(
    uint256 _takerAmount,
    address _takerToken,
    address _makerToken
  ) external returns (
    uint256 _makerAmount
  ) {

    Rule memory rule = rules[_takerToken][_makerToken];

    // Ensure that a rule exists.
    if(rule.maxTakerAmount > 0) {

      // Ensure the _takerAmount does not exceed maximum for the rule.
      if(_takerAmount <= rule.maxTakerAmount) {

        _makerAmount = _takerAmount
            .mul(rule.priceCoef)
            .div(10 ** rule.priceExp);

        // Return the quote.
        return _makerAmount;
      }
    }
    return 0;
  }

  /**
    * @notice Get a Sell Quote from the Peer
    * @param _makerAmount uint256 The amount the Consumer would send
    * @param _makerToken address The token that the Consumer will send
    * @param _takerToken address The token that the Peer will send
    * @return uint256 _takerAmount The amount the Peer would send
    */
  function getSellQuote(
    uint256 _makerAmount,
    address _makerToken,
    address _takerToken
  ) external returns (
    uint256 _takerAmount
  ) {

    Rule memory rule = rules[_takerToken][_makerToken];

    // Ensure that a rule exists.
    if(rule.maxTakerAmount > 0) {

      // Calculate the _takerAmount.
      _takerAmount = _makerAmount
        .mul(10 ** rule.priceExp).div(rule.priceCoef);

      // Ensure the _takerAmount does not exceed maximum and is greater than zero.
      if(_takerAmount <= rule.maxTakerAmount && _takerAmount > 0) {
        return _takerAmount;
      }
    }
    return 0;
  }

  /**
    * @notice Get a Maximum Quote from the Peer
    * @param _takerToken address The token that the Peer will send
    * @param _makerToken address The token that the Consumer will send
    * @return uint 256 The amount the Peer would send
    * @return uint 256 The amount the Consumer would send
    */
  function getMaxQuote(
    address _takerToken,
    address _makerToken
  ) external returns (
    uint256 _takerAmount,
    uint256 _makerAmount
  ) {

    Rule memory rule = rules[_takerToken][_makerToken];

    // Ensure that a rule exists.
    if(rule.maxTakerAmount > 0) {

      // Return the maxTakerAmount and calculated _makerAmount.
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
    * @param _signature Types.Signature
    */
  function provideOrder(
    Types.Order memory _order,
    Types.Signature memory _signature
  ) public {

    Rule memory rule = rules[_order.taker.token][_order.maker.token];

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
      maxTakerAmount: rule.maxTakerAmount - _order.taker.param,
      priceCoef: rule.priceCoef,
      priceExp: rule.priceExp
    });

    // Perform the swap.
    swapContract.swap(_order, _signature);

  }

  /**
    * @notice Provide an Unsigned Order
    * @dev Requires that sender has authorized the peer (Swap)
    * @param _nonce uint256 A single use identifier for the order
    * @param _makerAmount uint256 The amount or identifier of the token the Maker sends
    * @param _makerToken address The address of the token the Maker sends
    * @param _takerAmount uint256 The amount or identifier of the token the Taker sends
    * @param _takerToken address The address of the token the Taker sends
    */
  function provideUnsignedOrder(
    uint256 _nonce,
    uint256 _makerAmount,
    address _makerToken,
    uint256 _takerAmount,
    address _takerToken
  ) public {

    provideOrder(Types.Order(
      _nonce,
      block.timestamp + 1,
      Types.Party(
        msg.sender,
        _makerToken,
        _makerAmount,
        0x277f8169
      ),
      Types.Party(
        owner(),
        _takerToken,
        _takerAmount,
        0x277f8169
      ),
      Types.Party(address(0), address(0), 0, bytes4(0))
    ), Types.Signature(address(0), 0, 0, 0, 0));

  }
}
