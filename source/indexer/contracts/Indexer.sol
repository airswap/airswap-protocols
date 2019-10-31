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

pragma solidity 0.5.12;
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
  IERC20 public stakingToken;

  // Mapping of signer token to sender token to index
  mapping (address => mapping (address => Index)) public indexes;

  // Mapping of token address to boolean
  mapping (address => bool) public tokenBlacklist;

  // The whitelist contract for checking whether a peer is whitelisted
  address public locatorWhitelist;

  // Boolean marking when the contract is paused - users cannot call functions when true
  bool public contractPaused;

  /**
    * @notice Contract Constructor
    * @param indexerStakingToken address
    */
  constructor(
    address indexerStakingToken
  ) public {
    stakingToken = IERC20(indexerStakingToken);
  }

  /**
    * @notice Modifier to prevent function calling unless the contract is not paused
    */
  modifier notPaused() {
    require(!contractPaused, "CONTRACT_IS_PAUSED");
    _;
  }

  /**
    * @notice Modifier to prevent function calling unless the contract is paused
    */
  modifier paused() {
    require(contractPaused, "CONTRACT_NOT_PAUSED");
    _;
  }

  /**
    * @notice Modifier to check an index exists
    */
  modifier indexExists(address signerToken, address senderToken) {
    require(indexes[signerToken][senderToken] != Index(0),
      "INDEX_DOES_NOT_EXIST");
    _;
  }

  /**
    * @notice Set the address of an ILocatorWhitelist to use
    * @dev Allows removal of locatorWhitelist by passing 0x0
    * @param newLocatorWhitelist address Locator whitelist
    */
  function setLocatorWhitelist(
    address newLocatorWhitelist
  ) external onlyOwner {
    locatorWhitelist = newLocatorWhitelist;
  }

  /**
    * @notice Create an Index (List of Locators for a Token Pair)
    * @dev Deploys a new Index contract and stores the address. If the Index already
    * @dev exists, returns its address, and does not emit a CreateIndex event
    * @param signerToken address Signer token for the Index
    * @param senderToken address Sender token for the Index
    */
  function createIndex(
    address signerToken,
    address senderToken
  ) external notPaused returns (address) {

    // If the Index does not exist, create it.
    if (indexes[signerToken][senderToken] == Index(0)) {
      // Create a new Index contract for the token pair.
      indexes[signerToken][senderToken] = new Index();

      emit CreateIndex(signerToken, senderToken);
    }

    // Return the address of the Index contract.
    return address(indexes[signerToken][senderToken]);
  }

  /**
    * @notice Add a Token to the Blacklist
    * @param token address Token to blacklist
    */
  function addTokenToBlacklist(
    address token
  ) external onlyOwner {
    if (!tokenBlacklist[token]) {
      tokenBlacklist[token] = true;
      emit AddTokenToBlacklist(token);
    }
  }

  /**
    * @notice Remove a Token from the Blacklist
    * @param token address Token to remove from the blacklist
    */
  function removeTokenFromBlacklist(
    address token
  ) external onlyOwner {
    if (tokenBlacklist[token]) {
      tokenBlacklist[token] = false;
      emit RemoveTokenFromBlacklist(token);
    }
  }

  /**
    * @notice Set an Intent to Trade
    * @dev Requires approval to transfer staking token for sender
    *
    * @param signerToken address Signer token of the Index being staked
    * @param senderToken address Sender token of the Index being staked
    * @param stakingAmount uint256 Amount being staked
    * @param locator bytes32 Locator of the staker
    */
  function setIntent(
    address signerToken,
    address senderToken,
    uint256 stakingAmount,
    bytes32 locator
  ) external notPaused indexExists(signerToken, senderToken) {

    // If whitelist set, ensure the locator is valid.
    if (locatorWhitelist != address(0)) {
      require(ILocatorWhitelist(locatorWhitelist).has(locator),
      "LOCATOR_NOT_WHITELISTED");
    }

    // Ensure neither of the tokens are blacklisted.
    require(!tokenBlacklist[signerToken] && !tokenBlacklist[senderToken],
      "PAIR_IS_BLACKLISTED");

    bool notPreviouslySet = (indexes[signerToken][senderToken].getLocator(msg.sender) == bytes32(0));

    if (notPreviouslySet) {
      // Only transfer for staking if stakingAmount is set.
      if (stakingAmount > 0) {

        // Transfer the stakingAmount for staking.
        require(stakingToken.transferFrom(msg.sender, address(this), stakingAmount),
          "UNABLE_TO_STAKE");
      }
      // Set the locator on the index.
      indexes[signerToken][senderToken].setLocator(msg.sender, stakingAmount, locator);

      emit Stake(msg.sender, signerToken, senderToken, stakingAmount);

    } else {

      uint256 oldStake = indexes[signerToken][senderToken].getScore(msg.sender);

      _updateIntent(msg.sender, signerToken, senderToken, stakingAmount, locator, oldStake);
    }
  }

  /**
    * @notice Unset an Intent to Trade
    * @dev Users are allowed to unstake from blacklisted indexes
    *
    * @param signerToken address Signer token of the Index being unstaked
    * @param senderToken address Sender token of the Index being staked
    */
  function unsetIntent(
    address signerToken,
    address senderToken
  ) external notPaused {
    _unsetIntent(msg.sender, signerToken, senderToken);
  }

  /**
    * @notice Unset Intent for a User
    * @dev Only callable by owner
    * @dev This can be used when contractPaused to return staked tokens to users
    *
    * @param user address
    * @param signerToken address Signer token of the Index being unstaked
    * @param senderToken address Signer token of the Index being unstaked
    */
  function unsetIntentForUser(
    address user,
    address signerToken,
    address senderToken
  ) external onlyOwner {
    _unsetIntent(user, signerToken, senderToken);
  }

  /**
    * @notice Set whether the contract is paused
    * @dev Only callable by owner
    *
    * @param newStatus bool New status of contractPaused
    */
  function setPausedStatus(bool newStatus) external onlyOwner {
    contractPaused = newStatus;
  }

  /**
    * @notice Destroy the Contract
    * @dev Only callable by owner and when contractPaused
    *
    * @param recipient address Recipient of any money in the contract
    */
  function killContract(address payable recipient) external onlyOwner paused {
    selfdestruct(recipient);
  }

  /**
    * @notice Get the locators of those trading a token pair
    * @dev Users are allowed to unstake from blacklisted indexes
    *
    * @param signerToken address Signer token of the trading pair
    * @param senderToken address Sender token of the trading pair
    * @param cursor address Address to start from
    * @param limit uint256 Total number of locators to return
    * @return bytes32[] List of locators
    * @return uint256[] List of scores corresponding to locators
    * @return address The next cursor to provide for pagination
    */
  function getLocators(
    address signerToken,
    address senderToken,
    address cursor,
    uint256 limit
  ) external view returns (
    bytes32[] memory locators,
    uint256[] memory scores,
    address nextCursor
  ) {
    // Ensure neither token is blacklisted.
    if (tokenBlacklist[signerToken] || tokenBlacklist[senderToken]) {
      return (new bytes32[](0), new uint256[](0), address(0));
    }

    // Ensure the index exists.
    if (indexes[signerToken][senderToken] == Index(0)) {
      return (new bytes32[](0), new uint256[](0), address(0));
    }

    return indexes[signerToken][senderToken].getLocators(cursor, limit);
  }

  /**
    * @notice Gets the Stake Amount for a User
    * @param user address User who staked
    * @param signerToken address Signer token the user staked on
    * @param senderToken address Sender token the user staked on
    * @return uint256 Amount the user staked
    */
  function getStakedAmount(
    address user,
    address signerToken,
    address senderToken
  ) public view returns (uint256 stakedAmount) {
    if (indexes[signerToken][senderToken] == Index(0)) {
      return 0;
    }
    // Return the score, equivalent to the stake amount.
    return indexes[signerToken][senderToken].getScore(user);
  }

  function _updateIntent(
    address user,
    address signerToken,
    address senderToken,
    uint256 newAmount,
    bytes32 newLocator,
    uint256 oldAmount
  ) internal {
    // If the new stake is bigger, collect the difference.
    if (oldAmount < newAmount) {
      // Note: SafeMath not required due to the inequality check above
      require(stakingToken.transferFrom(user, address(this), newAmount - oldAmount),
        "UNABLE_TO_STAKE");
    }

    // If the old stake is bigger, return the excess.
    if (newAmount < oldAmount) {
      // Note: SafeMath not required due to the inequality check above
      require(stakingToken.transfer(user, oldAmount - newAmount));
    }

    // Unset their old intent, and set their new intent.
    indexes[signerToken][senderToken].unsetLocator(user);
    indexes[signerToken][senderToken].setLocator(user, newAmount, newLocator);

    emit Stake(user, signerToken, senderToken, newAmount);
  }

  /**
    * @notice Unset intents and return staked tokens
    * @param user address Address of the user who staked
    * @param signerToken address Signer token of the trading pair
    * @param senderToken address Sender token of the trading pair
    */
  function _unsetIntent(
    address user,
    address signerToken,
    address senderToken
  ) internal indexExists(signerToken, senderToken) {

     // Get the score for the user.
    uint256 score = indexes[signerToken][senderToken].getScore(user);

    // Unset the locator on the index.
    indexes[signerToken][senderToken].unsetLocator(user);

    if (score > 0) {
      // Return the staked tokens. Reverts on failure.
      require(stakingToken.transfer(user, score));
    }

    emit Unstake(user, signerToken, senderToken, score);
  }

}
