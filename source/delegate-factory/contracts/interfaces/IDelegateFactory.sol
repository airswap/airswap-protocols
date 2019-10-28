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

interface IDelegateFactory {

  event CreateDelegate(
    address indexed delegateContract,
    address swapContract,
    address indexerContract,
    address indexed delegateContractOwner,
    address delegateTradeWallet
  );

  /**
    * @notice Deploy a trusted delegate contract
    * @param delegateContractOwner address that should be the owner of the delegate
    * @param delegateTradeWallet the wallet the delegate will trade from
    * @return delegateContractAddress address of the delegate contract created
    */
  function createDelegate(
    address delegateContractOwner,
    address delegateTradeWallet
  ) external returns (address delegateContractAddress);
}
