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

    /**
      * @dev factory is unable to be changed after the DelegateManager is constructed
      * @param _factory address of the factory contract that will create the delegates
      */
    constructor(IDelegateFactory _factory) public {
        factory = _factory;
    }

    /**
      * @notice Creates a new Delegate contract using the Factory contract, 
      * saves deployed address to msg.sender list of deployed addresses
      * @dev DelegateManager does not have access to the created Delegate by default
      * @param _tradeWallet the wallet that the delegate will be trading on behalf of
      * @return IDelegate the Delegate created by the factory
      */
    function createDelegate(address _tradeWallet) external returns (IDelegate) {
      IDelegate delegate = IDelegate(factory.createDelegate(msg.sender, _tradeWallet));
      ownerToDelegates[msg.sender].push(address(delegate));
      emit DelegateCreated(msg.sender, address(delegate));
      return delegate;
    }

    /**
      * @notice gets all the delegates for an owner
      * @param _owner the owner to look up addresses for
      * @return address[] memory the list of the delegates for an owner
      */ 
    function getOwnerAddressToDelegates(address _owner) view external returns (address[] memory) {
      uint256 length = ownerToDelegates[_owner].length;
      address[] memory delegates = new address[](length);
      for(uint i = 0; i < length; i++) {
        delegates[i] = ownerToDelegates[_owner][i];
      }
      return delegates;
    }

    /**
      * @notice sets a rule on the delegate and an intent on the indexer
      * @dev delegate needs the manager to be an admin in order to act with it.
      * @param _delegate the delegate that a rule will be set on
      * @param _rule the rule to set on a delegate
      * @param _intent the intent to set on an the indexer
      * @param _indexer the indexer the intent will be set on
      */
    function setRuleAndIntent(
      IDelegate _delegate,
      Types.Rule calldata _rule,
      Types.Intent calldata _intent,
      IIndexer _indexer
    ) external {

      _delegate.setRule(
        _rule.senderToken,
        _rule.signerToken,
        _rule.maxSenderAmount, 
        _rule.priceCoef,
        _rule.priceExp
      );

      _indexer.setIntent(
        _intent.signerToken,
        _intent.senderToken,
        _intent.amount,
        _intent.locator
      );
    }

    /**
      * @notice unsets a rule on the delegate and removes an intent on the indexer
      * @dev delegate needs the manager to be an admin in order to act with it.
      * @param _delegate the delegate that a rule will be unset on
      * @param _senderToken the maker token in the token pair for rules and intents
      * @param _signerToken the taker token  in the token pair for rules and intents
      * @param _indexer the indexer to remove the intent from
      */
    function unsetRuleAndIntent(
      IDelegate _delegate,
      address _senderToken, 
      address _signerToken, 
      IIndexer _indexer
    ) external {
      _delegate.unsetRule(_signerToken, _senderToken);
      _indexer.unsetIntent(_senderToken, _signerToken);
    }

}
