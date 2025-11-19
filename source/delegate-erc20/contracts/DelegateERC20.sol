// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import "./interfaces/IDelegateERC20.sol";
import "@airswap/swap-erc20/contracts/interfaces/ISwapERC20.sol";
import { Ownable } from "solady/src/auth/Ownable.sol";
import { SafeTransferLib } from "solady/src/utils/SafeTransferLib.sol";

/**
 * @title AirSwap: Delegated On-chain Trading Rules
 * @notice Supports ERC-20 tokens
 * @dev inherits IDelegateERC20, Ownable; uses SafeTransferLib
 */
contract DelegateERC20 is IDelegateERC20, Ownable {
  // The SwapERC20 contract to be used to execute orders
  ISwapERC20 public swapERC20Contract;

  // Mapping of senderWallet to senderToken to to signerToken to Rule
  mapping(address => mapping(address => mapping(address => Rule)))
    public rulesERC20;

  // Mapping of senderWallet to an authorized manager
  mapping(address => address) public authorized;

  // Fee receiver address for protocol fees
  address public feeReceiver;

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
  function setRuleERC20(
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
    rulesERC20[_senderWallet][_senderToken][_signerToken] = Rule(
      _senderWallet,
      _senderToken,
      _senderAmount,
      0,
      _signerToken,
      _signerAmount,
      _expiry
    );

    // Emit a SetRule event
    emit SetRuleERC20(
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
  function unsetRuleERC20(
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
    delete rulesERC20[_senderWallet][_senderToken][_signerToken];

    // Emit an UnsetRule event
    emit UnsetRuleERC20(_senderWallet, _senderToken, _signerToken);
  }

  /**
   * @notice Perform an atomic ERC-20 swap
   * @dev Forwards to underlying SwapERC20 contract
   * @param _senderWallet address Wallet to receive sender proceeds
   * @param order OrderERC20 struct containing order details and signature
   * @param _feeReceiver address Wallet to receive protocol fees
   */
  function swapERC20(
    address _senderWallet,
    ISwapERC20.OrderERC20 calldata order,
    address _feeReceiver
  ) external {
    if (feeReceiver == address(0)) revert FeeReceiverNotSet();
    if (_feeReceiver != feeReceiver) revert FeeReceiverMismatch();

    Rule storage rule = rulesERC20[_senderWallet][order.senderToken][order.signerToken];
    // Ensure the expiry is not passed
    if (rule.expiry <= block.timestamp) revert RuleERC20ExpiredOrDoesNotExist();

    // Ensure the sender amount is valid
    if (order.senderAmount > (rule.senderAmount - rule.senderFilledAmount)) {
      revert SenderAmountInvalid();
    }

    // Ensure the signer amount is valid
    if (
      order.signerAmount != (rule.signerAmount * order.senderAmount) / rule.senderAmount
    ) {
      revert SignerAmountInvalid();
    }

    // Transfer the sender token to this contract
    SafeTransferLib.safeTransferFrom(
      order.senderToken,
      _senderWallet,
      address(this),
      order.senderAmount
    );

    // Approve the SwapERC20 contract to transfer the sender token
    SafeTransferLib.safeApprove(
      order.senderToken,
      address(swapERC20Contract),
      order.senderAmount
    );

    // Execute the swap - senderReceiver is this contract (delegate), feeReceiver is passed
    swapERC20Contract.swapLight(
      order,
      address(this),
      _feeReceiver
    );

    // Transfer the signer token to the sender wallet
    SafeTransferLib.safeTransfer(order.signerToken, _senderWallet, order.signerAmount);

    // Update the filled amount
    rulesERC20[_senderWallet][order.senderToken][order.signerToken]
      .senderFilledAmount += order.senderAmount;

    // Emit a DelegatedSwapERC20For event
    emit DelegatedSwapERC20For(_senderWallet, order.signerWallet, order.nonce);
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

  /**
   * @notice Set the fee receiver address
   * @param _feeReceiver address Address authorized to receive protocol fees
   */
  function setFeeReceiver(address _feeReceiver) external onlyOwner {
    if (_feeReceiver == address(0)) revert AddressInvalid();
    feeReceiver = _feeReceiver;
    emit SetFeeReceiver(_feeReceiver);
  }
}
