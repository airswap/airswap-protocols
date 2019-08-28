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
import "@airswap/indexer/contracts/interfaces/ILocatorWhitelist.sol";
import "@airswap/peer/contracts/interfaces/IPeerFactory.sol";

contract PeerFactory is IPeerFactory, ILocatorWhitelist {

  mapping(address => bool) internal deployedAddresses;

  /**
    * @notice Create a new Peer contract
    * @param _swapContract address of the swap contract the peer will deploy with
    * @param _peerContractOwner address that should be the owner of the peer
    * @return peerContractAddress address address of the peer contract created
    */
  function createPeer(address _swapContract, address _peerContractOwner) external returns (address peerContractAddress) {

    // Ensure an owner for the peer contract is provided.
    require(_peerContractOwner != address(0),
      'PEER_CONTRACT_OWNER_REQUIRED');

    // Ensure a swap contract is provided.
    require(_swapContract != address(0),
      'SWAP_CONTRACT_REQUIRED');

    address newPeerContract = address(new Peer(_swapContract, _peerContractOwner));
    deployedAddresses[newPeerContract] = true;

    emit CreatePeer(newPeerContract, _swapContract, _peerContractOwner);

    return newPeerContract;
  }

  /**
    * @notice To check whether a locator was deployed
    * @dev Implements ILocatorWhitelist.has
    * @param _locator locator of the peer in question
    * @return bool true if the peer was deployed by this contract
    */
  function has(bytes32 _locator) external returns (bool) {
    return deployedAddresses[address(bytes20(_locator))];
  }

}