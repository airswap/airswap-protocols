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

import "@airswap/indexer/contracts/interfaces/IIndexer.sol";
import "@airswap/swap/contracts/interfaces/ISwap.sol";

/**
  * @title PeerFrontEnd: Onchain Liquidity provider for the Swap Protocol
  */
contract PeerFrontEnd {

    IIndexer indexer;
    ISwap swap;

	constructor(IIndexer _indexer, ISwap _swap) public {
        indexer = _indexer;
        swap = _swap;
	}

    function findBestBuy(uint256 _receiveAmount, address _receiveToken, address _sendToken, uint256 _maxIntents) external view returns (bytes32, uint256) {
        return (0, 0);
    }

    function findBestSell(uint256 _sendAmount, address _sendToken, address _receiveToken, uint256 _maxIntents) external view returns (bytes32, uint256) {
        return (0, 0);
    }

    function takeBestBuy(uint256 _receiveAmount, address _receiveToken, address _sendToken, uint256 _maxIntents) external {

    }

    function takeBestSell(uint256 _sendAmount, address _sendToken, address _receiveToken, uint256 _maxIntents) external {

    }
}