// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@airswap/swap/contracts/interfaces/ISwap.sol";
import "@airswap/swap-erc20/contracts/interfaces/ISwapERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "./interfaces/IWETH.sol";

/**
 * @title AirSwap: Wrap and Unwrap Native Tokens
 * @notice https://www.airswap.io/
 */
contract Wrapper is Ownable2Step {
  using SafeERC20 for IERC20;

  event WrappedSwapFor(address indexed senderWallet);

  ISwap public swapContract;
  ISwapERC20 public swapERC20Contract;
  IWETH public wethContract;
  uint256 constant MAX_UINT = 2**256 - 1;

  /**
   * @notice Constructor
   * @param _swapContract address
   * @param _swapERC20Contract address
   * @param _wethContract address
   */
  constructor(
    address _swapContract,
    address _swapERC20Contract,
    address _wethContract
  ) {
    require(_swapContract != address(0), "INVALID_SWAP_CONTRACT");
    require(_swapERC20Contract != address(0), "INVALID_SWAP_ERC20_CONTRACT");
    require(_wethContract != address(0), "INVALID_WETH_CONTRACT");

    swapContract = ISwap(_swapContract);
    swapERC20Contract = ISwapERC20(_swapERC20Contract);
    wethContract = IWETH(_wethContract);
    wethContract.approve(_swapContract, MAX_UINT);
  }

  /**
   * @notice Set the SwapERC20 contract
   * @param _swapContract address Address of the new swap contract
   */
  function setSwapContract(address _swapContract) external onlyOwner {
    require(_swapContract != address(0), "INVALID_SWAP_CONTRACT");
    wethContract.approve(address(swapContract), 0);
    swapContract = ISwap(_swapContract);
    wethContract.approve(_swapContract, MAX_UINT);
  }

  /**
   * @notice Set the SwapERC20 contract
   * @param _swapERC20Contract address Address of the new swap contract
   */
  function setSwapERC20Contract(address _swapERC20Contract) external onlyOwner {
    require(_swapERC20Contract != address(0), "INVALID_SWAP_ERC20_CONTRACT");
    wethContract.approve(address(swapERC20Contract), 0);
    swapERC20Contract = ISwapERC20(_swapERC20Contract);
    wethContract.approve(_swapERC20Contract, MAX_UINT);
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
   * @notice Wrapped Swap.swap
   * @param order ISwap.Order uint256 Unique and should be sequential
   */
  function swap(ISwap.Order calldata order) public payable {
    _wrapEther(order.sender.token, order.sender.amount);
    swapContract.swap(address(this), order);
    _unwrapEther(order.signer.token, order.signer.amount);
    emit WrappedSwapFor(msg.sender);
  }

  /**
   * @notice Wrapped SwapERC20.swap
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
  function swapERC20(
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
    swapERC20Contract.swap(
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
   * @notice Wrapped SwapERC20.swapAnySender
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
  function swapAnySender(
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
    swapERC20Contract.swapAnySender(
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
