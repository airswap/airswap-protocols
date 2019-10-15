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
import "@airswap/delegate-factory/contracts/interfaces/IDelegateFactory.sol";
import "@airswap/delegate/contracts/interfaces/IDelegate.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "@airswap/types/contracts/Types.sol";

contract DelegateManager is Ownable {

    event DelegateCreated(address owner, address delegate);

    //keeps track of all the delegates created by owner address
    mapping(address => address[]) private ownerToDelegates;
    IDelegateFactory public factory;

    constructor(IDelegateFactory _factory) public {
        factory = _factory;
    }

    function createDelegate(address _tradeWallet) external returns (IDelegate) {
      IDelegate delegate = IDelegate(factory.createDelegate(msg.sender, _tradeWallet));
      //NOTE: DelegateManager does not have access to the created Delegate by default
      ownerToDelegates[msg.sender].push(address(delegate));
      emit DelegateCreated(msg.sender, address(delegate));
      return delegate;
    }

    function getOwnerAddressToDelegates(address _owner) view external returns (address[] memory) {
      uint256 length = ownerToDelegates[_owner].length;
      address[] memory delegates = new address[](length);
      for(uint i = 0; i < length; i++) {
        delegates[i] = ownerToDelegates[_owner][i];
      }
      return delegates;
    }

    // NOTE: created delegate needs the manager to be an admin in order to act with it.
    function setRuleAndIntent(
      IDelegate _delegate,
      Types.Rule calldata _rule,
      Types.Intent calldata _intent,
      IIndexer _indexer
    ) external {

      _delegate.setRule(
        _rule.takerToken,
        _rule.makerToken,
        _rule.maxTakerAmount, 
        _rule.priceCoef,
        _rule.priceExp
      );

      _indexer.setIntent(
        _intent.makerToken,
        _intent.takerToken,
        _intent.amount,
        _intent.locator
      );
    }

    // NOTE: created delegate needs the manager to be an admin in order to act with it.
    function unsetRuleAndIntent(
      IDelegate _delegate,
      address _makerToken, 
      address _takerToken, 
      IIndexer _indexer
    ) external {
      _delegate.unsetRule(_takerToken, _makerToken);
      _indexer.unsetIntent(_makerToken, _takerToken);
    }

}
