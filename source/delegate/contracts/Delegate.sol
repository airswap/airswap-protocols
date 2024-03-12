// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import "./interfaces/IDelegate.sol";
import "@airswap/swap-erc20/contracts/interfaces/ISwapERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Delegate: Deployable Trading Rules for the AirSwap Network
 * @notice Supports fungible tokens (ERC-20)
 * @dev inherits IDelegate, Ownable uses SafeMath library
 */
contract Delegate is IDelegate, Ownable {
  using SafeERC20 for IERC20;
  // The Swap contract to be used to settle trades
  ISwapERC20 public swapERC20;

  /**
   * @notice Contract Constructor
   */
  constructor(ISwapERC20 _swapERC20) {
    swapERC20 = _swapERC20;
  }

  /**
   * @notice Set a Trading Rule
   * @param _signerToken address Address of an ERC-20 token the consumer would send
   * @param _maxSignerAmount uint256 Maximum amount of ERC-20 token the delegate would send
   * @param _senderToken address Address of an ERC-20 token the delegate would send
   * @param _minSenderAmount uint256 Maximum amount of ERC-20 token the delegate would send
   */
  function setRule(
    address _signerToken,
    uint256 _maxSignerAmount,
    address _senderToken,
    uint256 _minSenderAmount
  ) external {
    emit SetRule(
      msg.sender,
      _signerToken,
      _maxSignerAmount,
      _senderToken,
      _minSenderAmount
    );
  }

  /**
   * @notice Unset a Trading Rule
   * @dev only callable by the owner of the contract, removes from a mapping
   * @param _signerToken address Address of an ERC-20 token the consumer would send
   */
  function unsetRule(address _signerToken) external {
    emit UnsetRule(msg.sender, _signerToken);
  }

  function swap(
    address _delegator,
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
    IERC20(_senderToken).safeTransferFrom(
      _delegator,
      address(this),
      _senderAmount
    );

    IERC20(_senderToken).approve(address(swapERC20), _senderAmount);

    swapERC20.swap(
      _delegator,
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

    IERC20(_signerToken).safeTransferFrom(
      address(this),
      _delegator,
      _signerAmount
    );

    emit DelegateSwap(_nonce, _signerWallet);
  }
}
