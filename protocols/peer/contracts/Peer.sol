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

  // The address holding tokens that will be trading through this peer
  address private _tradeWallet;

  // Mapping of senderToken to signerToken for rule lookup
  mapping (address => mapping (address => Rule)) public rules;

  // ERC-20 (fungible token) interface identifier (ERC-165)
  bytes4 constant internal ERC20_INTERFACE_ID = 0x277f8169;

  /**
    * @notice Contract Constructor
    * @param _swapContract address of the swap contract the peer will deploy with
    * @param _peerContractOwner address that should be the owner of the peer
    * @param _peerTradeWallet the wallet the peer will trade from
    */
  constructor(
    address _swapContract,
    address _peerContractOwner,
    address _peerTradeWallet
  ) public {
    swapContract = ISwap(_swapContract);

    // if no peer owner is provided, the deploying address is the owner
    if (_peerContractOwner != address(0)) {
      transferOwnership(_peerContractOwner);
    }

    // if no trade wallet is provided, the owner's wallet is the trade wallet
    if (_peerTradeWallet != address(0)) {
      _tradeWallet = _peerTradeWallet;
    } else {
      _tradeWallet = owner();
    }
  }

  /**
    * @notice Set a Trading Rule
    * @dev only callable by the owner of the contract
    * @dev 1 senderToken = priceCoef * 10^(-priceExp) * signerToken
    * @param _senderToken address The address of an ERC-20 token the peer would send
    * @param _signerToken address The address of an ERC-20 token the consumer would send
    * @param _maxSenderAmount uint256 The maximum amount of ERC-20 token the peer would send
    * @param _priceCoef uint256 The whole number that will be multiplied by 10^(-priceExp) - the price coefficient
    * @param _priceExp uint256 The exponent of the price to indicate location of the decimal priceCoef * 10^(-priceExp)
    */
  function setRule(
    address _senderToken,
    address _signerToken,
    uint256 _maxSenderAmount,
    uint256 _priceCoef,
    uint256 _priceExp
  ) external onlyOwner {

    rules[_senderToken][_signerToken] = Rule({
      maxSenderAmount: _maxSenderAmount,
      priceCoef: _priceCoef,
      priceExp: _priceExp
    });

    emit SetRule(
      _senderToken,
      _signerToken,
      _maxSenderAmount,
      _priceCoef,
      _priceExp
    );
  }

  /**
    * @notice Unset a Trading Rule
    * @dev only callable by the owner of the contract, removes from a mapping
    * @param _senderToken address The address of an ERC-20 token the peer would send
    * @param _signerToken address The address of an ERC-20 token the consumer would send
    */
  function unsetRule(
    address _senderToken,
    address _signerToken
  ) external onlyOwner {

    // Delete the rule.
    delete rules[_senderToken][_signerToken];

    emit UnsetRule(
      _senderToken,
      _signerToken
    );
  }

  /**
    * @notice Get a Signer-Side Quote from the Peer
    * @param _senderParam uint256 The amount of ERC-20 token the peer would send
    * @param _senderToken address The address of an ERC-20 token the peer would send
    * @param _signerToken address The address of an ERC-20 token the consumer would send
    * @return uint256 signerParam The amount of ERC-20 token the consumer would send
    */
  function getSignerSideQuote(
    uint256 _senderParam,
    address _senderToken,
    address _signerToken
  ) external view returns (
    uint256 signerParam
  ) {

    Rule memory rule = rules[_senderToken][_signerToken];

    // Ensure that a rule exists.
    if(rule.maxSenderAmount > 0) {

      // Ensure the _senderParam does not exceed maximum for the rule.
      if(_senderParam <= rule.maxSenderAmount) {

        signerParam = _senderParam
            .mul(rule.priceCoef)
            .div(10 ** rule.priceExp);

        // Return the quote.
        return signerParam;
      }
    }
    return 0;
  }

  /**
    * @notice Get a Sender-Side Quote from the Peer
    * @param _signerParam uint256 The amount of ERC-20 token the consumer would send
    * @param _signerToken address The address of an ERC-20 token the consumer would send
    * @param _senderToken address The address of an ERC-20 token the peer would send
    * @return uint256 senderParam The amount of ERC-20 token the peer would send
    */
  function getSenderSideQuote(
    uint256 _signerParam,
    address _signerToken,
    address _senderToken
  ) external view returns (
    uint256 senderParam
  ) {

    Rule memory rule = rules[_senderToken][_signerToken];

    // Ensure that a rule exists.
    if(rule.maxSenderAmount > 0) {

      // Calculate the _senderParam.
      senderParam = _signerParam
        .mul(10 ** rule.priceExp).div(rule.priceCoef);

      // Ensure the senderParam does not exceed maximum and is greater than zero.
      if(senderParam <= rule.maxSenderAmount) {
        return senderParam;
      }
    }
    return 0;
  }

  /**
    * @notice Get a Maximum Quote from the Peer
    * @param _senderToken address The address of an ERC-20 token the peer would send
    * @param _signerToken address The address of an ERC-20 token the consumer would send
    * @return uint256 senderParam The amount the peer would send
    * @return uint256 signerParam The amount the consumer would send
    */
  function getMaxQuote(
    address _senderToken,
    address _signerToken
  ) external view returns (
    uint256 senderParam,
    uint256 signerParam
  ) {

    Rule memory rule = rules[_senderToken][_signerToken];

    // Ensure that a rule exists.
    if(rule.maxSenderAmount > 0) {

      // Return the maxSenderAmount and calculated _signerParam.
      return (
        rule.maxSenderAmount,
        rule.maxSenderAmount.mul(rule.priceCoef).div(10 ** rule.priceExp)
      );
    }
    return (0, 0);
  }

  /**
    * @notice Provide an Order
    * @dev Rules get reset with new maxSenderAmount
    * @param _order Types.Order
    */
  function provideOrder(
    Types.Order calldata _order
  ) external {

    Rule memory rule = rules[_order.sender.token][_order.signer.token];

    require(_order.signer.wallet == msg.sender,
      "SIGNER_MUST_BE_SENDER");

    require(_order.sender.wallet == _tradeWallet,
      "INVALID_SENDER_WALLET");

    require(_order.signer.kind == ERC20_INTERFACE_ID,
      "SIGNER_KIND_MUST_BE_ERC20");

    require(_order.sender.kind == ERC20_INTERFACE_ID,
      "SENDER_KIND_MUST_BE_ERC20");

    // Ensure that a rule exists.
    require(rule.maxSenderAmount != 0,
      "TOKEN_PAIR_INACTIVE");

    // Ensure the order does not exceed the maximum amount.
    require(_order.sender.param <= rule.maxSenderAmount,
      "AMOUNT_EXCEEDS_MAX");

    // Ensure the order is priced according to the rule.
    require(_order.sender.param == _order.signer.param
      .mul(10 ** rule.priceExp).div(rule.priceCoef),
      "PRICE_INCORRECT");

    // Overwrite the rule with a decremented maxSenderAmount.
    rules[_order.sender.token][_order.signer.token] = Rule({
      maxSenderAmount: (rule.maxSenderAmount).sub(_order.sender.param),
      priceCoef: rule.priceCoef,
      priceExp: rule.priceExp
    });

    // Perform the swap.
    swapContract.swap(_order);
  }

  /**
    * @notice Set a new trade wallet
    * @param _newTradeWallet address The address of the new trade wallet
    */
  function setTradeWallet(address _newTradeWallet) external onlyOwner {
    require(_newTradeWallet != address(0), 'TRADE_WALLET_REQUIRED');
    _tradeWallet = _newTradeWallet;
  }

  /**
    * @notice Get the trade wallet address
    */
  function tradeWallet() external view returns (address) {
    return _tradeWallet;
  }

}
