// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import "./interfaces/IDelegate.sol";
import "@airswap/swap-erc20/contracts/interfaces/ISwapERC20.sol";
import { Ownable } from "solady/src/auth/Ownable.sol";
import { SafeTransferLib } from "solady/src/utils/SafeTransferLib.sol";

/**
 * @title AirSwap: Delegated On-chain Trading Rules
 * @notice Supports ERC-20 tokens
 * @dev inherits IDelegate, Ownable; uses SafeTransferLib
 */
contract Delegate is IDelegate, Ownable {
  // The SwapERC20 contract to be used to execute orders
  ISwapERC20 public swapERC20Contract;

  // Mapping of senderWallet to senderToken to to signerToken to Rule
  mapping(address => mapping(address => mapping(address => Rule))) public rules;

  // Mapping of senderWallet to an authorized manager
  mapping(address => address) public authorized;

  /**
   * @notice Constructor
   * @param _swapERC20Contract address
   */
  constructor(address _swapERC20Contract) {
    _initializeOwner(msg.sender);
    swapERC20Contract = ISwapERC20(_swapERC20Contract);
  }

  /**
   * @notice Set a Rule
   * @param _senderWallet address Address of the delegating sender wallet
   * @param _senderToken address ERC-20 token the sender would transfer
   * @param _senderAmount uint256 Maximum sender amount for the rule
   * @param _signerToken address ERC-20 token the signer would transfer
   * @param _signerAmount uint256 Maximum signer amount for the rule
   * @param _expiry uint256 Expiry in seconds since 1 January 1970
   */
  function setRule(
    address _senderWallet,
    address _senderToken,
    uint256 _senderAmount,
    address _signerToken,
    uint256 _signerAmount,
    uint256 _expiry
  ) external {
    if (authorized[_senderWallet] != address(0)) {
      // If an authorized manager is set, message sender must be the manager
      if (msg.sender != authorized[_senderWallet]) revert SenderInvalid();
    } else {
      // Otherwise message sender must be the sender wallet
      if (msg.sender != _senderWallet) revert SenderInvalid();
    }

    // Set the rule. Overwrites an existing rule.
    rules[_senderWallet][_senderToken][_signerToken] = Rule(
      _senderWallet,
      _senderToken,
      _senderAmount,
      0,
      _signerToken,
      _signerAmount,
      _expiry
    );

    // Emit a SetRule event
    emit SetRule(
      _senderWallet,
      _senderToken,
      _senderAmount,
      _signerToken,
      _signerAmount,
      _expiry
    );
  }

  /**
   * @notice Unset a Rule
   * @param _senderWallet address Address of the delegating sender wallet
   * @param _senderToken address ERC-20 token the sender would transfer
   * @param _signerToken address ERC-20 token the signer would transfer
   */
  function unsetRule(
    address _senderWallet,
    address _senderToken,
    address _signerToken
  ) external {
    if (authorized[_senderWallet] != address(0)) {
      // If an authorized manager is set, the message sender must be the manager
      if (msg.sender != authorized[_senderWallet]) revert SenderInvalid();
    } else {
      // Otherwise the message sender must be the sender wallet
      if (msg.sender != _senderWallet) revert SenderInvalid();
    }

    // Delete the rule
    delete rules[_senderWallet][_senderToken][_signerToken];

    // Emit an UnsetRule event
    emit UnsetRule(_senderWallet, _senderToken, _signerToken);
  }

  /**
   * @notice Perform an atomic ERC-20 swap
   * @dev Forwards to underlying SwapERC20 contract
   * @param _senderWallet address Wallet to receive sender proceeds
   * @param _nonce uint256 Unique and should be sequential
   * @param _expiry uint256 Expiry in seconds since 1 January 1970
   * @param _signerWallet address Wallet of the signer
   * @param _signerToken address ERC-20 token transferred from the signer
   * @param _signerAmount uint256 Amount transferred from the signer
   * @param _senderToken address ERC-20 token transferred from the sender
   * @param _senderAmount uint256 Amount transferred from the sender
   * @param _v uint8 "v" value of the ECDSA signature
   * @param _r bytes32 "r" value of the ECDSA signature
   * @param _s bytes32 "s" value of the ECDSA signature
   */
  function swap(
    address _senderWallet,
    uint256 _nonce,
    uint256 _expiry,
    address _signerWallet,
    address _signerToken,
    uint256 _signerAmount,
    address _senderToken,
    uint256 _senderAmount,
    uint8 _v,
    bytes32 _r,
    bytes32 _s
  ) external {
    Rule storage rule = rules[_senderWallet][_senderToken][_signerToken];
    // Ensure the expiry is not passed
    if (rule.expiry <= block.timestamp) revert RuleExpiredOrDoesNotExist();

    // Ensure the sender amount is valid
    if (_senderAmount > (rule.senderAmount - rule.senderFilledAmount)) {
      revert SenderAmountInvalid();
    }

    // Ensure the signer amount is valid
    if (
      rule.signerAmount * _senderAmount != rule.senderAmount * _signerAmount
    ) {
      revert SignerAmountInvalid();
    }

    // Transfer the sender token to this contract
    SafeTransferLib.safeTransferFrom(
      _senderToken,
      _senderWallet,
      address(this),
      _senderAmount
    );

    // Approve the SwapERC20 contract to transfer the sender token
    SafeTransferLib.safeApprove(
      _senderToken,
      address(swapERC20Contract),
      _senderAmount
    );

    // Execute the swap
    swapERC20Contract.swapLight(
      _nonce,
      _expiry,
      _signerWallet,
      _signerToken,
      _signerAmount,
      _senderToken,
      _senderAmount,
      _v,
      _r,
      _s
    );

    // Transfer the signer token to the sender wallet
    SafeTransferLib.safeTransfer(_signerToken, _senderWallet, _signerAmount);

    // Update the filled amount
    rules[_senderWallet][_senderToken][_signerToken]
      .senderFilledAmount += _senderAmount;

    // Emit a DelegatedSwapFor event
    emit DelegatedSwapFor(_senderWallet, _signerWallet, _nonce);
  }

  /**
   * @notice Authorize a wallet to manage rules
   * @param _manager address Wallet of the manager to authorize
   * @dev Emits an Authorize event
   */
  function authorize(address _manager) external {
    if (_manager == address(0)) revert ManagerInvalid();
    authorized[msg.sender] = _manager;
    emit Authorize(_manager, msg.sender);
  }

  /**
   * @notice Revoke a manager
   * @dev Emits a Revoke event
   */
  function revoke() external {
    address _tmp = authorized[msg.sender];
    delete authorized[msg.sender];
    emit Revoke(_tmp, msg.sender);
  }

  /**
   * @notice Sets the SwapERC20 contract
   * @param _swapERC20Contract address
   */
  function setSwapERC20Contract(address _swapERC20Contract) external onlyOwner {
    if (_swapERC20Contract == address(0)) revert AddressInvalid();
    swapERC20Contract = ISwapERC20(_swapERC20Contract);
  }
}
