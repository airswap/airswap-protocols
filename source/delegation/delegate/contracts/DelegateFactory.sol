/*
  Copyright 2020 Swap Holdings Ltd.

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

pragma solidity 0.5.16;

import "./Delegate.sol";
import "./interfaces/IDelegateFactory.sol";
import "@airswap/swap/contracts/interfaces/ISwap.sol";
import "@airswap/indexer/contracts/interfaces/ILocatorWhitelist.sol";
import "@airswap/indexer/contracts/interfaces/IIndexer.sol";

contract DelegateFactory is IDelegateFactory, ILocatorWhitelist {
  // Mapping specifying whether an address was deployed by this factory
  mapping(address => bool) internal _deployedAddresses;

  // The swap and indexer contracts to use in the deployment of Delegates
  ISwap public swapContract;
  IIndexer public indexerContract;
  bytes2 public protocol;

  /**
   * @notice Create a new DelegateFactory contract
   * @dev swapContract is unable to be changed after the factory sets it
   * @param factorySwapContract address Swap contract the delegate will deploy with
   * @param factoryIndexerContract address Indexer contract the delegate will deploy with
   * @param factoryProtocol bytes2 Protocol type of the delegates the factory deploys
   */
  constructor(
    ISwap factorySwapContract,
    IIndexer factoryIndexerContract,
    bytes2 factoryProtocol
  ) public {
    swapContract = factorySwapContract;
    indexerContract = factoryIndexerContract;
    protocol = factoryProtocol;
  }

  /**
   * @param delegateTradeWallet address Wallet the delegate will trade from
   * @return address delegateContractAddress Address of the delegate contract created
   */
  function createDelegate(address delegateTradeWallet)
    external
    returns (address delegateContractAddress)
  {
    delegateContractAddress = address(
      new Delegate(
        swapContract,
        indexerContract,
        msg.sender,
        delegateTradeWallet,
        protocol
      )
    );
    _deployedAddresses[delegateContractAddress] = true;

    emit CreateDelegate(
      delegateContractAddress,
      address(swapContract),
      address(indexerContract),
      msg.sender,
      delegateTradeWallet
    );

    return delegateContractAddress;
  }

  /**
   * @notice To check whether a locator was deployed
   * @dev Implements ILocatorWhitelist.has
   * @param locator bytes32 Locator of the delegate in question
   * @return bool True if the delegate was deployed by this contract
   */
  function has(bytes32 locator) external view returns (bool) {
    return _deployedAddresses[address(bytes20(locator))];
  }
}
