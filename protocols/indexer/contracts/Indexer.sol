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
  mapping (address => bool) public blacklist;

  // The whitelist contract for checking whether a peer is whitelisted
  address public locatorWhitelist;

  // Boolean marking when the contract is paused - users cannot call functions when true
  bool public contractPaused = false;

  /**
    * @notice Contract Constructor
    * @param _stakingToken address
    */
  constructor(
    address _stakingToken
  ) public {
    stakingToken = IERC20(_stakingToken);
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
    * @notice Set the address of an ILocatorWhitelist to use
    * @dev Clear the whitelist with a null address (0x0)
    * @param _locatorWhitelist address Locator whitelist
    */
  function setLocatorWhitelist(
    address _locatorWhitelist
  ) external onlyOwner {
    locatorWhitelist = _locatorWhitelist;
  }

  /**
    * @notice Create an Index (List of Locators for a Token Pair)
    * @dev Deploys a new Index contract and stores the address
    *
    * @param _signerToken address Signer token for the Index
    * @param _senderToken address Sender token for the Index
    */
  function createIndex(
    address _signerToken,
    address _senderToken
  ) external notPaused returns (address) {

    // If the Index does not exist, create it.
    if (indexes[_signerToken][_senderToken] == Index(0)) {
      // Create a new Index contract for the token pair.
      indexes[_signerToken][_senderToken] = new Index();

      emit CreateIndex(_signerToken, _senderToken);
    }

    // Return the address of the Index contract.
    return address(indexes[_signerToken][_senderToken]);
  }

  /**
    * @notice Add a Token to the Blacklist
    * @param _token address Token to blacklist
    */
  function addToBlacklist(
    address _token
  ) external onlyOwner {
    if (!blacklist[_token]) {
      blacklist[_token] = true;
      emit AddToBlacklist(_token);
    }
  }

  /**
    * @notice Remove a Token from the Blacklist
    * @param _token address Token to remove from the blacklist
    */
  function removeFromBlacklist(
    address _token
  ) external onlyOwner {
    if (blacklist[_token]) {
      blacklist[_token] = false;
      emit RemoveFromBlacklist(_token);
    }
  }

  /**
    * @notice Set an Intent to Trade
    * @dev Requires approval to transfer staking token for sender
    *
    * @param _signerToken address Signer token of the Index being staked
    * @param _senderToken address Sender token of the Index being staked
    * @param _amount uint256 Amount being staked
    * @param _locator bytes32 Locator of the staker
    */
  function setIntent(
    address _signerToken,
    address _senderToken,
    uint256 _amount,
    bytes32 _locator
  ) external notPaused {

    // If whitelist set, ensure the locator is valid.
    if (locatorWhitelist != address(0)) {
      require(ILocatorWhitelist(locatorWhitelist).has(_locator),
      "LOCATOR_NOT_WHITELISTED");
    }

    // Ensure neither of the tokens are blacklisted.
    require(!blacklist[_signerToken] && !blacklist[_senderToken],
      "PAIR_IS_BLACKLISTED");

    // Ensure the index exists.
    require(indexes[_signerToken][_senderToken] != Index(0),
      "INDEX_DOES_NOT_EXIST");

    // Only transfer for staking if amount is set.
    if (_amount > 0) {

      // Transfer the _amount for staking.
      require(stakingToken.transferFrom(msg.sender, address(this), _amount),
        "UNABLE_TO_STAKE");
    }

    emit Stake(msg.sender, _signerToken, _senderToken, _amount);

    // Set the locator on the index.
    indexes[_signerToken][_senderToken].setLocator(msg.sender, _amount, _locator);
  }

  /**
    * @notice Unset an Intent to Trade
    * @dev Users are allowed unstake from blacklisted indexes
    *
    * @param _signerToken address Signer token of the Index being unstaked
    * @param _senderToken address Sender token of the Index being staked
    */
  function unsetIntent(
    address _signerToken,
    address _senderToken
  ) external notPaused {
    unsetUserIntent(msg.sender, _signerToken, _senderToken);
  }

  /**
    * @notice Unset Intent for a User
    * @dev Only callable by owner
    * @dev This can be used when contractPaused to return staked tokens to users
    *
    * @param _user address
    * @param _signerToken address Signer token of the Index being unstaked
    * @param _senderToken address Signer token of the Index being unstaked
    */
  function unsetIntentForUser(
    address _user,
    address _signerToken,
    address _senderToken
  ) external onlyOwner {
    unsetUserIntent(_user, _signerToken, _senderToken);
  }

  /**
    * @notice Set whether the contract is paused
    * @dev Only callable by owner
    *
    * @param _newStatus bool New status of contractPaused
    */
  function setPausedStatus(bool _newStatus) external onlyOwner {
    contractPaused = _newStatus;
  }

  /**
    * @notice Destroy the Contract
    * @dev Only callable by owner and when contractPaused
    *
    * @param _recipient address Recipient of any money in the contract
    */
  function killContract(address payable _recipient) external onlyOwner paused {
    selfdestruct(_recipient);
  }

  /**
    * @notice Gets the Stake Amount for a User
    * @param _user address User who staked
    * @param _signerToken address Signer token the user staked on
    * @param _senderToken address Sender token the user staked on
    * @return uint256 Amount the user staked
    */
  function getStakedAmount(
    address _user,
    address _signerToken,
    address _senderToken
  ) external view returns (uint256) {
    // Ensure the index exists.
    require(indexes[_signerToken][_senderToken] != Index(0),
      "INDEX_DOES_NOT_EXIST");

    // Return the score, equivalent to the stake amount.
    return indexes[_signerToken][_senderToken].getScore(_user);
  }

  /**
    * @notice Get the locators of those trading a token pair
    * @dev Users are allowed unstake from blacklisted indexes
    *
    * @param _signerToken address Signer token of the trading pair
    * @param _senderToken address Sender token of the trading pair
    * @param _startAddress address Address to start from
    * @param _count uint256 Total number of locators to return
    * @return locators bytes32[]
    */
  function getLocators(
    address _signerToken,
    address _senderToken,
    address _startAddress,
    uint256 _count
  ) external view notPaused returns (
    bytes32[] memory locators
  ) {
    // Ensure neither token is blacklisted.
    if (blacklist[_signerToken] || blacklist[_senderToken]) {
      return new bytes32[](0);
    }

    // Ensure the index exists.
    if (indexes[_signerToken][_senderToken] == Index(0)) {
      return new bytes32[](0);
    }

    // Return an array of locators for the index.
    return indexes[_signerToken][_senderToken].getLocators(_startAddress, _count);
  }

  /**
    * @notice Unset intents and return staked tokens
    * @param _user address Address of the user who staked
    * @param _signerToken address Signer token of the trading pair
    * @param _senderToken address Sender token of the trading pair
    */
  function unsetUserIntent(
    address _user,
    address _signerToken,
    address _senderToken
  ) internal {
    // Ensure the index exists.
    require(indexes[_signerToken][_senderToken] != Index(0),
      "INDEX_DOES_NOT_EXIST");

     // Get the score for the _user.
    uint256 score = indexes[_signerToken][_senderToken].getScore(_user);

    // Unset the locator on the index.
    indexes[_signerToken][_senderToken].unsetLocator(_user);

    if (score > 0) {
      // Return the staked tokens. Reverts on failure.
      require(stakingToken.transfer(_user, score));
    }

    emit Unstake(_user, _signerToken, _senderToken, score);
  }

}
