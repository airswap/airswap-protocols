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
import "@airswap/structs/contracts/Structs.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

contract DelegateManager is Ownable {

    IDelegateFactory public factory;
    IDelegate public delegate;

    /**
      * @notice Constructor to create the Delegate Manager
      * @dev factory is unable to be changed after the DelegateManager is constructed
      * @param _factory address of the factory contract that will create the delegates
      * @param _tradeWallet the wallet that the delegate will be trading on behalf of
      */
    constructor(IDelegateFactory _factory, address _tradeWallet) public {
        factory = _factory;
        delegate = IDelegate(factory.createDelegate(msg.sender, _tradeWallet));
    }

    /**
      * @notice sets a rule on the delegate and an intent on the indexer
      * @dev delegate needs the manager to be an admin in order to act with it.
      * @dev manager needs to be given allowance from msg.sender for the _intent.amount
      * @dev delegate swap needs to be given permission to move funds from the manager
      * @param _rule the rule to set on a delegate
      * @param _intent the intent to set on an the indexer
      * @param _indexer the indexer the intent will be set on
      */
    function setRuleAndIntent(
      Structs.Rule calldata _rule,
      Structs.Intent calldata _intent,
      IIndexer _indexer
    ) external onlyOwner {
      
      //verify the rule and intent
      require(_rule.senderToken == _intent.senderToken, "SENDER_TOKEN_MISMATCH");
      require(_rule.signerToken == _intent.signerToken, "SIGNER_TOKEN_MISMATCH");

      delegate.setRule(
        _rule.senderToken,
        _rule.signerToken,
        _rule.maxSenderAmount, 
        _rule.priceCoef,
        _rule.priceExp
      );

      require(
        IERC20(_indexer.stakeToken())
        .allowance(msg.sender, address(this)) >= _intent.amount, "ALLOWANCE_FUNDS_ERROR"
      );
      require(
        IERC20(_indexer.stakeToken())
        .transferFrom(msg.sender, address(this), _intent.amount), "TRANSFER_FUNDS_ERROR"
      );

      //ensure that the indexer can pull funds from manager's account
      require(
        IERC20(_indexer.stakeToken())
        .approve(address(_indexer), _intent.amount), "APPROVAL_ERROR"
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
      * @param _senderToken the maker token in the token pair for rules and intents
      * @param _signerToken the taker token  in the token pair for rules and intents
      * @param _indexer the indexer to remove the intent from
      */
    function unsetRuleAndIntent(
      address _signerToken, 
      address _senderToken, 
      IIndexer _indexer
    ) external onlyOwner {

      delegate.unsetRule(_senderToken, _signerToken);

      //query against indexer for amount staked
      uint256 stakedAmount = _indexer.getScore(_signerToken, _senderToken, address(this));
      _indexer.unsetIntent(_signerToken, _senderToken);

      //upon unstaking the manager will be given the staking amount
      //push the staking amount to the msg.sender

      require(
        IERC20(_indexer.stakeToken())
          .transfer(msg.sender, stakedAmount),"TRANSFER_FUNDS_ERROR"
      );
    }
}
