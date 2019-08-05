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
  * @dev inherits IDelegate, Ownable uses SafeMath library
  */
contract Delegate is IDelegate, Ownable {event __CoverageDelegate(string fileName, uint256 lineNumber);
event __FunctionCoverageDelegate(string fileName, uint256 fnId);
event __StatementCoverageDelegate(string fileName, uint256 statementId);
event __BranchCoverageDelegate(string fileName, uint256 branchId, uint256 locationIdx);
event __AssertPreCoverageDelegate(string fileName, uint256 branchId);
event __AssertPostCoverageDelegate(string fileName, uint256 branchId);

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
  ) public {emit __FunctionCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',1);

emit __CoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',46);
    emit __StatementCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',1);
swapContract = ISwap(initialSwapContract);
  }

  /**
    * @notice Set the Swap Contract address
    * @dev only callable by the owner of the contract
    * @param newSwapContract address that will replace the old swap contract address
    */
  function setSwapContract(
    address newSwapContract
  ) external onlyOwner {emit __FunctionCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',2);

emit __CoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',57);
    emit __StatementCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',2);
swapContract = ISwap(newSwapContract);
  }

  /**
    * @notice Set a Trading Rule
    * @dev only callable by the owner of the contract
    * @param delegateToken address The token address that the delegate would send in a trade
    * @param consumerToken address The token address that the consumer would send in a trade
    * @param maxDelegateAmount uint256 The maximum amount of token the delegate would send
    * @param priceCoef uint256 The whole number that will be multiplied by 10^(-priceExp) - the price coefficient
    * @param priceExp uint256 The exponent of the price to indicate location of the decimal priceCoef * 10^(-priceExp)
    */
  function setRule(
    address delegateToken,
    address consumerToken,
    uint256 maxDelegateAmount,
    uint256 priceCoef,
    uint256 priceExp
  ) external onlyOwner {emit __FunctionCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',3);


emit __CoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',77);
    emit __StatementCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',3);
rules[delegateToken][consumerToken] = Rule({
      maxDelegateAmount: maxDelegateAmount,
      priceCoef: priceCoef,
      priceExp: priceExp
    });

emit __CoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',83);
    emit __StatementCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',4);
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
    * @dev only callable by the owner of the contract, removes from a mapping
    * @param delegateToken address The token address that the delegate would send in a trade
    * @param consumerToken address The token address that the consumer would send in a trade
    */
  function unsetRule(
    address delegateToken,
    address consumerToken
  ) external onlyOwner {emit __FunctionCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',4);


    // Delete the rule.
emit __CoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',104);
    delete rules[delegateToken][consumerToken];

emit __CoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',106);
    emit __StatementCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',5);
emit UnsetRule(
      delegateToken,
      consumerToken
    );
  }

  /**
    * @notice Get a Buy Quote from the Delegate
    * @param delegateAmount uint256 The amount the Delegate would send
    * @param delegateToken address The token that the Delegate would send
    * @param consumerToken address The token that the Consumer would send
    * @return uint256 consumerAmount The amount the Consumer would send
    */
  function getBuyQuote(
    uint256 delegateAmount,
    address delegateToken,
    address consumerToken
  ) external returns (
    uint256 consumerAmount
  ) {emit __FunctionCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',5);


emit __CoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',127);
    emit __StatementCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',6);
Rule memory rule = rules[delegateToken][consumerToken];

    // Ensure that a rule exists.
emit __CoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',130);
    emit __StatementCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',7);
if(rule.maxDelegateAmount > 0) {emit __BranchCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',1,0);

      // Ensure the delegateAmount does not exceed maximum for the rule.
emit __CoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',133);
      emit __StatementCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',8);
if(delegateAmount <= rule.maxDelegateAmount) {emit __BranchCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',2,0);

emit __CoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',135);
        emit __StatementCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',9);
consumerAmount = delegateAmount
            .mul(rule.priceCoef)
            .div(10 ** rule.priceExp);

        // Ensure that the quoted amount is greater than zero.
emit __CoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',140);
        emit __StatementCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',10);
if (consumerAmount > 0) {emit __BranchCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',3,0);
emit __CoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',141);
          emit __StatementCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',11);
return consumerAmount;
        }else { emit __BranchCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',3,1);}

      }else { emit __BranchCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',2,1);}

    }else { emit __BranchCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',1,1);}

emit __CoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',145);
    emit __StatementCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',12);
return 0;
  }

  /**
    * @notice Get a Sell Quote from the Delegate
    * @param consumerAmount uint256 The amount the Consumer would send
    * @param consumerToken address The token that the Consumer will send
    * @param delegateToken address The token that the Delegate will send
    * @return uint256 delegateAmount The amount the Delegate would send
    */
  function getSellQuote(
    uint256 consumerAmount,
    address consumerToken,
    address delegateToken
  ) external returns (
    uint256 delegateAmount
  ) {emit __FunctionCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',6);


emit __CoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',163);
    emit __StatementCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',13);
Rule memory rule = rules[delegateToken][consumerToken];

    // Ensure that a rule exists.
emit __CoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',166);
    emit __StatementCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',14);
if(rule.maxDelegateAmount > 0) {emit __BranchCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',4,0);

      // Calculate the delegateAmount.
emit __CoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',169);
      emit __StatementCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',15);
delegateAmount = consumerAmount
        .mul(10 ** rule.priceExp).div(rule.priceCoef);

      // Ensure the delegateAmount does not exceed maximum and is greater than zero.
emit __CoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',173);
      emit __StatementCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',16);
if(delegateAmount <= rule.maxDelegateAmount && delegateAmount > 0) {emit __BranchCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',5,0);
emit __CoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',174);
        emit __StatementCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',17);
return delegateAmount;
      }else { emit __BranchCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',5,1);}

    }else { emit __BranchCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',4,1);}

emit __CoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',177);
    emit __StatementCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',18);
return 0;
  }

  /**
    * @notice Get a Maximum Quote from the Delegate
    * @param delegateToken address The token that the Delegate will send
    * @param consumerToken address The token that the Consumer will send
    * @return uint 256 The amount the Delegate would send
    * @return uint 256 The amount the Consumer would send
    */
  function getMaxQuote(
    address delegateToken,
    address consumerToken
  ) external returns (
    uint256 delegateAmount,
    uint256 consumerAmount
  ) {emit __FunctionCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',7);


emit __CoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',195);
    emit __StatementCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',19);
Rule memory rule = rules[delegateToken][consumerToken];

    // Ensure that a rule exists.
emit __CoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',198);
    emit __StatementCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',20);
if(rule.maxDelegateAmount > 0) {emit __BranchCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',6,0);

      // Return the maxDelegateAmount and calculated consumerAmount.
emit __CoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',201);
      emit __StatementCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',21);
return (
        rule.maxDelegateAmount,
        rule.maxDelegateAmount.mul(rule.priceCoef).div(10 ** rule.priceExp)
      );
    }else { emit __BranchCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',6,1);}

emit __CoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',206);
    emit __StatementCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',22);
return (0, 0);
  }

  /**
    * @notice Provide an Order (Simple)
    * @dev Rules get reset with new maxDelegateAmount
    * @param nonce uint256  A single use identifier for the Order.
    * @param expiry uint256 The expiry in seconds since unix epoch.
    * @param consumerWallet address The Maker of the Order who sets price.
    * @param consumerAmount uint256 The amount or identifier of the token the Maker sends.
    * @param consumerToken address The address of the token the Maker sends.
    * @param delegateWallet address The Taker of the Order who takes price.
    * @param delegateAmount uint256  The amount or identifier of the token the Taker sends.
    * @param delegateToken address The address of the token the Taker sends.
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
    address delegateWallet,
    uint256 delegateAmount,
    address delegateToken,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) public payable {emit __FunctionCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',8);


    // TODO: Forward the message value (for ETH trades) and add tests.

emit __CoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',240);
    emit __StatementCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',23);
Rule memory rule = rules[delegateToken][consumerToken];

    // Ensure that a rule exists.
emit __CoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',243);
    emit __AssertPreCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',7);
emit __StatementCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',24);
require(rule.maxDelegateAmount != 0,
      "TOKEN_PAIR_INACTIVE");emit __AssertPostCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',7);


    // Ensure the order does not exceed the maximum amount.
emit __CoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',247);
    emit __AssertPreCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',8);
emit __StatementCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',25);
require(delegateAmount <= rule.maxDelegateAmount,
      "AMOUNT_EXCEEDS_MAX");emit __AssertPostCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',8);


    // Ensure the order is priced according to the rule.
emit __CoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',251);
    emit __AssertPreCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',9);
emit __StatementCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',26);
require(delegateAmount == consumerAmount
      .mul(10 ** rule.priceExp).div(rule.priceCoef),
      "PRICE_INCORRECT");emit __AssertPostCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',9);


    // Overwrite the rule with a decremented maxDelegateAmount.
emit __CoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',256);
    emit __StatementCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',27);
rules[delegateToken][consumerToken] = Rule({
      maxDelegateAmount: rule.maxDelegateAmount - delegateAmount,
      priceCoef: rule.priceCoef,
      priceExp: rule.priceExp
    });

    // Perform the swap.
emit __CoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',263);
    emit __StatementCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',28);
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
    * @param nonce uint256 A single use identifier for the order
    * @param consumerAmount uint256 The amount or identifier of the token the Maker sends
    * @param consumerToken address The address of the token the Maker sends
    * @param delegateAmount uint256 The amount or identifier of the token the Taker sends
    * @param delegateToken address The address of the token the Taker sends
    */
  function provideUnsignedOrder(
    uint256 nonce,
    uint256 consumerAmount,
    address consumerToken,
    uint256 delegateAmount,
    address delegateToken
  ) public payable {emit __FunctionCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',9);


    // TODO: Forward the message value (for ETH trades) and add tests.

emit __CoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',296);
    emit __StatementCoverageDelegate('/Users/alicehenshaw/Documents/development/airswap-protocols/protocols/delegate/contracts/Delegate.sol',29);
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
