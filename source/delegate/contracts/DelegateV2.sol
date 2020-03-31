/*
  Copyright 2020 Swap Holdings Ltd.

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

pragma solidity 0.5.12;
pragma experimental ABIEncoderV2;


import "@airswap/delegate/contracts/interfaces/IDelegateV2.sol";
import "@airswap/indexer/contracts/interfaces/IIndexer.sol";
import "@airswap/swap/contracts/interfaces/ISwap.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";


/**
  * @title Delegate: Deployable Trading Rules for the AirSwap Network
  * @notice Supports fungible tokens (ERC-20)
  * @dev inherits IDelegate, Ownable uses SafeMath library
  */
contract Delegate is IDelegateV2, Ownable {
  using SafeMath for uint256;

  // The Swap contract to be used to settle trades
  ISwap public swapContract;

  // The Indexer to stake intent to trade on
  IIndexer public indexer;

  // Holds the number of rules created over time. This is used to determined the next ruleID.
  uint256 public ruleIDCounter;

  // Maximum integer for token transfer approval
  uint256 constant internal MAX_INT =  2**256 - 1;

  // If no rule exists, the value of 0 will be stored in pointers
  uint256 constant internal NO_RULE = 0;

  // Address holding tokens that will be trading through this delegate
  address public tradeWallet;

  // Mapping of ruleID to rule
  mapping (uint256 => Rule) public rules;

  // Mapping of senderToken to signerToken to the first ruleID for this pair
  mapping(address => mapping(address => uint256)) public firstRuleID;

  // ERC-20 (fungible token) interface identifier (ERC-165)
  bytes4 constant internal ERC20_INTERFACE_ID = 0x36372b07;

  // The protocol identifier for setting intents on an Index
  bytes2 public protocol;

  /**
    * @notice Contract Constructor
    * @dev owner defaults to msg.sender if delegateContractOwner is provided as address(0)
    * @param delegateSwap address Swap contract the delegate will deploy with
    * @param delegateIndexer address Indexer contract the delegate will deploy with
    * @param delegateContractOwner address Owner of the delegate
    * @param delegateTradeWallet address Wallet the delegate will trade from
    * @param delegateProtocol bytes2 The protocol identifier for Delegate contracts
    */
  constructor(
    ISwap delegateSwap,
    IIndexer delegateIndexer,
    address delegateContractOwner,
    address delegateTradeWallet,
    bytes2 delegateProtocol
  ) public {
    swapContract = delegateSwap;
    indexer = delegateIndexer;
    protocol = delegateProtocol;

    // If no delegate owner is provided, the deploying address is the owner.
    if (delegateContractOwner != address(0)) {
      transferOwnership(delegateContractOwner);
    }

    // If no trade wallet is provided, the owner's wallet is the trade wallet.
    if (delegateTradeWallet != address(0)) {
      tradeWallet = delegateTradeWallet;
    } else {
      tradeWallet = owner();
    }

    // Ensure that the indexer can pull funds from delegate account.
    require(
      IERC20(indexer.stakingToken())
      .approve(address(indexer), MAX_INT), "STAKING_APPROVAL_FAILED"
    );
  }

  function createRule(
    address senderToken,
    address signerToken,
    uint256 senderAmount,
    uint256 signerAmount
  ) external {
    // Rules created now holds this rule's ID
    ruleIDCounter += 1;

    // prev and next rule IDs are initialised to 0
    rules[ruleIDCounter] = Rule({
      signerToken: signerToken,
      senderToken: senderToken,
      senderAmount: senderAmount,
      signerAmount: signerAmount,
      nextRuleID: NO_RULE,
      prevRuleID: NO_RULE
    });

    if (firstRuleID[senderToken][signerToken] == NO_RULE) {
      firstRuleID[senderToken][signerToken] = ruleIDCounter;
    } else {
      _insertRuleInList(senderToken, signerToken, ruleIDCounter);
    }

    emit CreateRule(owner(), senderToken, signerToken, ruleIDCounter, senderAmount, signerAmount);
  }

  function deleteRule(
    uint256 ruleID
  ) external {
    _deleteRule(ruleID);

    emit DeleteRule(owner(), ruleID);
  }

  function provideOrder(
    Types.Order calldata order
  ) external;

  function getSignerSideQuote(
    uint256 senderAmount,
    address senderToken,
    address signerToken
  ) external view returns (
    uint256 signerAmount
  ) {

  }

  function getSenderSideQuote(
    uint256 signerAmount,
    address signerToken,
    address senderToken
  ) external view returns (
    uint256 senderAmount
  ) {

  }

  function getMaxQuote(
    address senderToken,
    address signerToken
  ) external view returns (
    uint256 senderAmount,
    uint256 signerAmount
  ) {
    uint256 ruleID = firstRuleID[senderToken][signerToken];

    // exit when the end of the list of rules is found
    while (ruleID != NO_RULE) {
      senderAmount = senderAmount.add(rules[ruleID].senderAmount);
      signerAmount = signerAmount.add(rules[ruleID].signerAmount);
      ruleID = rules[ruleID].nextRuleID;
    }
  }

  function _deleteRule(
    uint256 ruleID
  ) internal {
    Rule memory rule = rules[ruleID];

    // if its first in the list, update first
    if (firstRuleID[rule.senderToken][rule.signerToken] == ruleID) {
      // whether or not this was the only rule in the list, we update firstRuleID
      firstRuleID[rule.senderToken][rule.signerToken] = rule.nextRuleID;
    } else {
      // otherwise, make the rule before it point to the one after it
      rules[rule.prevRuleID].nextRuleID = rule.nextRuleID;
    }

    // if its not last in the list, make the next rule point to the one before it
    if (rule.nextRuleID != NO_RULE) {
      rules[rule.nextRuleID].prevRuleID = rule.prevRuleID;
    }

    delete rules[ruleID];
  }

  // entering this funciton we know that the given list has at least 1 element in it
  function _insertRuleInList(
    address senderToken,
    address signerToken,
    uint256 newRuleID
  ) internal {
    // iterate down list until its location
    uint256 next = firstRuleID[senderToken][signerToken];
    uint256 previous;

    // while we aren't at the end of the list, and the new rule goes after next
    while (next != NO_RULE && _isAfterListElement(next, newRuleID)) {
      previous = next;
      next = rules[next].nextRuleID;
    }

    // next is the element after our new element in the list
    // previous is the element before our new element in the list

    // if next is NO_RULE, our new element is at the end of the list
    if (next == NO_RULE) {
      rules[newRuleID].prevRuleID = previous;
      rules[previous].nextRuleID = newRuleID;
    } else {
      // the new rule is not at the end of the list - there's something after it
      rules[newRuleID].nextRuleID = next;
      rules[next].prevRuleID = newRuleID;

      // if the new rule is at the beginning of the list
      if (previous == NO_RULE) {
        firstRuleID[senderToken][signerToken] = newRuleID;
      } else {
        rules[newRuleID].prevRuleID = previous;
        rules[previous].nextRuleID = newRuleID;
      }
    }
  }

  function _isAfterListElement(
    uint256 firstElement,
    uint256 secondElement
  ) internal returns (bool) {
    uint256 x = rules[firstElement].senderAmount.mul(rules[secondElement].signerAmount);
    uint256 y = rules[secondElement].senderAmount.mul(rules[firstElement].signerAmount);
    return (x > y);
  }

}