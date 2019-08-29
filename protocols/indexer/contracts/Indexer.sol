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

import "@airswap/indexer/contracts/interfaces/IIndexer.sol";
import "@airswap/indexer/contracts/interfaces/ILocatorWhitelist.sol";
import "@airswap/index/contracts/Index.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

/**
  * @title Indexer: A Collection of Index contracts by Token Pair
  */
contract Indexer is IIndexer, Ownable {

  // Token to be used for staking (ERC-20)
  IERC20 public stakeToken;

  // Mapping of maker token to taker token to index
  mapping (address => mapping (address => Index)) public indexes;

  // Mapping of token address to boolean
  mapping (address => bool) public blacklist;

  // The whitelist contract for checking whether a peer is whitelisted
  address public locatorWhitelist;

  /**
    * @notice Contract Constructor
    *
    * @param _stakeToken address
    * @param _locatorWhitelist address
    */
  constructor(
    address _stakeToken,
    address _locatorWhitelist
  ) public {
    stakeToken = IERC20(_stakeToken);
    locatorWhitelist = _locatorWhitelist;
  }

  /**
    * @notice Create a Index (Collection of Entries to Trade)
    * @dev Deploys a new Index contract and tracks the address
    *
    * @param _makerToken address
    * @param _takerToken address
    */
  function createIndex(
    address _makerToken,
    address _takerToken
  ) external returns (address) {

    // If the Index does not exist, create it.
    if (indexes[_makerToken][_takerToken] == Index(0)) {
      // Create a new Index contract for the token pair.
      indexes[_makerToken][_takerToken] = new Index();
      emit CreateIndex(_makerToken, _takerToken);
    }

    // Return the address of the Index contract.
    return address(indexes[_makerToken][_takerToken]);
  }

  /**
    * @notice Add a Token to the Blacklist
    * @param _tokens address[]
    */
  function addToBlacklist(
    address[] calldata _tokens
  ) external onlyOwner {
    for (uint256 i = 0; i < _tokens.length; i++) {
      if (!blacklist[_tokens[i]]) {
        blacklist[_tokens[i]] = true;
        emit AddToBlacklist(_tokens[i]);
      }
    }
  }

  /**
    * @notice Remove a Token from the Blacklist
    * @param _tokens address[]
    */
  function removeFromBlacklist(
    address[] calldata _tokens
  ) external onlyOwner {
    for (uint256 i = 0; i < _tokens.length; i++) {
      if (blacklist[_tokens[i]]) {
        blacklist[_tokens[i]] = false;
        emit RemoveFromBlacklist(_tokens[i]);
      }
    }
  }

  /**
    * @notice Set an Entry to Trade
    * @dev Requires approval to transfer staking token for sender
    *
    * @param _makerToken address
    * @param _takerToken address
    * @param _amount uint256
    * @param _locator bytes32
    */
  function setEntry(
    address _makerToken,
    address _takerToken,
    uint256 _amount,
    bytes32 _locator
  ) external {

    // Ensure the locator is whitelisted, if relevant
    if (locatorWhitelist != address(0)) {
      require(ILocatorWhitelist(locatorWhitelist).has(_locator),
      "LOCATOR_NOT_WHITELISTED");
    }

    // Ensure both of the tokens are not blacklisted.
    require(!blacklist[_makerToken] && !blacklist[_takerToken],
      "INDEX_IS_BLACKLISTED");

    // Ensure the market exists.
    require(indexes[_makerToken][_takerToken] != Index(0),
      "INDEX_DOES_NOT_EXIST");

    // Only transfer for staking if amount is set.
    if (_amount > 0) {

      // Transfer the _amount for staking.
      require(stakeToken.transferFrom(msg.sender, address(this), _amount),
        "UNABLE_TO_STAKE");
    }

    emit Stake(msg.sender, _makerToken, _takerToken, _amount);

    // Set the entry on the market.
    indexes[_makerToken][_takerToken].setEntry(msg.sender, _amount, _locator);
  }

  /**
    * @notice Unset an Entry to Trade
    * @dev Users are allowed unstake from blacklisted indexes
    *
    * @param _makerToken address
    * @param _takerToken address
    */
  function unsetEntry(
    address _makerToken,
    address _takerToken
  ) external {

    // Ensure the market exists.
    require(indexes[_makerToken][_takerToken] != Index(0),
      "INDEX_DOES_NOT_EXIST");

    // Get the entry for the sender.
    Index.Entry memory entry = indexes[_makerToken][_takerToken].getEntry(msg.sender);

    // Ensure the entry exists.
    require(entry.user == msg.sender,
      "ENTRY_DOES_NOT_EXIST");

    // Unset the entry on the market.
    //No need to require() because a check is done above that reverts if there are no entries
    indexes[_makerToken][_takerToken].unsetEntry(msg.sender);

    if (entry.score > 0) {
      // Return the staked tokens. IERC20 returns boolean this contract may not be ours.
      // Need to revert when false is returned
      require(stakeToken.transfer(msg.sender, entry.score));
    }

    emit Unstake(msg.sender, _makerToken, _takerToken, entry.score);
  }

  /**
    * @notice Get the Entries to Trade for a Index
    * @dev Users are allowed unstake from blacklisted indexes
    *
    * @param _makerToken address
    * @param _takerToken address
    * @param _count uint256
    * @return locators address[]
    */
  function getEntries(
    address _makerToken,
    address _takerToken,
    uint256 _count
  ) external view returns (
    bytes32[] memory locators
  ) {

    // Ensure neither token is blacklisted.
    if (!blacklist[_makerToken] && !blacklist[_takerToken]) {

      // Ensure the market exists.
      if (indexes[_makerToken][_takerToken] != Index(0)) {

        // Return an array of locators for the market.
        return indexes[_makerToken][_takerToken].fetchEntries(_count);

      }
    }
    return new bytes32[](0);
  }
}
