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
import "@airswap/market/contracts/Market.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

/**
  * @title Indexer: An Collection of Markets by Token Pair
  */
contract Indexer is IIndexer, Ownable {

  // Token to be used for staking (ERC-20)
  IERC20 public stakeToken;

  // Minimum token amount required for staking
  uint256 public stakeMinimum;

  // Mapping of token to token for market lookup
  mapping (address => mapping (address => Market)) public markets;

  // Mapping of address to timestamp of blacklisting
  mapping (address => uint256) public blacklist;

  /**
    * @notice Contract Constructor
    *
    * @param _stakeToken address
    * @param _stakeMinimum uint256
    */
  constructor(
    address _stakeToken,
    uint256 _stakeMinimum
  ) public {
    stakeToken = IERC20(_stakeToken);
    stakeMinimum = _stakeMinimum;
    emit SetStakeMinimum(_stakeMinimum);
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
    * @notice Create a Two Sided Market
    * @dev Deploys two new Market contracts
    *
    * @param _tokenOne address
    * @param _tokenTwo address
    */
  function createTwoSidedMarket(
    address _tokenOne,
    address _tokenTwo
  ) public returns (address, address) {

    // Create the makerToken / takerToken market.
    address marketOne = createMarket(_tokenOne, _tokenTwo);

    // Create the takerToken / makerToken market.
    address marketTwo = createMarket(_tokenTwo, _tokenOne);

    // Return the addresses of both Market contracts.
    return (marketOne, marketTwo);
  }

  /**
    * @notice Set the Minimum Staking Amount
    * @param _stakeMinimum uint256
    */
  function setStakeMinimum(
    uint256 _stakeMinimum
  ) external onlyOwner {
    stakeMinimum = _stakeMinimum;
    emit SetStakeMinimum(_stakeMinimum);
  }

  /**
    * @notice Add a Token to the Blacklist
    * @param _token address
    */
  function addToBlacklist(
    address _token
  ) external onlyOwner {
    if (blacklist[_token] == 0) {
      blacklist[_token] = block.timestamp;
      emit AddToBlacklist(_token);
    }
  }

  /**
    * @notice Remove a Token from the Blacklist
    * @param _token address
    */
  function removeFromBlacklist(
    address _token
  ) external onlyOwner {
    if (blacklist[_token] != 0) {
      blacklist[_token] = 0;
      emit RemoveFromBlacklist(_token);
    }
  }

  /**
    * @notice Set an Intent to Trade
    * @dev Requires approval to transfer staking token for sender
    *
    * @param _makerToken address
    * @param _takerToken address
    * @param _amount uint256
    * @param _expiry uint256
    * @param _locator bytes32
    */
  function setIntent(
    address _makerToken,
    address _takerToken,
    uint256 _amount,
    uint256 _expiry,
    bytes32 _locator
  ) public {

    // Ensure both of the tokens are not blacklisted.
    require(blacklist[_makerToken] == 0 && blacklist[_takerToken] == 0,
      "MARKET_IS_BLACKLISTED");

    // Ensure the market exists.
    require(markets[_makerToken][_takerToken] != Market(0),
      "MARKET_DOES_NOT_EXIST");

    // Ensure the _amount meets the stakeMinimum.
    require(_amount >= stakeMinimum,
      "MINIMUM_NOT_MET");

    // Transfer the _amount for staking.
    require(stakeToken.transferFrom(msg.sender, address(this), _amount),
      "UNABLE_TO_STAKE");

    require(!markets[_makerToken][_takerToken].hasIntent(msg.sender),
      "USER_ALREADY_STAKED");

    emit Stake(msg.sender, _makerToken, _takerToken, _amount, _expiry);

    // Set the intent on the market.
    markets[_makerToken][_takerToken].setIntent(msg.sender, _amount, _expiry, _locator);
  }

  /**
    * @notice Set Two-Sided Intent to Trade
    *
    * @param _tokenOne address
    * @param _tokenTwo address
    * @param _amount uint256
    * @param _expiry uint256
    * @param _locator bytes32
    */
  function setTwoSidedIntent(
    address _tokenOne,
    address _tokenTwo,
    uint256 _amount,
    uint256 _expiry,
    bytes32 _locator
  ) public {
    // Set the _makerToken / _tokenTwo side of the market.
    setIntent(_tokenOne, _tokenTwo, _amount, _expiry, _locator);

    // Set the _tokenTwo / _makerToken side of the market.
    setIntent(_tokenTwo, _tokenOne, _amount, _expiry, _locator);
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

    // Get the intent for the sender.
    Market.Intent memory intent = markets[_makerToken][_takerToken].getIntent(msg.sender);

    // Ensure the intent exists.
    require(intent.staker == msg.sender,
      "INTENT_DOES_NOT_EXIST");

    // Unset the intent on the market.
    markets[_makerToken][_takerToken].unsetIntent(msg.sender);

    // Return the staked tokens.
    stakeToken.transfer(msg.sender, intent.amount);
    emit Unstake(msg.sender, _makerToken, _takerToken, intent.amount);
  }

  /**
    * @notice Unset an Two-Sided Intent to Trade
    * @dev Users are allowed unstake from blacklisted markets
    *
    * @param _tokenOne address
    * @param _tokenTwo address
    */
  function unsetTwoSidedIntent(
    address _tokenOne,
    address _tokenTwo
  ) public {
    // Unset the _tokenOne / _tokenTwo side of the market.
    unsetIntent(_tokenOne, _tokenTwo);

    // Unset the _tokenTwo / _tokenOne side of the market.
    unsetIntent(_tokenTwo, _tokenOne);
  }

  /**
    * @notice Get the Intents to Trade for a Market
    * @dev Users are allowed unstake from blacklisted markets
    *
    * @param _makerToken address
    * @param _takerToken address
    * @param _count uint256
    * @return locators bytes32[]
    */
  function getIntents(
    address _makerToken,
    address _takerToken,
    uint256 _count
  ) external view returns (
    bytes32[] memory locators
  ) {

    // Ensure neither token is blacklisted.
    if (blacklist[_makerToken] == 0 && blacklist[_takerToken] == 0) {

      // Ensure the market exists.
      if (markets[_makerToken][_takerToken] != Market(0)) {

        // Return an array of locators for the market.
        return markets[_makerToken][_takerToken].fetchIntents(_count);

      }
    }
    return new bytes32[](0);
  }

  /**
    * @notice Get the Size of a Market
    * @dev Returns the number of valid intents to trade
    *
    * @param _makerToken address
    * @param _takerToken address
    */
  function lengthOf(
    address _makerToken,
    address _takerToken
  ) external view returns (
    uint256 length
  ) {

    // Ensure the market exists.
    if (markets[_makerToken][_takerToken] != Market(0)) {

      // Return the size of the market.
      return markets[_makerToken][_takerToken].getLength();

    }
    return 0;
  }
}
