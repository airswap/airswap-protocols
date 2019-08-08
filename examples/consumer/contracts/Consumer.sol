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
import "@airswap/peer/interfaces/IPeer.sol";
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
    * @param _swapContract the address of the Swap Contract
    * @param _indexerContract the address of the Indexer Contract
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
    * @param _userReceiveAmount uint256 the amount of the token the caller is looking to receive
    * @param _userReceiveToken address the token the user is looking to receive
    * @param _userSendToken address the token the user is looking to send
    * @param _maxIntents uint256 the max number of intents to search through
    *
    * @return address The best priced Peer
    * @return uint256 The best priced Delgate's quote amount
    */
  function findBestBuy(
    uint256 _userReceiveAmount,
    address _userReceiveToken,
    address _userSendToken,
    uint256 _maxIntents
  ) public returns (address, uint256) {

    address untrustedLowestCostPeer;
    uint256 lowestCost = 2**256 - 1;

    // Fetch an array of Intent locators from the Indexer.
    // Warning: In this example, the addresses returned are not trusted and may not actually implement IPeer.
    address[] memory untrustedProbablyPeers = indexerContract.getIntents(_userReceiveToken, _userSendToken, _maxIntents);

    // Iterate through locators.
    for (uint256 i; i < untrustedProbablyPeers.length; i++) {

      // Get a buy quote from the Peer.
      uint256 userSendAmount = IPeer(untrustedProbablyPeers[i])
        .getBuyQuote(_userReceiveAmount, _userReceiveToken, _userSendToken);

      // Update the lowest cost.
      if (userSendAmount > 0 && userSendAmount < lowestCost) {
        untrustedLowestCostPeer = untrustedProbablyPeers[i];
        lowestCost = userSendAmount;
      }
    }

    // Return the Peer address and amount.
    return (untrustedLowestCostPeer, lowestCost);
  }

  /**
    * @notice Take the Best Price for a Buy
    *
    * @param _userReceiveAmount uint256 the amount of the token the caller is looking to receive
    * @param _userReceiveToken address the token the user is looking to receive
    * @param _userSendToken address the token the user is looking to send
    * @param _maxIntents uint256 the max number of intents to search through
    */
  function takeBestBuy(
    uint256 _userReceiveAmount,
    address _userReceiveToken,
    address _userSendToken,
    uint256 _maxIntents
  ) public {

    address untrustedPeerContract;
    uint256 userSendAmount;

    // Find the best buy among Indexed Peers.
    (untrustedPeerContract, userSendAmount) =
      findBestBuy(_userReceiveAmount, _userReceiveToken, _userSendToken, _maxIntents);

    // Consumer transfers User amount to itself.
    IERC20(_userSendToken).transferFrom(msg.sender, address(this), userSendAmount);

    // Consumer approves Swap to move its new tokens.
    IERC20(_userSendToken).approve(address(swapContract), userSendAmount);

    // Consumer authorizes the Peer.
    swapContract.authorize(untrustedPeerContract, block.timestamp + 1);

    // Consumer provides unsigned order to Peer.
    IPeer(untrustedPeerContract).provideUnsignedOrder(
      1,
      userSendAmount,
      _userSendToken,
      _userReceiveAmount,
      _userReceiveToken
    );

    // Consumer revokes the authorization of the Peer.
    swapContract.revoke(untrustedPeerContract);

    // Consumer transfers received amount to the User.
    IERC20(_userReceiveToken).transfer(msg.sender, _userReceiveAmount);
  }

}
