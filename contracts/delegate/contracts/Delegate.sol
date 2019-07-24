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

import "@airswap/delegate/interfaces/IDelegate.sol";
import "@airswap/swap/interfaces/ISwap.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

/**
  * @title Delegate: Deployable Trading Rules for the Swap Protocol
  * @notice Supports fungible tokens (ERC-20)
  */
contract Delegate is IDelegate, Ownable {
  using SafeMath for uint256;

  // Swap contract to be used to settle trades
  ISwap public swapContract;

  // Mapping of delegateToken to consumerToken for rule lookup
  mapping (address => mapping (address => Rule)) public rules;

  /**
    * @notice Contract Constructor
    * @param initialSwapContract address of the swap contract the delegate will deploy with
    */
  constructor(
    address initialSwapContract
  ) public {
    swapContract = ISwap(initialSwapContract);
  }

  /**
    * @notice Set the Swap Contract
    * @dev only callable by the owner of the contract
    * @param newSwapContract address that will replace the old swap contract address
    */
  function setSwapContract(
    address newSwapContract
  ) external onlyOwner {
    swapContract = ISwap(newSwapContract);
  }

  /**
    * @notice Set a Trading Rule
    *
    * @param delegateToken address
    * @param consumerToken address
    * @param maxDelegateAmount uint256 the maximum amount this rule will allow for trade
    * @param priceCoef uint256 the coefficient that will be multiplied by 10^-priceExp
    * @param priceExp uint256 the exponent represented as a negative number to help denote the decimal value of the priceCoef
    */
  function setRule(
    address delegateToken,
    address consumerToken,
    uint256 maxDelegateAmount,
    uint256 priceCoef,
    uint256 priceExp
  ) external onlyOwner {

    rules[delegateToken][consumerToken] = Rule({
      maxDelegateAmount: maxDelegateAmount,
      priceCoef: priceCoef,
      priceExp: priceExp
    });

    emit SetRule(
      delegateToken,
      consumerToken,
      maxDelegateAmount,
      priceCoef,
      priceExp
    );
  }

  /**
    * @notice Unset a Trading Rule
    *
    * @param delegateToken address
    * @param consumerToken address
    */
  function unsetRule(
    address delegateToken,
    address consumerToken
  ) external onlyOwner {

    // Delete the rule.
    delete rules[delegateToken][consumerToken];

    emit UnsetRule(
      delegateToken,
      consumerToken
    );
  }

  /**
    * @notice Get a Buy Quote
    *
    * @param delegateAmount uint256
    * @param delegateToken address
    * @param consumerToken address
    */
  function getBuyQuote(
    uint256 delegateAmount,
    address delegateToken,
    address consumerToken
  ) external view returns (
    uint256 consumerAmount
  ) {

    Rule memory rule = rules[delegateToken][consumerToken];

    // Ensure that a rule exists.
    if(rule.maxDelegateAmount > 0) {

      // Ensure the delegateAmount does not exceed maximum for the rule.
      if(delegateAmount <= rule.maxDelegateAmount) {

        consumerAmount = delegateAmount
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
    * @notice Get a Sell Quote
    *
    * @param consumerAmount uint256
    * @param consumerToken address
    * @param delegateToken address
    */
  function getSellQuote(
    uint256 consumerAmount,
    address consumerToken,
    address delegateToken
  ) external view returns (
    uint256 delegateAmount
  ) {

    Rule memory rule = rules[delegateToken][consumerToken];

    // Ensure that a rule exists.
    if(rule.maxDelegateAmount > 0) {

      // Calculate the delegateAmount.
      delegateAmount = consumerAmount
        .mul(10 ** rule.priceExp).div(rule.priceCoef);

      // Ensure the delegateAmount does not exceed maximum and is greater than zero.
      if(delegateAmount <= rule.maxDelegateAmount && delegateAmount > 0) {
        return delegateAmount;
      }
    }
    return 0;
  }

  /**
    * @notice Get a Maximum Quote
    *
    * @param delegateToken address
    * @param consumerToken address
    * @return (uint256, uint256)
    */
  function getMaxQuote(
    address delegateToken,
    address consumerToken
  ) external view returns (
    uint256 delegateAmount,
    uint256 consumerAmount
  ) {

    Rule memory rule = rules[delegateToken][consumerToken];

    // Ensure that a rule exists.
    if(rule.maxDelegateAmount > 0) {

      // Return the maxDelegateAmount and calculated consumerAmount.
      return (
        rule.maxDelegateAmount,
        rule.maxDelegateAmount.mul(rule.priceCoef).div(10 ** rule.priceExp)
      );
    }
    return (0, 0);
  }

  /**
    * @notice Provide an Order (Simple)
    * @dev Rules get reset with new maxDelegateAmount
    *
    * @param nonce uint256
    * @param expiry uint256
    * @param consumerWallet address
    * @param consumerAmount uint256
    * @param consumerToken address
    * @param delegateWallet address
    * @param delegateAmount uint256
    * @param delegateToken address
    * @param v uint8
    * @param r bytes32
    * @param s bytes32
    */
  function provideOrder(
    uint256 nonce,
    uint256 expiry,
    address consumerWallet,
    uint256 consumerAmount,
    address consumerToken,
    address delegateWallet,
    uint256 delegateAmount,
    address delegateToken,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) public payable {

    // TODO: Forward the message value (for ETH trades) and add tests.

    Rule memory rule = rules[delegateToken][consumerToken];

    // Ensure that a rule exists.
    require(rule.maxDelegateAmount != 0,
      "TOKEN_PAIR_INACTIVE");

    // Ensure the order does not exceed the maximum amount.
    require(delegateAmount <= rule.maxDelegateAmount,
      "AMOUNT_EXCEEDS_MAX");

    // Ensure the order is priced according to the rule.
    require(delegateAmount == consumerAmount
      .mul(10 ** rule.priceExp).div(rule.priceCoef),
      "PRICE_INCORRECT");

    // Overwrite the rule with a decremented maxDelegateAmount.
    rules[delegateToken][consumerToken] = Rule({
      maxDelegateAmount: rule.maxDelegateAmount - delegateAmount,
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
      delegateWallet,
      delegateAmount,
      delegateToken,
      v, r, s
    );

  }

  /**
    * @notice Provide an Unsigned Order (Simple)
    * @dev Requires that sender has authorized the delegate (Swap)
    *
    * @param nonce uint256
    * @param consumerAmount uint256
    * @param consumerToken address
    * @param delegateAmount uint256
    * @param delegateToken address
    */
  function provideUnsignedOrder(
    uint256 nonce,
    uint256 consumerAmount,
    address consumerToken,
    uint256 delegateAmount,
    address delegateToken
  ) public payable {

    // TODO: Forward the message value (for ETH trades) and add tests.

    provideOrder(
      nonce,
      block.timestamp,
      msg.sender,
      consumerAmount,
      consumerToken,
      owner(),
      delegateAmount,
      delegateToken,
      0, 0, 0
    );

  }
}
