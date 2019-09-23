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

import "@airswap/maker-delegate/contracts/MakerDelegate.sol";
import "@airswap/indexer/contracts/interfaces/ILocatorWhitelist.sol";
import "@airswap/maker-delegate-factory/contracts/interfaces/IMakerDelegateFactory.sol";

contract MakerDelegateFactory is IMakerDelegateFactory, ILocatorWhitelist {

  mapping(address => bool) internal deployedAddresses;

  /**
    * @notice Create a new MakerDelegate contract
    * @param _swapContract address of the swap contract the maker-delegate will deploy with
    * @param _makerDelegateContractOwner address that should be the owner of the maker-delegate
    * @return makerDelegateContractAddress address address of the maker-delegate contract created
    */
  function createMakerDelegate(address _swapContract, address _makerDelegateContractOwner) external returns (address makerDelegateContractAddress) {

    // Ensure an owner for the maker-delegate contract is provided.
    require(_makerDelegateContractOwner != address(0),
      'PEER_CONTRACT_OWNER_REQUIRED');

    // Ensure a swap contract is provided.
    require(_swapContract != address(0),
      'SWAP_CONTRACT_REQUIRED');

    makerDelegateContractAddress = address(new MakerDelegate(_swapContract, _makerDelegateContractOwner));
    deployedAddresses[makerDelegateContractAddress] = true;

    emit CreateMakerDelegate(makerDelegateContractAddress, _swapContract, _makerDelegateContractOwner);

    return makerDelegateContractAddress;
  }

  /**
    * @notice To check whether a locator was deployed
    * @dev Implements ILocatorWhitelist.has
    * @param _locator locator of the maker-delegate in question
    * @return bool true if the maker-delegate was deployed by this contract
    */
  function has(bytes32 _locator) external view returns (bool) {
    return deployedAddresses[address(bytes20(_locator))];
  }

}
