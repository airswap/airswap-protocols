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

import "@airswap/peer/contracts/Peer.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract PeerFactory {

  mapping(address => bool) public trustedPeers;

  /**
    * @notice Deploy a trusted peer contract
    * @param initialSwapContract address of the swap contract the peer will deploy with
    * @param peerOwner address that should be the owner of the peer
    */
  function deployTrustedPeer(address initialSwapContract, address peerOwner) public returns (address) {
    require(peerOwner != address(0), 'Provide a peer owner');
    require(initialSwapContract != address(0), 'Provide a swap address');

    address newPeer = address(new Peer(initialSwapContract, peerOwner));
    trustedPeers[newPeer] = true;
    return newPeer;
  }

}