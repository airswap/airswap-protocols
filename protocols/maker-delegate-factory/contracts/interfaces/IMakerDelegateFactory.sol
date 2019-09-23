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

interface IMakerDelegateFactory {

  event CreateMakerDelegate(address indexed makerDelegateContract, address swapContract, address indexed makerDelegateContractOwner);

  /**
    * @notice Deploy a trusted maker-delegate contract
    * @param _swapContract address of the swap contract the maker-delegate will deploy with
    * @param _makerDelegateContractOwner address that should be the owner of the maker-delegate
    * @return makerDelegateContractAddress address of the maker-delegate contract created
    */
  function createMakerDelegate(address _swapContract, address _makerDelegateContractOwner) external returns (address makerDelegateContractAddress);

}
