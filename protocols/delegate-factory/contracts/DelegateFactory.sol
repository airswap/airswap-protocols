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

pragma solidity 0.5.12;

import "@airswap/delegate/contracts/Delegate.sol";
import "@airswap/swap/contracts/interfaces/ISwap.sol";
import "@airswap/indexer/contracts/interfaces/ILocatorWhitelist.sol";
import "@airswap/delegate-factory/contracts/interfaces/IDelegateFactory.sol";
import "@airswap/indexer/contracts/interfaces/IIndexer.sol";

contract DelegateFactory is IDelegateFactory, ILocatorWhitelist {

  mapping(address => bool) internal deployedAddresses;
  ISwap public swapContract;
  IIndexer public indexerContract;

  /**
    * @notice Create a new Delegate contract
    * @dev swapContract is unable to be changed after the factory sets it
    * @param _swapContract address The swap contract the delegate will deploy with
    * @param _indexerContract address The indexer contract the delegate will deploy with
    */
  constructor(ISwap _swapContract, IIndexer _indexerContract) public {
    // Ensure a swap contract is provided.
    require(address(_swapContract) != address(0),
      "SWAP_CONTRACT_REQUIRED");

    require(address(_indexerContract) != address(0),
      "INDEXER_CONTRACT_REQUIRED");

    swapContract = _swapContract;
    indexerContract = _indexerContract;
  }

  /**
    * @param _delegateContractOwner address The delegate owner
    * @param _delegateTradeWallet address The wallet the delegate will trade from
    * @return address delegateContractAddress The address of the delegate contract created
    */
  function createDelegate(
    address _delegateContractOwner,
    address _delegateTradeWallet
  ) external returns (address delegateContractAddress) {

    // Ensure an owner for the delegate contract is provided.
    require(_delegateContractOwner != address(0),
      "DELEGATE_CONTRACT_OWNER_REQUIRED");

    delegateContractAddress = address(
      new Delegate(swapContract, indexerContract, _delegateContractOwner, _delegateTradeWallet));
    deployedAddresses[delegateContractAddress] = true;

    emit CreateDelegate(
      delegateContractAddress,
      address(swapContract),
      address(indexerContract),
      _delegateContractOwner,
      _delegateTradeWallet
    );

    return delegateContractAddress;
  }

  /**
    * @notice To check whether a locator was deployed
    * @dev Implements ILocatorWhitelist.has
    * @param _locator bytes32 The locator of the delegate in question
    * @return bool True if the delegate was deployed by this contract
    */
  function has(bytes32 _locator) external view returns (bool) {
    return deployedAddresses[address(bytes20(_locator))];
  }

}
