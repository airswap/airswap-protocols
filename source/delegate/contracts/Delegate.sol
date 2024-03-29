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
 * @dev inherits IDelegate, Ownable uses SafeMath library
 */
contract Delegate is IDelegate, Ownable {
  // The Swap contract to be used to settle trades
  ISwapERC20 public swapERC20;

  // Mapping of sender to senderToken to to signerToken to remaining amount
  mapping(address => mapping(address => mapping(address => uint256)))
    public rules;

  /**
   * @notice Contract Constructor
   */
  constructor(ISwapERC20 _swapERC20) {
    swapERC20 = _swapERC20;
  }

  /**
   * @notice Set a Trading Rule
   * @param _senderToken address Address of an ERC-20 token the consumer would send
   * @param _maxSenderAmount uint256 Maximum amount of ERC-20 token the sender wants to swap
   * @param _signerToken address Address of an ERC-20 token the delegate would recieve
   * @param _minSignerAmount uint256 Minimum amount of ERC-20 token the delegate would recieve
   */
  function setRule(
    address _senderToken,
    uint256 _maxSenderAmount,
    address _signerToken,
    uint256 _minSignerAmount
  ) external {
    rules[msg.sender][_senderToken][_signerToken] = _maxSenderAmount;
    emit SetRule(
      msg.sender,
      _senderToken,
      _maxSenderAmount,
      _signerToken,
      _minSignerAmount
    );
  }

  /**
   * @notice Unset a Trading Rule
   * @dev only callable by the owner of the contract, removes from a mapping
   * @param _senderToken address Address of an ERC-20 token the sender would send
   * @param _signerToken address Address of an ERC-20 token the delegate would receive
   */
  function unsetRule(address _senderToken, address _signerToken) external {
    rules[msg.sender][_senderToken][_signerToken] = 0;
    emit UnsetRule(msg.sender, _senderToken, _signerToken);
  }

  function swap(
    address _delegatorWallet,
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
    if (rules[_delegatorWallet][_senderToken][_signerToken] < _senderAmount) {
      revert InsufficientDelegateAllowance();
    }

    SafeTransferLib.safeTransferFrom(
      _senderToken,
      _delegatorWallet,
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

    SafeTransferLib.safeTransfer(_signerToken, _delegatorWallet, _signerAmount);

    rules[_delegatorWallet][_senderToken][_signerToken] -= _senderAmount;
    emit DelegateSwap(_nonce, _signerWallet);
  }
}
