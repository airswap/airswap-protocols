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
pragma experimental ABIEncoderV2;

import "@airswap/delegate/contracts/interfaces/IDelegate.sol";
import "@airswap/indexer/contracts/interfaces/IIndexer.sol";
import "@airswap/swap/contracts/interfaces/ISwap.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";


/**
  * @title Delegate: Deployable Trading Rules for the Swap Protocol
  * @notice Supports fungible tokens (ERC-20)
  * @dev inherits IDelegate, Ownable uses SafeMath library
  */
contract Delegate is IDelegate, Ownable {
  using SafeMath for uint256;

  // The Swap contract to be used to settle trades
  ISwap public swapContract;

  // The Indexer to stake intent to trade on
  IIndexer public indexer;

  // Maximum integer for token transfer approval
  uint256 constant internal MAX_INT =  2**256 - 1;

  // Address holding tokens that will be trading through this delegate
  address public tradeWallet;

  // Mapping of senderToken to signerToken for rule lookup
  mapping (address => mapping (address => Rule)) public rules;

  // ERC-20 (fungible token) interface identifier (ERC-165)
  bytes4 constant internal ERC20_INTERFACE_ID = 0x277f8169;

  /**
    * @notice Contract Constructor
    * @dev owner defaults to msg.sender if delegateContractOwner is provided as address(0)
    * @param delegateSwap address Swap contract the delegate will deploy with
    * @param delegateIndexer address Indexer contract the delegate will deploy with
    * @param delegateContractOwner address Owner of the delegate
    * @param delegateTradeWallet address Wallet the delegate will trade from
    */
  constructor(
    ISwap delegateSwap,
    IIndexer delegateIndexer,
    address delegateContractOwner,
    address delegateTradeWallet
  ) public {
    swapContract = delegateSwap;
    indexer = delegateIndexer;

    // If no delegate owner is provided, the deploying address is the owner.
    if (delegateContractOwner != address(0)) {
      transferOwnership(delegateContractOwner);
    }

    // If no trade wallet is provided, the owner's wallet is the trade wallet.
    if (delegateTradeWallet != address(0)) {
      tradeWallet = delegateTradeWallet;
    } else {
      tradeWallet = owner();
    }

    // Ensure that the indexer can pull funds from delegate account.
    require(
      IERC20(indexer.stakingToken())
      .approve(address(indexer), MAX_INT), "STAKING_APPROVAL_FAILED"
    );
  }

  /**
    * @notice Set a Trading Rule
    * @dev only callable by the owner of the contract
    * @dev 1 senderToken = priceCoef * 10^(-priceExp) * signerToken
    * @param senderToken address Address of an ERC-20 token the delegate would send
    * @param signerToken address Address of an ERC-20 token the consumer would send
    * @param maxSenderAmount uint256 Maximum amount of ERC-20 token the delegate would send
    * @param priceCoef uint256 Whole number that will be multiplied by 10^(-priceExp) - the price coefficient
    * @param priceExp uint256 Exponent of the price to indicate location of the decimal priceCoef * 10^(-priceExp)
    */
  function setRule(
    address senderToken,
    address signerToken,
    uint256 maxSenderAmount,
    uint256 priceCoef,
    uint256 priceExp
  ) external onlyOwner {
    _setRule(
      senderToken,
      signerToken,
      maxSenderAmount,
      priceCoef,
      priceExp
    );
  }

  /**
    * @notice Unset a Trading Rule
    * @dev only callable by the owner of the contract, removes from a mapping
    * @param senderToken address Address of an ERC-20 token the delegate would send
    * @param signerToken address Address of an ERC-20 token the consumer would send
    */
  function unsetRule(
    address senderToken,
    address signerToken
  ) external onlyOwner {
    _unsetRule(
      senderToken,
      signerToken
    );
  }

  /**
    * @notice sets a rule on the delegate and an intent on the indexer
    * @dev only callable by owner
    * @dev delegate needs to be given allowance from msg.sender for the amountToStake
    * @dev swap needs to be given permission to move funds from the delegate
    * @param senderToken address Token the delgeate will send
    * @param senderToken address Token the delegate will receive
    * @param rule Rule Rule to set on a delegate
    * @param amountToStake uint256 Amount to stake for an intent
    */
  function setRuleAndIntent(
    address senderToken,
    address signerToken,
    Rule calldata rule,
    uint256 amountToStake
  ) external onlyOwner {
    _setRule(
      senderToken,
      signerToken,
      rule.maxSenderAmount,
      rule.priceCoef,
      rule.priceExp
    );

    // Transfer the staking tokens from the sender to the Delegate.
    if (amountToStake > 0) {
      require(
        IERC20(indexer.stakingToken())
        .transferFrom(msg.sender, address(this), amountToStake), "STAKING_TRANSFER_FAILED"
      );
    }

    indexer.setIntent(
      signerToken,
      senderToken,
      amountToStake,
      bytes32(uint256(address(this)) << 96) //NOTE: this will pad 0's to the right
    );
  }

  /**
    * @notice unsets a rule on the delegate and removes an intent on the indexer
    * @dev only callable by owner
    * @param senderToken address Maker token in the token pair for rules and intents
    * @param signerToken address Taker token  in the token pair for rules and intents
    */
  function unsetRuleAndIntent(
    address senderToken,
    address signerToken
  ) external onlyOwner {

    _unsetRule(senderToken, signerToken);

    // Query the indexer for the amount staked.
    uint256 stakedAmount = indexer.getStakedAmount(address(this), signerToken, senderToken);
    indexer.unsetIntent(signerToken, senderToken);

    // Upon unstaking, the Delegate will be given the staking amount.
    // This is returned to the msg.sender.
    if (stakedAmount > 0) {
      require(
        IERC20(indexer.stakingToken())
          .transfer(msg.sender, stakedAmount),"STAKING_TRANSFER_FAILED"
      );
    }
  }

  /**
    * @notice Provide an Order
    * @dev Rules get reset with new maxSenderAmount
    * @param order Types.Order Order a user wants to submit to Swap.
    */
  function provideOrder(
    Types.Order calldata order
  ) external {

    Rule memory rule = rules[order.sender.token][order.signer.token];

    require(order.signer.wallet == msg.sender,
      "SIGNER_MUST_BE_SENDER");

    // Ensure the order is for the trade wallet.
    require(order.sender.wallet == tradeWallet,
      "INVALID_SENDER_WALLET");

    // Ensure the tokens are valid ERC20 tokens.
    require(order.signer.kind == ERC20_INTERFACE_ID,
      "SIGNER_KIND_MUST_BE_ERC20");

    require(order.sender.kind == ERC20_INTERFACE_ID,
      "SENDER_KIND_MUST_BE_ERC20");

    // Ensure that a rule exists.
    require(rule.maxSenderAmount != 0,
      "TOKEN_PAIR_INACTIVE");

    // Ensure the order does not exceed the maximum amount.
    require(order.sender.param <= rule.maxSenderAmount,
      "AMOUNT_EXCEEDS_MAX");

    // Ensure the order is priced according to the rule.
    require(order.sender.param == order.signer.param
      .mul(10 ** rule.priceExp).div(rule.priceCoef),
      "PRICE_INCORRECT");

    // Overwrite the rule with a decremented maxSenderAmount.
    rules[order.sender.token][order.signer.token] = Rule({
      maxSenderAmount: (rule.maxSenderAmount).sub(order.sender.param),
      priceCoef: rule.priceCoef,
      priceExp: rule.priceExp
    });

    // Perform the swap.
    swapContract.swap(order);

    emit ProvideOrder(
      owner(),
      tradeWallet,
      order.sender.token,
      order.signer.token,
      order.sender.param,
      rule.priceCoef,
      rule.priceExp
    );
  }

  /**
    * @notice Set a new trade wallet
    * @param newTradeWallet address Address of the new trade wallet
    */
  function setTradeWallet(address newTradeWallet) external onlyOwner {
    require(newTradeWallet != address(0), "TRADE_WALLET_REQUIRED");
    tradeWallet = newTradeWallet;
  }

  /**
    * @notice Get a Signer-Side Quote from the Delegate
    * @param senderParam uint256 Amount of ERC-20 token the delegate would send
    * @param senderToken address Address of an ERC-20 token the delegate would send
    * @param signerToken address Address of an ERC-20 token the consumer would send
    * @return uint256 signerParam Amount of ERC-20 token the consumer would send
    */
  function getSignerSideQuote(
    uint256 senderParam,
    address senderToken,
    address signerToken
  ) external view returns (
    uint256 signerParam
  ) {

    Rule memory rule = rules[senderToken][signerToken];

    // Ensure that a rule exists.
    if(rule.maxSenderAmount > 0) {

      // Ensure the senderParam does not exceed maximum for the rule.
      if(senderParam <= rule.maxSenderAmount) {

        signerParam = senderParam
            .mul(rule.priceCoef)
            .div(10 ** rule.priceExp);

        // Return the quote.
        return signerParam;
      }
    }
    return 0;
  }

  /**
    * @notice Get a Sender-Side Quote from the Delegate
    * @param signerParam uint256 Amount of ERC-20 token the consumer would send
    * @param signerToken address Address of an ERC-20 token the consumer would send
    * @param senderToken address Address of an ERC-20 token the delegate would send
    * @return uint256 senderParam Amount of ERC-20 token the delegate would send
    */
  function getSenderSideQuote(
    uint256 signerParam,
    address signerToken,
    address senderToken
  ) external view returns (
    uint256 senderParam
  ) {

    Rule memory rule = rules[senderToken][signerToken];

    // Ensure that a rule exists.
    if(rule.maxSenderAmount > 0) {

      // Calculate the senderParam.
      senderParam = signerParam
        .mul(10 ** rule.priceExp).div(rule.priceCoef);

      // Ensure the senderParam does not exceed the maximum trade amount.
      if(senderParam <= rule.maxSenderAmount) {
        return senderParam;
      }
    }
    return 0;
  }

  /**
    * @notice Get a Maximum Quote from the Delegate
    * @param senderToken address Address of an ERC-20 token the delegate would send
    * @param signerToken address Address of an ERC-20 token the consumer would send
    * @return uint256 senderParam Amount the delegate would send
    * @return uint256 signerParam Amount the consumer would send
    */
  function getMaxQuote(
    address senderToken,
    address signerToken
  ) external view returns (
    uint256 senderParam,
    uint256 signerParam
  ) {

    Rule memory rule = rules[senderToken][signerToken];

    // Ensure that a rule exists.
    if(rule.maxSenderAmount > 0) {

      // Return the maxSenderAmount and calculated signerParam.
      return (
        rule.maxSenderAmount,
        rule.maxSenderAmount.mul(rule.priceCoef).div(10 ** rule.priceExp)
      );
    }
    return (0, 0);
  }

  /**
    * @notice Set a Trading Rule
    * @dev only callable by the owner of the contract
    * @dev 1 senderToken = priceCoef * 10^(-priceExp) * signerToken
    * @param senderToken address Address of an ERC-20 token the delegate would send
    * @param signerToken address Address of an ERC-20 token the consumer would send
    * @param maxSenderAmount uint256 Maximum amount of ERC-20 token the delegate would send
    * @param priceCoef uint256 Whole number that will be multiplied by 10^(-priceExp) - the price coefficient
    * @param priceExp uint256 Exponent of the price to indicate location of the decimal priceCoef * 10^(-priceExp)
    */
  function _setRule(
    address senderToken,
    address signerToken,
    uint256 maxSenderAmount,
    uint256 priceCoef,
    uint256 priceExp
  ) internal {
    rules[senderToken][signerToken] = Rule({
      maxSenderAmount: maxSenderAmount,
      priceCoef: priceCoef,
      priceExp: priceExp
    });

    emit SetRule(
      owner(),
      senderToken,
      signerToken,
      maxSenderAmount,
      priceCoef,
      priceExp
    );
  }

  /**
    * @notice Unset a Trading Rule
    * @dev only callable by the owner of the contract, removes from a mapping
    * @param senderToken address Address of an ERC-20 token the delegate would send
    * @param signerToken address Address of an ERC-20 token the consumer would send
    */
  function _unsetRule(
    address senderToken,
    address signerToken
  ) internal {

    // Delete the rule.
    delete rules[senderToken][signerToken];

    emit UnsetRule(
      owner(),
      senderToken,
      signerToken
    );
  }
}
