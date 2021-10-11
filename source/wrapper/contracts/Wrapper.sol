// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@airswap/light/contracts/interfaces/ILight.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IWETH.sol";

/**
 * @title Light: Simple atomic swap
 * @notice https://www.airswap.io/
 */
contract Wrapper is Ownable {
  using SafeERC20 for IERC20;

  ILight public lightContract;
  IWETH public wethContract;
  uint256 constant MAX_UINT = 2**256 - 1;

  /**
   * @notice Constructor
   * @param _lightContract address
   * @param _wethContract address
   */
  constructor(address _lightContract, address _wethContract) {
    require(_lightContract != address(0), "INVALID_LIGHT_CONTRACT");
    require(_wethContract != address(0), "INVALID_WETH_CONTRACT");

    lightContract = ILight(_lightContract);
    wethContract = IWETH(_wethContract);
    wethContract.approve(_lightContract, MAX_UINT);
  }

  /**
   * @notice Set the light contract
   * @param _lightContract address Address of the new light contract
   */
  function setLightContract(address _lightContract) external onlyOwner {
    require(_lightContract != address(0), "INVALID_LIGHT_CONTRACT");
    wethContract.approve(_lightContract, MAX_UINT);
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
    lightContract.swap(
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
  }

  /**
   * @notice Wrapped Swap with Conditional Fee
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
  function swapWithConditionalFee(
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
    lightContract.swapWithConditionalFee(
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
      // Approve the light contract to swap the amount
      IERC20(senderToken).safeApprove(address(lightContract), senderAmount);
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
