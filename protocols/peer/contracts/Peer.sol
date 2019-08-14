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

import "@airswap/peer/interfaces/IPeer.sol";
import "@airswap/swap/interfaces/ISwap.sol";
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

  // Mapping of peerToken to consumerToken for rule lookup
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
    * @param peerToken address The token address that the peer would send in a trade
    * @param consumerToken address The token address that the consumer would send in a trade
    * @param maxPeerAmount uint256 The maximum amount of token the peer would send
    * @param priceCoef uint256 The whole number that will be multiplied by 10^(-priceExp) - the price coefficient
    * @param priceExp uint256 The exponent of the price to indicate location of the decimal priceCoef * 10^(-priceExp)
    */
  function setRule(
    address peerToken,
    address consumerToken,
    uint256 maxPeerAmount,
    uint256 priceCoef,
    uint256 priceExp
  ) external onlyOwner {

    rules[peerToken][consumerToken] = Rule({
      maxPeerAmount: maxPeerAmount,
      priceCoef: priceCoef,
      priceExp: priceExp
    });

    emit SetRule(
      peerToken,
      consumerToken,
      maxPeerAmount,
      priceCoef,
      priceExp
    );
  }

  /**
    * @notice Unset a Trading Rule
    * @dev only callable by the owner of the contract, removes from a mapping
    * @param peerToken address The token address that the peer would send in a trade
    * @param consumerToken address The token address that the consumer would send in a trade
    */
  function unsetRule(
    address peerToken,
    address consumerToken
  ) external onlyOwner {

    // Delete the rule.
    delete rules[peerToken][consumerToken];

    emit UnsetRule(
      peerToken,
      consumerToken
    );
  }

  /**
    * @notice Get a Buy Quote from the Peer
    * @param peerAmount uint256 The amount the Peer would send
    * @param peerToken address The token that the Peer would send
    * @param consumerToken address The token that the Consumer would send
    * @return uint256 consumerAmount The amount the Consumer would send
    */
  function getBuyQuote(
    uint256 peerAmount,
    address peerToken,
    address consumerToken
  ) external returns (
    uint256 consumerAmount
  ) {

    Rule memory rule = rules[peerToken][consumerToken];

    // Ensure that a rule exists.
    if(rule.maxPeerAmount > 0) {

      // Ensure the peerAmount does not exceed maximum for the rule.
      if(peerAmount <= rule.maxPeerAmount) {

        consumerAmount = peerAmount
            .mul(rule.priceCoef)
            .div(10 ** rule.priceExp);

        // Ensure that the quoted amount is greater than zero.
        if (consumerAmount > 0) {
          return consumerAmount;
        }
      }
    }
    return 0;
  }

  /**
    * @notice Get a Sell Quote from the Peer
    * @param consumerAmount uint256 The amount the Consumer would send
    * @param consumerToken address The token that the Consumer will send
    * @param peerToken address The token that the Peer will send
    * @return uint256 peerAmount The amount the Peer would send
    */
  function getSellQuote(
    uint256 consumerAmount,
    address consumerToken,
    address peerToken
  ) external returns (
    uint256 peerAmount
  ) {

    Rule memory rule = rules[peerToken][consumerToken];

    // Ensure that a rule exists.
    if(rule.maxPeerAmount > 0) {

      // Calculate the peerAmount.
      peerAmount = consumerAmount
        .mul(10 ** rule.priceExp).div(rule.priceCoef);

      // Ensure the peerAmount does not exceed maximum and is greater than zero.
      if(peerAmount <= rule.maxPeerAmount && peerAmount > 0) {
        return peerAmount;
      }
    }
    return 0;
  }

  /**
    * @notice Get a Maximum Quote from the Peer
    * @param peerToken address The token that the Peer will send
    * @param consumerToken address The token that the Consumer will send
    * @return uint 256 The amount the Peer would send
    * @return uint 256 The amount the Consumer would send
    */
  function getMaxQuote(
    address peerToken,
    address consumerToken
  ) external returns (
    uint256 peerAmount,
    uint256 consumerAmount
  ) {

    Rule memory rule = rules[peerToken][consumerToken];

    // Ensure that a rule exists.
    if(rule.maxPeerAmount > 0) {

      // Return the maxPeerAmount and calculated consumerAmount.
      return (
        rule.maxPeerAmount,
        rule.maxPeerAmount.mul(rule.priceCoef).div(10 ** rule.priceExp)
      );
    }
    return (0, 0);
  }

  /**
    * @notice Provide an Order (Simple)
    * @dev Rules get reset with new maxPeerAmount
    * @param nonce uint256  A single use identifier for the Order.
    * @param expiry uint256 The expiry in seconds since unix epoch.
    * @param consumerWallet address The Maker of the Order who sets price.
    * @param consumerAmount uint256 The amount or identifier of the token the Maker sends.
    * @param consumerToken address The address of the token the Maker sends.
    * @param peerWallet address The Taker of the Order who takes price.
    * @param peerAmount uint256  The amount or identifier of the token the Taker sends.
    * @param peerToken address The address of the token the Taker sends.
    * @param v uint8 The `v` value of an ECDSA signature.
    * @param r bytes32 The `r` value of an ECDSA signature.
    * @param s bytes32 The `s` value of an ECDSA signature.
    */
  function provideOrder(
    uint256 nonce,
    uint256 expiry,
    address consumerWallet,
    uint256 consumerAmount,
    address consumerToken,
    address peerWallet,
    uint256 peerAmount,
    address peerToken,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) public payable {

    // TODO: Forward the message value (for ETH trades) and add tests.

    Rule memory rule = rules[peerToken][consumerToken];

    // Ensure that a rule exists.
    require(rule.maxPeerAmount != 0,
      "TOKEN_PAIR_INACTIVE");

    // Ensure the order does not exceed the maximum amount.
    require(peerAmount <= rule.maxPeerAmount,
      "AMOUNT_EXCEEDS_MAX");

    // Ensure the order is priced according to the rule.
    require(peerAmount == consumerAmount
      .mul(10 ** rule.priceExp).div(rule.priceCoef),
      "PRICE_INCORRECT");

    // Overwrite the rule with a decremented maxPeerAmount.
    rules[peerToken][consumerToken] = Rule({
      maxPeerAmount: rule.maxPeerAmount - peerAmount,
      priceCoef: rule.priceCoef,
      priceExp: rule.priceExp
    });

    // Perform the swap.
    swapContract.swapSimple(
      nonce,
      expiry,
      consumerWallet,
      consumerAmount,
      consumerToken,
      peerWallet,
      peerAmount,
      peerToken,
      v, r, s
    );

  }

  /**
    * @notice Provide an Unsigned Order (Simple)
    * @dev Requires that sender has authorized the peer (Swap)
    * @param nonce uint256 A single use identifier for the order
    * @param consumerAmount uint256 The amount or identifier of the token the Maker sends
    * @param consumerToken address The address of the token the Maker sends
    * @param peerAmount uint256 The amount or identifier of the token the Taker sends
    * @param peerToken address The address of the token the Taker sends
    */
  function provideUnsignedOrder(
    uint256 nonce,
    uint256 consumerAmount,
    address consumerToken,
    uint256 peerAmount,
    address peerToken
  ) public payable {

    // TODO: Forward the message value (for ETH trades) and add tests.

    provideOrder(
      nonce,
      block.timestamp + 1,
      msg.sender,
      consumerAmount,
      consumerToken,
      owner(),
      peerAmount,
      peerToken,
      0, 0, 0
    );

  }
}
