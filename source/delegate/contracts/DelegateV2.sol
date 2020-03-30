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
contract Delegate is IDelegate, Ownable {
  using SafeMath for uint256;

  // The Swap contract to be used to settle trades
  ISwap public swapContract;

  // The Indexer to stake intent to trade on
  IIndexer public indexer;

  // Maximum integer for token transfer approval
  uint256 constant internal MAX_INT =  2**256 - 1;

  // Address holding tokens that will be trading through this delegate
  address public tradeWallet;

  // Mapping of ruleID to rule
  mapping (uint256 => Rule)) public rules;

  // Mapping of senderToken to signerToken to the first ruleID for this pair
  mapping(address => mapping(address => uint256)) public getFirstRuleID;

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

  function setRule(
    address senderToken,
    address signerToken,
    uint256 senderAmount,
    uint256 signerAmount
  ) external;

  function unsetRule(
    uint256 ruleID
  ) external;

  function provideOrder(
    Types.Order calldata order
  ) external;

  function getSignerSideQuote(
    uint256 senderAmount,
    address senderToken,
    address signerToken
  ) external view returns (
    uint256 signerAmount
  );

  function getSenderSideQuote(
    uint256 signerAmount,
    address signerToken,
    address senderToken
  ) external view returns (
    uint256 senderAmount
  );

  function getMaxQuote(
    address senderToken,
    address signerToken
  ) external view returns (
    uint256 senderAmount,
    uint256 signerAmount
  );

}