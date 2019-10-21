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
import "@airswap/swap/contracts/interfaces/ISwap.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

/**
  * @title Delegate: Deployable Trading Rules for the Swap Protocol
  * @notice Supports fungible tokens (ERC-20)
  * @dev inherits IDelegate, Ownable uses SafeMath library
  */
contract Delegate is IDelegate, Ownable {
  using SafeMath for uint256;

  event AdminAdded(address indexed account);
  event AdminRemoved(address indexed account);

  // Swap contract to be used to settle trades
  ISwap public swapContract;

  // The address holding tokens that will be trading through this delegate
  address private _tradeWallet;

  // Mapping of senderToken to signerToken for rule lookup
  mapping (address => mapping (address => Types.Rule)) public rules;

  // Mapping of admin addresses that can call on behalf of owner
  mapping (address => bool) private admins;

  // ERC-20 (fungible token) interface identifier (ERC-165)
  bytes4 constant internal ERC20_INTERFACE_ID = 0x277f8169;

  /**
    * @dev only admin ensures that only admin parties can call the method it modifies
    */
  modifier onlyAdmin() {
    require(admins[msg.sender], "CALLER_MUST_BE_ADMIN");
    _;
  }

  /**
    * @notice Contract Constructor
    * @dev owner defaults to msg.sender if _delegateContractOwner is not provided
    * @param _swapContract address of the swap contract the delegate will deploy with
    * @param _delegateContractOwner address that should be the owner of the delegate
    * @param _delegateTradeWallet the wallet the delegate will trade from
    */
  constructor(
    ISwap _swapContract,
    address _delegateContractOwner,
    address _delegateTradeWallet
  ) public {
    swapContract = _swapContract;

    // if no delegate owner is provided, the deploying address is the owner
    if (_delegateContractOwner != address(0)) {
      transferOwnership(_delegateContractOwner);
    }

    // if no trade wallet is provided, the owner's wallet is the trade wallet
    if (_delegateTradeWallet != address(0)) {
      _tradeWallet = _delegateTradeWallet;
    } else {
      _tradeWallet = owner();
    }

    //owner must always be added to the whitelist
    admins[owner()] = true;
  }

  /**
    * @notice determines if an address to interact with this delegate
    * @param _addressToCheck the address to check if admin or not
    */
  function isAdmin(address _addressToCheck) view external returns (bool) {
    return admins[_addressToCheck];
  }

  /**
    * @notice adds to the list of admin accounts that can interact with this delegate
    * @dev only callable by the owner of the contract
    * @param _addressToAdd the address to add to the admins
    */
  function addAdmin(address _addressToAdd) external onlyOwner {
    admins[_addressToAdd] = true;
    emit AdminAdded(_addressToAdd);
  }

  /**
    * @notice removes from the list of admin accounts that can interact with this delegate
    * @dev only callable by the owner of the contract
    * @param _addressToRemove the address to add to the admins
    */
  function removeAdmin(address _addressToRemove) external onlyOwner {
    require(_addressToRemove != owner(), "OWNER_MUST_BE_ADMIN");
    delete admins[_addressToRemove];
    emit AdminRemoved(_addressToRemove);
  }

  /**
    * @notice transfers ownership to the new owner and ensures that admins is updated
    * @dev only callable by the owner of the contract
    * @param _newOwner the address of the new owner of the contract
    */
  function transferOwnership(address _newOwner) public onlyOwner {
    require(_newOwner != address(0), 'DELEGATE_CONTRACT_OWNER_REQUIRED');
    admins[_newOwner] = true;
    admins[owner()] = false;
    super.transferOwnership(_newOwner);
  }

  /**
    * @notice Set a Trading Rule
    * @dev only callable by the owner of the contract
    * @dev 1 senderToken = priceCoef * 10^(-priceExp) * signerToken
    * @param _senderToken address The address of an ERC-20 token the delegate would send
    * @param _signerToken address The address of an ERC-20 token the consumer would send
    * @param _rule Rule The rule explaining the trade wanting to be set. Constructed of:
    * @dev maxSenderAmount: uint256 The maximum amount of ERC-20 token the delegate would send
    * @dev priceCoef: uint256 The whole number that will be multiplied by 10^(-priceExp) - the price coefficient
    * @dev priceExp: uint256 The exponent of the price to indicate location of the decimal priceCoef * 10^(-priceExp)
    */
  function setRule(
    address _senderToken,
    address _signerToken,
    Types.Rule calldata _rule
  ) external onlyAdmin {

    rules[_senderToken][_signerToken] = _rule;

    emit SetRule(
      _senderToken,
      _signerToken,
      _rule.maxSenderAmount,
      _rule.priceCoef,
      _rule.priceExp
    );
  }

  /**
    * @notice Unset a Trading Rule
    * @dev only callable by the owner of the contract, removes from a mapping
    * @param _senderToken address The address of an ERC-20 token the delegate would send
    * @param _signerToken address The address of an ERC-20 token the consumer would send
    */
  function unsetRule(
    address _senderToken,
    address _signerToken
  ) external onlyAdmin {

    // Delete the rule.
    delete rules[_senderToken][_signerToken];

    emit UnsetRule(
      _senderToken,
      _signerToken
    );
  }

  /**
    * @notice Get a Signer-Side Quote from the Delegate
    * @param _senderParam uint256 The amount of ERC-20 token the delegate would send
    * @param _senderToken address The address of an ERC-20 token the delegate would send
    * @param _signerToken address The address of an ERC-20 token the consumer would send
    * @return uint256 signerParam The amount of ERC-20 token the consumer would send
    */
  function getSignerSideQuote(
    uint256 _senderParam,
    address _senderToken,
    address _signerToken
  ) external view returns (
    uint256 signerParam
  ) {

    Types.Rule memory rule = rules[_senderToken][_signerToken];

    // Ensure that a rule exists.
    if(rule.maxSenderAmount > 0) {

      // Ensure the _senderParam does not exceed maximum for the rule.
      if(_senderParam <= rule.maxSenderAmount) {

        signerParam = _senderParam
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
    * @param _signerParam uint256 The amount of ERC-20 token the consumer would send
    * @param _signerToken address The address of an ERC-20 token the consumer would send
    * @param _senderToken address The address of an ERC-20 token the delegate would send
    * @return uint256 senderParam The amount of ERC-20 token the delegate would send
    */
  function getSenderSideQuote(
    uint256 _signerParam,
    address _signerToken,
    address _senderToken
  ) external view returns (
    uint256 senderParam
  ) {

    Types.Rule memory rule = rules[_senderToken][_signerToken];

    // Ensure that a rule exists.
    if(rule.maxSenderAmount > 0) {

      // Calculate the _senderParam.
      senderParam = _signerParam
        .mul(10 ** rule.priceExp).div(rule.priceCoef);

      // Ensure the senderParam does not exceed maximum and is greater than zero.
      if(senderParam <= rule.maxSenderAmount) {
        return senderParam;
      }
    }
    return 0;
  }

  /**
    * @notice Get a Maximum Quote from the Delegate
    * @param _senderToken address The address of an ERC-20 token the delegate would send
    * @param _signerToken address The address of an ERC-20 token the consumer would send
    * @return uint256 senderParam The amount the delegate would send
    * @return uint256 signerParam The amount the consumer would send
    */
  function getMaxQuote(
    address _senderToken,
    address _signerToken
  ) external view returns (
    uint256 senderParam,
    uint256 signerParam
  ) {

    Types.Rule memory rule = rules[_senderToken][_signerToken];

    // Ensure that a rule exists.
    if(rule.maxSenderAmount > 0) {

      // Return the maxSenderAmount and calculated _signerParam.
      return (
        rule.maxSenderAmount,
        rule.maxSenderAmount.mul(rule.priceCoef).div(10 ** rule.priceExp)
      );
    }
    return (0, 0);
  }

  /**
    * @notice Provide an Order
    * @dev Rules get reset with new maxSenderAmount
    * @param _order Types.Order
    */
  function provideOrder(
    Types.Order calldata _order
  ) external {

    Types.Rule memory rule = rules[_order.sender.token][_order.signer.token];

    require(_order.signer.wallet == msg.sender,
      "SIGNER_MUST_BE_SENDER");

    require(_order.sender.wallet == _tradeWallet,
      "INVALID_SENDER_WALLET");

    require(_order.signer.kind == ERC20_INTERFACE_ID,
      "SIGNER_KIND_MUST_BE_ERC20");

    require(_order.sender.kind == ERC20_INTERFACE_ID,
      "SENDER_KIND_MUST_BE_ERC20");

    // Ensure that a rule exists.
    require(rule.maxSenderAmount != 0,
      "TOKEN_PAIR_INACTIVE");

    // Ensure the order does not exceed the maximum amount.
    require(_order.sender.param <= rule.maxSenderAmount,
      "AMOUNT_EXCEEDS_MAX");

    // Ensure the order is priced according to the rule.
    require(_order.sender.param == _order.signer.param
      .mul(10 ** rule.priceExp).div(rule.priceCoef),
      "PRICE_INCORRECT");

    // Overwrite the rule with a decremented maxSenderAmount.
    rules[_order.sender.token][_order.signer.token] = Types.Rule({
      maxSenderAmount: (rule.maxSenderAmount).sub(_order.sender.param),
      priceCoef: rule.priceCoef,
      priceExp: rule.priceExp
    });

    // Perform the swap.
    swapContract.swap(_order);
  }

  /**
    * @notice Set a new trade wallet
    * @param _newTradeWallet address The address of the new trade wallet
    */
  function setTradeWallet(address _newTradeWallet) external onlyOwner {
    require(_newTradeWallet != address(0), 'TRADE_WALLET_REQUIRED');
    _tradeWallet = _newTradeWallet;
  }

  /**
    * @notice Get the trade wallet address
    */
  function tradeWallet() external view returns (address) {
    return _tradeWallet;
  }
}
