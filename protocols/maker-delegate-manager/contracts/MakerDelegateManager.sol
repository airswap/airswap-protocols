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

import "@airswap/indexer/contracts/interfaces/IIndexer.sol";
import "@airswap/swap/contracts/interfaces/ISwap.sol";
import "@airswap/maker-delegate-factory/contracts/interfaces/IMakerDelegateFactory.sol";
import "@airswap/maker-delegate/contracts/interfaces/IMakerDelegate.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "@airswap/types/contracts/Types.sol";

contract MakerDelegateManager is Ownable {

    //keeps track of all the delegates created by a maker
    mapping(address => address[]) makerAddressToDelegate;
    IMakerDelegateFactory public factory;

    constructor(IMakerDelegateFactory _factory) public {
        factory = _factory;
    }

    function createMakerDelegate(ISwap _swapContract) external returns (IMakerDelegate) {
        require(_swapContract != address(0), "SWAP_ADDRESS_REQUIRED");
        IMakerDelegate makerDelegate = IMakerDelegate(factory.createMakerDelegate(_swapContract, msg.sender));
        makerAddressToDelegate[msg.sender].push(makerDelegate.address);
        return makerDelegate;
    }

    function setRuleAndIntent(IMakerDelegate _makerDelegate) external {
    }

    function unsetRuleAndIntent(IMakerDelegate _makerDelegate) external {
    }

}
