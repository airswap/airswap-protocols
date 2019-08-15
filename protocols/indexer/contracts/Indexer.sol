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

import "@airswap/indexer/interfaces/IIndexer.sol";
import "@airswap/indexer/interfaces/ILocatorWhitelist.sol";
import "@airswap/market/contracts/Market.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

/**
  * @title Indexer: An Collection of Markets by Token Pair
  */
contract Indexer is IIndexer, Ownable {

  // Token to be used for staking (ERC-20)
  IERC20 public stakeToken;

  // Mapping of maker token to taker token to market
  mapping (address => mapping (address => Market)) public markets;

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
    * @notice Create a Market (Collection of Intents to Trade)
    * @dev Deploys a new Market contract and tracks the address
    *
    * @param _makerToken address
    * @param _takerToken address
    */
  function createMarket(
    address _makerToken,
    address _takerToken
  ) public returns (address) {

    // If the Market does not exist, create it.
    if (markets[_makerToken][_takerToken] == Market(0)) {
      // Create a new Market contract for the token pair.
      markets[_makerToken][_takerToken] = new Market(_makerToken, _takerToken);
      emit CreateMarket(_makerToken, _takerToken);
    }

    // Return the address of the Market contract.
    return address(markets[_makerToken][_takerToken]);
  }

  /**
    * @notice Add a Token to the Blacklist
    * @param _tokens address[]
    */
  function addToBlacklist(
    address[] calldata _tokens
  ) external onlyOwner {
    for (uint256 i = 0; i < _tokens.length; i++) {
      if (blacklist[_tokens[i]] == false) {
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
      if (blacklist[_tokens[i]] == true) {
        blacklist[_tokens[i]] = false;
        emit RemoveFromBlacklist(_tokens[i]);
      }
    }
  }

  /**
    * @notice Set an Intent to Trade
    * @dev Requires approval to transfer staking token for sender
    *
    * @param _makerToken address
    * @param _takerToken address
    * @param _amount uint256
    * @param _locator bytes32
    */
  function setIntent(
    address _makerToken,
    address _takerToken,
    uint256 _amount,
    bytes32 _locator
  ) public {

    // Ensure the locator is whitelisted, if relevant
    if (locatorWhitelist != address(0)) {
      require(ILocatorWhitelist(locatorWhitelist).has(_locator),
      "LOCATOR_NOT_WHITELISTED");
    }

    // Ensure both of the tokens are not blacklisted.
    require(!blacklist[_makerToken] && !blacklist[_takerToken],
      "MARKET_IS_BLACKLISTED");

    // Ensure the market exists.
    require(markets[_makerToken][_takerToken] != Market(0),
      "MARKET_DOES_NOT_EXIST");

    // Only transfer for staking if amount is set.
    if (_amount > 0) {

      // Transfer the _amount for staking.
      require(stakeToken.transferFrom(msg.sender, address(this), _amount),
        "UNABLE_TO_STAKE");

    }

    require(!markets[_makerToken][_takerToken].hasIntent(msg.sender),
      "USER_ALREADY_STAKED");

    emit Stake(msg.sender, _makerToken, _takerToken, _amount);

    // Set the intent on the market.
    markets[_makerToken][_takerToken].setIntent(msg.sender, _amount, _locator);
  }

  /**
    * @notice Unset an Intent to Trade
    * @dev Users are allowed unstake from blacklisted markets
    *
    * @param _makerToken address
    * @param _takerToken address
    */
  function unsetIntent(
    address _makerToken,
    address _takerToken
  ) public {

    // Ensure the market exists.
    require(markets[_makerToken][_takerToken] != Market(0),
      "MARKET_DOES_NOT_EXIST");

    removeIntent(_makerToken, _takerToken, msg.sender);
  }

  /**
    * @notice Get the Intents to Trade for a Market
    * @dev Users are allowed unstake from blacklisted markets
    *
    * @param _makerToken address
    * @param _takerToken address
    * @param _count uint256
    * @return locators address[]
    */
  function getIntents(
    address _makerToken,
    address _takerToken,
    uint256 _count
  ) external returns (
    bytes32[] memory locators
  ) {

    // Ensure neither token is blacklisted.
    if (!blacklist[_makerToken] && !blacklist[_takerToken]) {

      // Ensure the market exists.
      if (markets[_makerToken][_takerToken] != Market(0)) {

        // Return an array of locators for the market.
        return markets[_makerToken][_takerToken].fetchIntents(_count);

      }
    }
    return new bytes32[](0);
  }

  /**
    * @notice Removes stakers' intents from a market
    *
    * @param _makerToken address
    * @param _takerToken address
    * @param _staker address
    */
  function removeIntent(
    address _makerToken,
    address _takerToken,
    address _staker
  ) internal {
    // Get the intent for the sender.
    Market.Intent memory intent = markets[_makerToken][_takerToken].getIntent(_staker);

    // Ensure the intent exists.
    require(intent.staker == _staker,
      "INTENT_DOES_NOT_EXIST");

    // Unset the intent on the market.
    markets[_makerToken][_takerToken].unsetIntent(_staker);

    // Return the staked tokens.
    stakeToken.transfer(_staker, intent.amount);
    emit Unstake(_staker, _makerToken, _takerToken, intent.amount);
  }

}
