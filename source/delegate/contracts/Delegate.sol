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
   * @param _delegatorToken address Address of an ERC-20 token the consumer would send
   * @param _maxDelegatorAmount uint256 Maximum amount of ERC-20 token the delegate would send
   * @param _takerToken address Address of an ERC-20 token the delegate would recieve
   * @param _minTakerAmount uint256 Minimum amount of ERC-20 token the delegate would recieve
   */
  function setRule(
    address _delegatorToken,
    uint256 _maxDelegatorAmount,
    address _takerToken,
    uint256 _minTakerAmount
  ) external {
    emit SetRule(
      msg.sender,
      _delegatorToken,
      _maxDelegatorAmount,
      _takerToken,
      _minTakerAmount
    );
  }

  /**
   * @notice Unset a Trading Rule
   * @dev only callable by the owner of the contract, removes from a mapping
   * @param _delegatorToken address Address of an ERC-20 token the delegator would send
   * @param _takerToken address Address of an ERC-20 token the delegate would receive
   */
  function unsetRule(address _delegatorToken, address _takerToken) external {
    emit UnsetRule(msg.sender, _delegatorToken, _takerToken);
  }

  function swap(
    address _delegator,
    uint256 _nonce,
    uint256 _expiry,
    address _signerWallet,
    address _takerToken,
    uint256 _takerAmount,
    address _delegatorToken,
    uint256 _delegatorAmount,
    uint8 _v,
    bytes32 _r,
    bytes32 _s
  ) external {
    IERC20(_delegatorToken).safeTransferFrom(
      _delegator,
      address(this),
      _delegatorAmount
    );

    IERC20(_delegatorToken).approve(address(swapERC20), _delegatorAmount);

    swapERC20.swap(
      _delegator,
      _nonce,
      _expiry,
      _signerWallet,
      _takerToken,
      _takerAmount,
      _delegatorToken,
      _delegatorAmount,
      _v,
      _r,
      _s
    );

    IERC20(_takerToken).safeTransferFrom(
      address(this),
      _delegator,
      _takerAmount
    );

    emit DelegateSwap(_nonce, _signerWallet);
  }
}
