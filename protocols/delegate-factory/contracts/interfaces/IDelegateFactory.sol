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

interface IDelegateFactory {

  event CreateDelegate(address indexed delegateContract, address swapContract, address indexed delegateContractOwner, address delegateTradeWallet);

  /**
    * @notice Deploy a trusted peer contract
    * @param _swapContract address of the swap contract the peer will deploy with
    * @param _delegateContractOwner address that should be the owner of the peer
    * @param _delegateTradeWallet the wallet the peer will trade from
    * @return delegateContractAddress address of the peer contract created
    */
  function createDelegate(
    address _swapContract,
    address _delegateContractOwner,
    address _delegalteTradeWallet
  ) external returns (address delegateContractAddress);

}
