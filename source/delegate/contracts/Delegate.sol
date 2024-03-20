// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import "./interfaces/IDelegate.sol";
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

  // Mapping of delegator to delegatorToken to to takerToken to remaining DelegatorAmount
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
    rules[msg.sender][_delegatorToken][_takerToken] = _maxDelegatorAmount;
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
    rules[msg.sender][_delegatorToken][_takerToken] = 0;
    emit UnsetRule(msg.sender, _delegatorToken, _takerToken);
  }

  function swap(
    address _delegator,
    uint256 _nonce,
    uint256 _expiry,
    address _takerWallet,
    address _takerToken,
    uint256 _takerAmount,
    address _delegatorToken,
    uint256 _delegatorAmount,
    uint8 _v,
    bytes32 _r,
    bytes32 _s
  ) external {
    if (rules[_delegator][_delegatorToken][_takerToken] < _delegatorAmount) {
      revert InsufficientDelegatorAmount();
    }

    SafeTransferLib.safeTransferFrom(
      _delegatorToken,
      _delegator,
      address(this),
      _delegatorAmount
    );

    ERC20(_delegatorToken).approve(address(swapERC20), _delegatorAmount);

    swapERC20.swap(
      address(this),
      _nonce,
      _expiry,
      _takerWallet,
      _takerToken,
      _takerAmount,
      _delegatorToken,
      _delegatorAmount,
      _v,
      _r,
      _s
    );

    SafeTransferLib.safeTransferFrom(
      _takerToken,
      address(this),
      _delegator,
      ERC20(_takerToken).balanceOf(address(this))
    );

    rules[_delegator][_delegatorToken][_takerToken] -= _delegatorAmount;
    emit DelegateSwap(_nonce, _takerWallet);
  }
}
