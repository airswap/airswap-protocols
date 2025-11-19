// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

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
  event SetFeeReceiver(address indexed feeReceiver);

  ISwapERC20 public swapERC20Contract;
  IWETH public wethContract;
  address public feeReceiver;
  uint256 constant MAX_UINT = 2 ** 256 - 1;

  /**
   * @notice Constructor
   * @param _swapERC20Contract address
   * @param _wethContract address
   */
  constructor(address _swapERC20Contract, address _wethContract) {
    require(_swapERC20Contract != address(0), "INVALID_SWAP_ERC20_CONTRACT");
    require(_wethContract != address(0), "INVALID_WETH_CONTRACT");

    swapERC20Contract = ISwapERC20(_swapERC20Contract);
    wethContract = IWETH(_wethContract);
    wethContract.approve(_swapERC20Contract, MAX_UINT);
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
   * @notice Set the fee receiver address
   * @param _feeReceiver address Address authorized to receive protocol fees
   */
  function setFeeReceiver(address _feeReceiver) external onlyOwner {
    require(_feeReceiver != address(0), "INVALID_FEE_RECEIVER");
    feeReceiver = _feeReceiver;
    emit SetFeeReceiver(_feeReceiver);
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
   * @notice Wrapped SwapERC20.swap
   * @param order OrderERC20 struct containing order details and signature
   */
  function swap(ISwapERC20.OrderERC20 calldata order) public payable {
    require(feeReceiver != address(0), "FEE_RECEIVER_NOT_SET");
    _wrapEther(order.senderToken, order.senderAmount);
    swapERC20Contract.swap(order, msg.sender, feeReceiver);
    _unwrapEther(order.signerToken, order.signerAmount);
    emit WrappedSwapFor(msg.sender);
  }

  /**
   * @notice Wrapped SwapERC20.swapAnySender
   * @param order OrderERC20 struct containing order details and signature
   */
  function swapAnySender(ISwapERC20.OrderERC20 calldata order) public payable {
    require(feeReceiver != address(0), "FEE_RECEIVER_NOT_SET");
    _wrapEther(order.senderToken, order.senderAmount);
    swapERC20Contract.swapAnySender(order, msg.sender, feeReceiver);
    _unwrapEther(order.signerToken, order.signerAmount);
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
      wethContract.deposit{ value: msg.value }();
    } else {
      // Ensure message value is zero
      require(msg.value == 0, "VALUE_MUST_BE_ZERO");
      // Approve the swap contract to swap the amount
      IERC20(senderToken).safeApprove(address(swapERC20Contract), senderAmount);
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
      (bool success, ) = msg.sender.call{ value: signerAmount }("");
      require(success, "ETH_RETURN_FAILED");
    } else {
      IERC20(signerToken).safeTransfer(msg.sender, signerAmount);
    }
  }
}
