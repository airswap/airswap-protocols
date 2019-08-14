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

import "@airswap/peer/contracts/Peer.sol";
import "@airswap/indexer/interfaces/IWhitelist.sol";
import "@airswap/peer/interfaces/IPeerFactory.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract PeerFactory is IPeerFactory, IWhitelist {

  mapping(address => bool) internal factoryPeers;

  /**
    * @notice Deploy a trusted peer contract
    * @param _swapContract address of the swap contract the peer will deploy with
    * @param _peerOwner address that should be the owner of the peer
    */
  function createPeer(address _swapContract, address _peerOwner) external {
    require(_peerOwner != address(0), 'Provide a peer owner');
    require(_swapContract != address(0), 'Provide a swap address');

    address newPeer = address(new Peer(_swapContract, _peerOwner));
    factoryPeers[newPeer] = true;

    emit PeerCreated(newPeer, _swapContract, _peerOwner);
  }

  /**
    * @notice To check whether a locator is whitelisted
    * @param _locator locator of the peer in question
    * @return bool - true if the locator is whitelisted
    */
  function isWhitelisted(bytes32 _locator) external returns (bool) {
    return factoryPeers[address(bytes20(_locator))];
  }

}