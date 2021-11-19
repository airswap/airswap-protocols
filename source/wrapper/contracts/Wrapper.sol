// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@airswap/swap/contracts/interfaces/ISwap.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IWETH.sol";

/**
 * @title Swap: Simple atomic swap
 * @notice https://www.airswap.io/
 */
contract Wrapper is Ownable {
  using SafeERC20 for IERC20;

  event WrappedSwapFor(address senderWallet);

  ISwap public swapContract;
  IWETH public wethContract;
  uint256 constant MAX_UINT = 2**256 - 1;

  /**
   * @notice Constructor
   * @param _swapContract address
   * @param _wethContract address
   */
  constructor(address _swapContract, address _wethContract) {
    require(_swapContract != address(0), "INVALID_CONTRACT");
    require(_wethContract != address(0), "INVALID_WETH_CONTRACT");

    swapContract = ISwap(_swapContract);
    wethContract = IWETH(_wethContract);
    wethContract.approve(_swapContract, MAX_UINT);
  }

  /**
   * @notice Set the swap contract
   * @param _swapContract address Address of the new swap contract
   */
  function setSwapContract(address _swapContract) external onlyOwner {
    require(_swapContract != address(0), "INVALID_CONTRACT");
    wethContract.approve(_swapContract, MAX_UINT);
  }

  /**
   * @notice Required when withdrawing from WETH
   * @dev During unwraps, WETH.withdraw transfers ether to msg.sender (this contract)
   */
  receive() external payable {
    // Ensure the message sender is the WETH contract.
    if (msg.sender != address(wethContract)) {
      revert("DO_NOT_SEND_ETHER");
    }
  }

  /**
   * @notice Wrapped Swap
   * @param nonce uint256 Unique and should be sequential
   * @param expiry uint256 Expiry in seconds since 1 January 1970
   * @param signerWallet address Wallet of the signer
   * @param signerToken address ERC20 token transferred from the signer
   * @param signerAmount uint256 Amount transferred from the signer
   * @param senderToken address ERC20 token transferred from the sender
   * @param senderAmount uint256 Amount transferred from the sender
   * @param v uint8 "v" value of the ECDSA signature
   * @param r bytes32 "r" value of the ECDSA signature
   * @param s bytes32 "s" value of the ECDSA signature
   */
  function swap(
    uint256 nonce,
    uint256 expiry,
    address signerWallet,
    address signerToken,
    uint256 signerAmount,
    address senderToken,
    uint256 senderAmount,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) public payable {
    _wrapEther(senderToken, senderAmount);
    swapContract.swap(
      address(this),
      nonce,
      expiry,
      signerWallet,
      signerToken,
      signerAmount,
      senderToken,
      senderAmount,
      v,
      r,
      s
    );
    _unwrapEther(signerToken, signerAmount);
    emit WrappedSwapFor(msg.sender);
  }

  /**
   * @notice Wrap Ether into WETH
   * @param senderAmount uint256 Amount transferred from the sender
   */
  function _wrapEther(address senderToken, uint256 senderAmount) internal {
    if (senderToken == address(wethContract)) {
      // Ensure message value is param
      require(senderAmount == msg.value, "VALUE_MUST_BE_SENT");
      // Wrap (deposit) the ether
      wethContract.deposit{value: msg.value}();
    } else {
      // Ensure message value is zero
      require(msg.value == 0, "VALUE_MUST_BE_ZERO");
      // Approve the swap contract to swap the amount
      IERC20(senderToken).safeApprove(address(swapContract), senderAmount);
      // Transfer tokens from sender to wrapper for swap
      IERC20(senderToken).safeTransferFrom(
        msg.sender,
        address(this),
        senderAmount
      );
    }
  }

  /**
   * @notice Unwrap WETH into Ether
   * @param signerToken address Token of the signer
   * @param signerAmount uint256 Amount transferred from the signer
   */
  function _unwrapEther(address signerToken, uint256 signerAmount) internal {
    if (signerToken == address(wethContract)) {
      // Unwrap (withdraw) the ether
      wethContract.withdraw(signerAmount);
      // Transfer ether to the recipient
      (bool success, ) = msg.sender.call{value: signerAmount}("");
      require(success, "ETH_RETURN_FAILED");
    } else {
      IERC20(signerToken).safeTransfer(msg.sender, signerAmount);
    }
  }
}
