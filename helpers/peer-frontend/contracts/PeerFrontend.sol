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

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "@airswap/indexer/contracts/interfaces/IIndexer.sol";
import "@airswap/peer/contracts/interfaces/IPeer.sol";
import "@airswap/swap/contracts/interfaces/ISwap.sol";

/**
  * @title PeerFrontend: Onchain Liquidity provider for the Swap Protocol
  */
contract PeerFrontend {

  uint256 constant public MAX_INT =  2**256 - 1;

  IIndexer public indexer;
  ISwap public swapContract;

  constructor(IIndexer _indexer, ISwap _swap) public {
    indexer = _indexer;
    swapContract = _swap;
  }

  function getBestTakerSideQuote(
    uint256 _takerAmount,
    address _takerToken,
    address _makerToken,
    uint256 _maxIntents
  ) public view returns (bytes32 peerAddress, uint256 lowestCost) {

    // use the indexer to query peers
    lowestCost = MAX_INT;

    // Fetch an array of locators from the Indexer.
    bytes32[] memory locators = indexer.getIntents(
      _takerToken,
      _makerToken,
      _maxIntents
      );

    // Iterate through locators.
    for (uint256 i; i < locators.length; i++) {

      // Get a buy quote from the Peer.
      uint256 makerAmount = IPeer(address(bytes20(locators[i])))
        .getMakerSideQuote(_takerAmount, _takerToken, _makerToken);

      // Update the lowest cost.
      if (makerAmount > 0 && makerAmount < lowestCost) {
        peerAddress = locators[i];
        lowestCost = makerAmount;
      }
    }

    // Return the Peer address and amount.
    return (peerAddress, lowestCost);

  }

  function getBestMakerSideQuote(
    uint256 _makerAmount,
    address _makerToken,
    address _takerToken,
    uint256 _maxIntents
  ) public view returns (bytes32 peerLocator, uint256 lowestCost) {

    // use the indexer to query peers
    lowestCost = MAX_INT;

    // Fetch an array of locators from the Indexer.
    bytes32[] memory locators = indexer.getIntents(
      _takerToken,
      _makerToken,
      _maxIntents
      );

    // Iterate through locators.
    for (uint256 i; i < locators.length; i++) {

      // Get a buy quote from the Peer.
      uint256 makerAmount = IPeer(address(bytes20(locators[i])))
        .getTakerSideQuote(_makerAmount, _makerToken, _takerToken);

      // Update the lowest cost.
      if (makerAmount > 0 && makerAmount < lowestCost) {
        peerLocator = locators[i];
        lowestCost = makerAmount;
      }
    }

    // Return the Peer address and amount.
    return (peerLocator, lowestCost);

  }

  function fillBestTakerSideOrder(
    uint256 _takerAmount,
    address _takerToken,
    address _makerToken,
    uint256 _maxIntents
  ) external {

    // Find the best buy among Indexed Peers.
    (bytes32 peerLocator, uint256 makerAmount) = getBestTakerSideQuote(_takerAmount, _takerToken, _makerToken, _maxIntents);

    // check if peerLocator exists
    require(peerLocator != bytes32(0), "NO_LOCATOR, BAILING");

    address peerContract = address(bytes20(peerLocator));

    // User transfers amount to the contract.
    IERC20(_makerToken).transferFrom(msg.sender, address(this), makerAmount);

    // PeerFrontend approves Swap to move its new tokens.
    IERC20(_makerToken).approve(address(swapContract), makerAmount);

    // PeerFrontend authorizes the Peer.
    swapContract.authorize(peerContract, block.timestamp + 1);

    // Consumer provides unsigned order to Peer.
    IPeer(peerContract).provideOrder(Types.Order(
      1,
      block.timestamp + 1,
      Types.Party(
        address(this), // consumer is acting as the maker in this case
        _makerToken,
        makerAmount,
        0x277f8169
      ),
      Types.Party(
        IPeer(peerContract).owner(),
        _takerToken,
        _takerAmount,
        0x277f8169
      ),
      Types.Party(address(0), address(0), 0, bytes4(0)),
      Types.Signature(address(0), 0, 0, 0, 0)
    ));

    // PeerFrontend revokes the authorization of the Peer.
    swapContract.revoke(peerContract);

    // PeerFrontend transfers received amount to the User.
    IERC20(_takerToken).transfer(msg.sender, _takerAmount);
  }

  function fillBestMakerSideOrder(
    uint256 _makerAmount,
    address _makerToken,
    address _takerToken,
    uint256 _maxIntents
  ) external {

    // Find the best buy among Indexed Peers.
    (bytes32 peerLocator, uint256 takerAmount) = getBestMakerSideQuote(_makerAmount, _makerToken, _takerToken, _maxIntents);

    // check if peerLocator exists
    require(peerLocator != bytes32(0), "NO_LOCATOR, BAILING");

    address peerContract = address(bytes20(peerLocator));

    // User transfers amount to the contract.
    IERC20(_makerToken).transferFrom(msg.sender, address(this), _makerAmount);

    // PeerFrontend approves Swap to move its new tokens.
    IERC20(_makerToken).approve(address(swapContract), _makerAmount);

    // PeerFrontend authorizes the Peer.
    swapContract.authorize(peerContract, block.timestamp + 1);

    // Consumer provides unsigned order to Peer.
    IPeer(peerContract).provideOrder(Types.Order(
      1,
      block.timestamp + 1,
      Types.Party(
        address(this), // consumer is acting as the maker in this case
        _makerToken,
        _makerAmount,
        0x277f8169
      ),
      Types.Party(
        IPeer(peerContract).owner(),
        _takerToken,
        takerAmount,
        0x277f8169
      ),
      Types.Party(address(0), address(0), 0, bytes4(0)),
      Types.Signature(address(0), 0, 0, 0, 0)
    ));

    // PeerFrontend revokes the authorization of the Peer.
    swapContract.revoke(peerContract);

    // PeerFrontend transfers received amount to the User.
    IERC20(_takerToken).transfer(msg.sender, takerAmount);
  }
}