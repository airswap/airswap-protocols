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
pragma experimental ABIEncoderV2;

import "@airswap/swap/contracts/interfaces/ISwap.sol";
import "@airswap/indexer/contracts/interfaces/IIndexer.sol";
import "@airswap/peer/contracts/interfaces/IPeer.sol";
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
  ) public returns (bytes32, uint256) {

    bytes32 untrustedLowestCostPeer;
    uint256 lowestCost = 2**256 - 1;

    // Fetch an array of Intent locators from the Indexer.
    // Warning: In this example, the addresses returned are not trusted and may not actually implement IPeer.
    bytes32[] memory untrustedProbablyPeers = indexerContract.getIntents(
      _userReceiveToken,
      _userSendToken,
      _maxIntents
      );

    // Iterate through locators.
    for (uint256 i; i < untrustedProbablyPeers.length; i++) {

      // Get a buy quote from the Peer.
      uint256 userSendAmount = IPeer(address(bytes20(untrustedProbablyPeers[i])))
        .getMakerSideQuote(_userReceiveAmount, _userReceiveToken, _userSendToken);

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

    bytes32 untrustedPeerLocator;
    address untrustedPeerContract;
    uint256 userSendAmount;

    // Find the best buy among Indexed Peers.
    (untrustedPeerLocator, userSendAmount) =
      findBestBuy(_userReceiveAmount, _userReceiveToken, _userSendToken, _maxIntents);
    untrustedPeerContract = address(bytes20(untrustedPeerLocator));

    // Consumer transfers User amount to itself.
    IERC20(_userSendToken).transferFrom(msg.sender, address(this), userSendAmount);

    // Consumer approves Swap to move its new tokens.
    IERC20(_userSendToken).approve(address(swapContract), userSendAmount);

    // Consumer authorizes the Peer.
    swapContract.authorize(untrustedPeerContract, block.timestamp + 1);

    // Consumer provides unsigned order to Peer.
    IPeer(untrustedPeerContract).provideOrder(Types.Order(
      1,
      block.timestamp + 1,
      Types.Party(
        address(this), // consumer is acting as the maker in this case
        _userSendToken,
        userSendAmount,
        0x277f8169
      ),
      Types.Party(
        IPeer(untrustedPeerContract).owner(),
        _userReceiveToken,
        _userReceiveAmount,
        0x277f8169
      ),
      Types.Party(address(0), address(0), 0, bytes4(0)),
      Types.Signature(address(0), 0, 0, 0, 0)
    ));

    // Consumer revokes the authorization of the Peer.
    swapContract.revoke(untrustedPeerContract);

    // Consumer transfers received amount to the User.
    IERC20(_userReceiveToken).transfer(msg.sender, _userReceiveAmount);
  }

}
