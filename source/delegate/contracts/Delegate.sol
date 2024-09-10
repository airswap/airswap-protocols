// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import "./interfaces/IDelegate.sol";
import "@airswap/swap-erc20/contracts/interfaces/ISwapERC20.sol";
import { Ownable } from "solady/src/auth/Ownable.sol";
import { SafeTransferLib } from "solady/src/utils/SafeTransferLib.sol";

/**
 * @title AirSwap: Delegated On-chain Trading Rules
 * @notice Supports ERC-20 tokens
 * @dev inherits IDelegate, Ownable and uses SafeTransferLib
 */
contract Delegate is IDelegate, Ownable {
  // The SwapERC20 contract to be used to execute orders
  ISwapERC20 public swapERC20;

  // Mapping of sender to senderToken to to signerToken to Rule
  mapping(address => mapping(address => mapping(address => Rule))) public rules;

  // Mapping of sender to authorized manager
  mapping(address => address) public authorized;

  /**
   * @notice Contract Constructor
   */
  constructor(ISwapERC20 _swapERC20) {
    _initializeOwner(msg.sender);
    swapERC20 = _swapERC20;
  }

  /**
   * @notice Set a Rule
   * @param _senderWallet The address of the sender's wallet
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
   * @notice Unset rule
   * @param _senderWallet The address of the sender's wallet
   * @param _senderToken address sender token of the rule
   * @param _signerToken address signer token of the rule
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

    emit UnsetRule(_senderWallet, _senderToken, _signerToken);
  }

  /**
   * @notice Atomic ERC20 Swap
   * @notice forwards to the underlying SwapERC20 contract
   * @param _senderWallet address Wallet to receive sender proceeds
   * @param _nonce uint256 Unique and should be sequential
   * @param _expiry uint256 Expiry in seconds since 1 January 1970
   * @param _signerWallet address Wallet of the signer
   * @param _signerToken address ERC20 token transferred from the signer
   * @param _signerAmount uint256 Amount transferred from the signer
   * @param _senderToken address ERC20 token transferred from the sender
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
    if (
      _signerAmount <
      (rule.signerAmount * (rule.senderAmount - rule.senderFilledAmount)) /
        rule.senderAmount
    ) {
      revert SignerAmountInvalid();
    }
    if (rule.expiry < block.timestamp) revert RuleExpired();

    if (_senderAmount > (rule.senderAmount - rule.senderFilledAmount)) {
      revert SenderAmountInvalid();
    }

    // Transfer the sender token to this contract
    SafeTransferLib.safeTransferFrom(
      _senderToken,
      _senderWallet,
      address(this),
      _senderAmount
    );

    SafeTransferLib.safeApprove(
      _senderToken,
      address(swapERC20),
      _senderAmount
    );

    // Execute the swap
    swapERC20.swapLight(
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
    emit DelegateSwap(_nonce, _signerWallet);
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
   * @param _swapERC20 ISwapERC20 The SwapERC20 contract
   */
  function setSwapERC20Contract(ISwapERC20 _swapERC20) external onlyOwner {
    if (address(_swapERC20) == address(0)) revert AddressInvalid();
    swapERC20 = _swapERC20;
  }
}
