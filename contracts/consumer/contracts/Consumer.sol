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

pragma solidity ^0.5.10;

import "@airswap/swap/interfaces/ISwap.sol";
import "@airswap/indexer/interfaces/IIndexer.sol";
import "@airswap/delegate/interfaces/IDelegate.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

/**
  * @title Consumer: Onchain Liquidity Consumer for the Swap Protocol
  */
contract Consumer {

  // Indexer contract to be used to find intents to trade
  IIndexer public indexerContract;

  // Swap contract to be used to settle trades
  ISwap public swapContract;

  /**
    * @notice Contract Constructor
    *
    * @param _swapContract address
    * @param _indexerContract address
    */
  constructor(
    address _swapContract,
    address _indexerContract
  ) public {
    swapContract = ISwap(_swapContract);
    indexerContract = IIndexer(_indexerContract);
  }

  /**
    * @notice Find the Best Price for a Buy
    *
    * @param _userReceiveAmount uint256
    * @param _userReceiveToken address
    * @param _userSendToken address
    * @param _maxIntents uint256
    *
    * @return Best priced Delegate (address) and its quote amount (uint256)
    */
  function findBestBuy(
    uint256 _userReceiveAmount,
    address _userReceiveToken,
    address _userSendToken,
    uint256 _maxIntents
  ) public view returns (address, uint256) {

    address untrustedLowestCostDelegate;
    uint256 lowestCost = 2**256 - 1;

    // Fetch an array of Intent locators from the Indexer.
    bytes32[] memory locators = indexerContract.getIntents(_userReceiveToken, _userSendToken, _maxIntents);

    // Iterate through locators.
    for (uint256 i; i < locators.length; i++) {

      // Assume the locator is a Delegate.
      address untrustedDelegateContract = address(bytes20(locators[i]));

      // Get a buy quote from the Delegate.
      uint256 userSendAmount = IDelegate(untrustedDelegateContract)
        .getBuyQuote(_userReceiveAmount, _userReceiveToken, _userSendToken);

      // Update the lowest cost.
      if (userSendAmount > 0 && userSendAmount < lowestCost) {
        untrustedLowestCostDelegate = untrustedDelegateContract;
        lowestCost = userSendAmount;
      }
    }

    // Return the Delegate address and amount.
    return (untrustedLowestCostDelegate, lowestCost);
  }

  /**
    * @notice Take the Best Price for a Buy
    *
    * @param _userReceiveAmount uint256
    * @param _userReceiveToken address
    * @param _userSendToken address
    * @param _maxIntents uint256
    */
  function takeBestBuy(
    uint256 _userReceiveAmount,
    address _userReceiveToken,
    address _userSendToken,
    uint256 _maxIntents
  ) public {

    address untrustedDelegateContract;
    uint256 userSendAmount;

    // Find the best buy among Indexed Delegates.
    (untrustedDelegateContract, userSendAmount) =
      findBestBuy(_userReceiveAmount, _userReceiveToken, _userSendToken, _maxIntents);

    // Consumer transfers User amount to itself.
    IERC20(_userSendToken).transferFrom(msg.sender, address(this), userSendAmount);

    // Consumer approves Swap to move its new tokens.
    IERC20(_userSendToken).approve(address(swapContract), userSendAmount);

    // Consumer authorizes the Delegate.
    swapContract.authorize(untrustedDelegateContract, block.timestamp);

    // Consumer provides unsigned order to Delegate.
    IDelegate(untrustedDelegateContract).provideUnsignedOrder(
      1,
      userSendAmount,
      _userSendToken,
      _userReceiveAmount,
      _userReceiveToken
    );

    // Consumer revokes the authorization of the Delegate.
    swapContract.revoke(untrustedDelegateContract);

    // Consumer transfers received amount to the User.
    IERC20(_userReceiveToken).transfer(msg.sender, _userReceiveAmount);
  }

}
