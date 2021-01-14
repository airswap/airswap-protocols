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

pragma solidity 0.5.16;
pragma experimental ABIEncoderV2;

import "./Index.sol";
import "@airswap/indexer/contracts/interfaces/IIndexer.sol";
import "@airswap/indexer/contracts/interfaces/ILocatorWhitelist.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title Indexer: A Collection of Index contracts by Token Pair
 */
contract Indexer is IIndexer, Ownable {
  // Token to be used for staking (ERC-20)
  IERC20 public stakingToken;

  // Mapping of signer token to sender token to protocol type to index
  mapping(address => mapping(address => mapping(bytes2 => Index)))
    public indexes;

  // The whitelist contract for checking whether a peer is whitelisted per peer type
  mapping(bytes2 => address) public locatorWhitelists;

  // Mapping of token address to boolean
  mapping(address => bool) public tokenBlacklist;

  /**
   * @notice Contract Constructor
   * @param indexerStakingToken address
   */
  constructor(address indexerStakingToken) public {
    stakingToken = IERC20(indexerStakingToken);
  }

  /**
   * @notice Modifier to check an index exists
   */
  modifier indexExists(
    address signerToken,
    address senderToken,
    bytes2 protocol
  ) {
    require(
      indexes[signerToken][senderToken][protocol] != Index(0),
      "INDEX_DOES_NOT_EXIST"
    );
    _;
  }

  /**
   * @notice Set the address of an ILocatorWhitelist to use
   * @dev Allows removal of locatorWhitelist by passing 0x0
   * @param protocol bytes2 Protocol type for locators
   * @param newLocatorWhitelist address Locator whitelist
   */
  function setLocatorWhitelist(bytes2 protocol, address newLocatorWhitelist)
    external
    onlyOwner
  {
    locatorWhitelists[protocol] = newLocatorWhitelist;
  }

  /**
   * @notice Create an Index (List of Locators for a Token Pair)
   * @dev Deploys a new Index contract and stores the address. If the Index already
   * @dev exists, returns its address, and does not emit a CreateIndex event
   * @param signerToken address Signer token for the Index
   * @param senderToken address Sender token for the Index
   * @param protocol bytes2 Protocol type for locators in Index
   */
  function createIndex(
    address signerToken,
    address senderToken,
    bytes2 protocol
  ) external returns (address) {
    // If the Index does not exist, create it.
    if (indexes[signerToken][senderToken][protocol] == Index(0)) {
      // Create a new Index contract for the token pair.
      indexes[signerToken][senderToken][protocol] = new Index();

      emit CreateIndex(
        signerToken,
        senderToken,
        protocol,
        address(indexes[signerToken][senderToken][protocol])
      );
    }

    // Return the address of the Index contract.
    return address(indexes[signerToken][senderToken][protocol]);
  }

  /**
   * @notice Add a Token to the Blacklist
   * @param token address Token to blacklist
   */
  function addTokenToBlacklist(address token) external onlyOwner {
    if (!tokenBlacklist[token]) {
      tokenBlacklist[token] = true;
      emit AddTokenToBlacklist(token);
    }
  }

  /**
   * @notice Remove a Token from the Blacklist
   * @param token address Token to remove from the blacklist
   */
  function removeTokenFromBlacklist(address token) external onlyOwner {
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
   * @param protocol bytes2 Protocol type for locator in Intent
   * @param stakingAmount uint256 Amount being staked
   * @param locator bytes32 Locator of the staker
   */
  function setIntent(
    address signerToken,
    address senderToken,
    bytes2 protocol,
    uint256 stakingAmount,
    bytes32 locator
  ) external indexExists(signerToken, senderToken, protocol) {
    // If whitelist set, ensure the locator is valid.
    if (locatorWhitelists[protocol] != address(0)) {
      require(
        ILocatorWhitelist(locatorWhitelists[protocol]).has(locator),
        "LOCATOR_NOT_WHITELISTED"
      );
    }

    // Ensure neither of the tokens are blacklisted.
    require(
      !tokenBlacklist[signerToken] && !tokenBlacklist[senderToken],
      "PAIR_IS_BLACKLISTED"
    );

    bool notPreviouslySet =
      (indexes[signerToken][senderToken][protocol].getLocator(msg.sender) ==
        bytes32(0));

    if (notPreviouslySet) {
      // Only transfer for staking if stakingAmount is set.
      if (stakingAmount > 0) {
        // Transfer the stakingAmount for staking.
        require(
          stakingToken.transferFrom(msg.sender, address(this), stakingAmount),
          "STAKING_FAILED"
        );
      }
      // Set the locator on the index.
      indexes[signerToken][senderToken][protocol].setLocator(
        msg.sender,
        stakingAmount,
        locator
      );

      emit Stake(msg.sender, signerToken, senderToken, protocol, stakingAmount);
    } else {
      uint256 oldStake =
        indexes[signerToken][senderToken][protocol].getScore(msg.sender);

      _updateIntent(
        msg.sender,
        signerToken,
        senderToken,
        protocol,
        stakingAmount,
        locator,
        oldStake
      );
    }
  }

  /**
   * @notice Unset an Intent to Trade
   * @dev Users are allowed to unstake from blacklisted indexes
   *
   * @param signerToken address Signer token of the Index being unstaked
   * @param senderToken address Sender token of the Index being staked
   * @param protocol bytes2 Protocol type for locators in Intent
   */
  function unsetIntent(
    address signerToken,
    address senderToken,
    bytes2 protocol
  ) external {
    _unsetIntent(msg.sender, signerToken, senderToken, protocol);
  }

  /**
   * @notice Get the locators of those trading a token pair
   * @dev Users are allowed to unstake from blacklisted indexes
   *
   * @param signerToken address Signer token of the trading pair
   * @param senderToken address Sender token of the trading pair
   * @param protocol bytes2 Protocol type for locators in Intent
   * @param cursor address Address to start from
   * @param limit uint256 Total number of locators to return
   * @return bytes32[] List of locators
   * @return uint256[] List of scores corresponding to locators
   * @return address The next cursor to provide for pagination
   */
  function getLocators(
    address signerToken,
    address senderToken,
    bytes2 protocol,
    address cursor,
    uint256 limit
  )
    external
    view
    returns (
      bytes32[] memory locators,
      uint256[] memory scores,
      address nextCursor
    )
  {
    // Ensure neither token is blacklisted.
    if (tokenBlacklist[signerToken] || tokenBlacklist[senderToken]) {
      return (new bytes32[](0), new uint256[](0), address(0));
    }

    // Ensure the index exists.
    if (indexes[signerToken][senderToken][protocol] == Index(0)) {
      return (new bytes32[](0), new uint256[](0), address(0));
    }

    return
      indexes[signerToken][senderToken][protocol].getLocators(cursor, limit);
  }

  /**
   * @notice Gets the Stake Amount for a User
   * @param user address User who staked
   * @param signerToken address Signer token the user staked on
   * @param senderToken address Sender token the user staked on
   * @param protocol bytes2 Protocol type for locators in Intent
   * @return uint256 Amount the user staked
   */
  function getStakedAmount(
    address user,
    address signerToken,
    address senderToken,
    bytes2 protocol
  ) public view returns (uint256 stakedAmount) {
    if (indexes[signerToken][senderToken][protocol] == Index(0)) {
      return 0;
    }
    // Return the score, equivalent to the stake amount.
    return indexes[signerToken][senderToken][protocol].getScore(user);
  }

  function _updateIntent(
    address user,
    address signerToken,
    address senderToken,
    bytes2 protocol,
    uint256 newAmount,
    bytes32 newLocator,
    uint256 oldAmount
  ) internal {
    // If the new stake is bigger, collect the difference.
    if (oldAmount < newAmount) {
      // Note: SafeMath not required due to the inequality check above
      require(
        stakingToken.transferFrom(user, address(this), newAmount - oldAmount),
        "STAKING_FAILED"
      );
    }

    // If the old stake is bigger, return the excess.
    if (newAmount < oldAmount) {
      // Note: SafeMath not required due to the inequality check above
      require(stakingToken.transfer(user, oldAmount - newAmount));
    }

    // Update their intent.
    indexes[signerToken][senderToken][protocol].updateLocator(
      user,
      newAmount,
      newLocator
    );

    emit Stake(user, signerToken, senderToken, protocol, newAmount);
  }

  /**
   * @notice Unset intents and return staked tokens
   * @param user address Address of the user who staked
   * @param signerToken address Signer token of the trading pair
   * @param senderToken address Sender token of the trading pair
   * @param protocol bytes2 Protocol type for locators in Intent
   */
  function _unsetIntent(
    address user,
    address signerToken,
    address senderToken,
    bytes2 protocol
  ) internal indexExists(signerToken, senderToken, protocol) {
    // Get the score for the user.
    uint256 score = indexes[signerToken][senderToken][protocol].getScore(user);

    // Unset the locator on the index.
    indexes[signerToken][senderToken][protocol].unsetLocator(user);

    if (score > 0) {
      // Return the staked tokens. Reverts on failure.
      require(stakingToken.transfer(user, score));
    }

    emit Unstake(user, signerToken, senderToken, protocol, score);
  }
}
