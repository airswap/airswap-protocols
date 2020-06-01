pragma solidity 0.5.16;
pragma experimental ABIEncoderV2;

import "@airswap/types/contracts/Types.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "./Wrapper.sol";

/**
 * @title HelperMock: This mock contract has been created to test the Wrapper.
 *
 * In the final lines of Wrapper.swap ETH is transferred to the sender of the order,
 * having completed a swap in which the sender received WETH. If this ETH transfer fails
 * the transaction must revert to prevent ETH trapped in the Wrapper. This situation
 * occurs when the ETH recipient is a non-payable contract that therefore rejects
 * the ETH.
 *
 */
contract HelperMock {
  Wrapper public wrapper;

  constructor(Wrapper helperWrapper) public {
    wrapper = helperWrapper;
  }

  function forwardSwap(Types.Order calldata order) external {
    wrapper.swap(order);
  }

  function authorizeWrapperToSend() external {
    ISwap swap = wrapper.swapContract();
    swap.authorizeSender(address(wrapper));
  }

  function approveToken(
    IERC20 token,
    address toApprove,
    uint256 amount
  ) external {
    token.approve(toApprove, amount);
  }
}
