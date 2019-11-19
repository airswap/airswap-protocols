pragma solidity 0.5.12;
pragma experimental ABIEncoderV2;

import "@airswap/types/contracts/Types.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "./Wrapper.sol";

contract HelperMock {

  Wrapper public wrapper;

  constructor(Wrapper helperWrapper) public {
    wrapper = helperWrapper;
  }

  function forwardSwap(
    Types.Order calldata order
  ) external {
    wrapper.swap(order);
  }

  function authorizeWrapperToSend() external {
    ISwap swap = wrapper.swapContract();
    swap.authorizeSender(address(wrapper));
  }

  function approveToken(IERC20 token, address toApprove, uint256 amount) external {
    token.approve(toApprove, amount);
  }

}