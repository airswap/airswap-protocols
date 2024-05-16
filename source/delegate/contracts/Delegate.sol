// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import "./interfaces/IDelegate.sol";
import "@airswap/swap-erc20/contracts/interfaces/ISwapERC20.sol";
import { ERC20 } from "solady/src/tokens/ERC20.sol";
import { Ownable } from "solady/src/auth/Ownable.sol";
import { SafeTransferLib } from "solady/src/utils/SafeTransferLib.sol";

/**
 * @title Delegate: Deployable Trading Rules for the AirSwap Network
 * @notice Supports fungible tokens (ERC-20)
 * @dev inherits IDelegate, Ownable and uses SafeTransferLib
 */
contract Delegate is IDelegate, Ownable {
  // The Swap contract to be used to settle trades
  ISwapERC20 public swapERC20;

  // Mapping of sender to senderToken to to signerToken to Rule
  mapping(address => mapping(address => mapping(address => Rule))) public rules;

  // Mapping of signer to authorized signatory
  mapping(address => address) public authorized;

  /**
   * @notice Contract Constructor
   */
  constructor(ISwapERC20 _swapERC20) {
    _initializeOwner(msg.sender);
    swapERC20 = _swapERC20;
  }

  /**
   * @notice Set a Trading Rule
   * @param _senderToken address Address of an ERC-20 token the consumer would send
   * @param _senderAmount uint256 Maximum amount of ERC-20 token the sender wants to swap
   * @param _signerToken address Address of an ERC-20 token the delegate would recieve
   * @param _signerAmount uint256 Minimum amount of ERC-20 token the delegate would recieve
   */
  function setRule(
    address _senderWallet,
    address _senderToken,
    uint256 _senderAmount,
    address _signerToken,
    uint256 _signerAmount
  ) external {
    if (authorized[_senderWallet] != address(0)) {
      if (authorized[_senderWallet] != msg.sender) revert SenderInvalid();
    } else {
      if (_senderWallet != msg.sender) revert SenderInvalid();
    }

    rules[_senderWallet][_senderToken][_signerToken] = Rule(
      _senderWallet,
      _senderToken,
      _senderAmount,
      _signerToken,
      _signerAmount
    );

    emit SetRule(
      _senderWallet,
      _senderToken,
      _senderAmount,
      _signerToken,
      _signerAmount
    );
  }

  /**
   * @notice Unset a Trading Rule
   * @dev only callable by the owner of the contract, removes from a mapping
   * @param _senderToken address Address of an ERC-20 token the sender would send
   * @param _signerToken address Address of an ERC-20 token the delegate would receive
   */
  function unsetRule(
    address _senderWallet,
    address _senderToken,
    address _signerToken
  ) external {
    if (authorized[_senderWallet] != address(0)) {
      if (authorized[_senderWallet] != msg.sender) revert SenderInvalid();
    } else {
      if (_senderWallet != msg.sender) revert SenderInvalid();
    }
    Rule storage rule = rules[_senderWallet][_senderToken][_signerToken];
    rule.senderAmount = 0;
    emit UnsetRule(_senderWallet, _senderToken, _signerToken);
  }

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
      _senderAmount > (_signerAmount * rule.senderAmount) / rule.signerAmount
    ) {
      revert InvalidSignerAmount();
    }

    if (rule.senderAmount < _senderAmount) {
      revert InvalidSenderAmount();
    }

    SafeTransferLib.safeTransferFrom(
      _senderToken,
      _senderWallet,
      address(this),
      _senderAmount
    );

    ERC20(_senderToken).approve(address(swapERC20), _senderAmount);

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

    SafeTransferLib.safeTransfer(_signerToken, _senderWallet, _signerAmount);

    rules[_senderWallet][_senderToken][_signerToken]
      .senderAmount -= _senderAmount;
    emit DelegateSwap(_nonce, _signerWallet);
  }

  /**
   * @notice Authorize a wallet to manage rules
   * @param _manager address Wallet of the signatory to authorize
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
    if (address(_swapERC20) == address(0)) revert InvalidAddress();
    swapERC20 = _swapERC20;
  }
}
