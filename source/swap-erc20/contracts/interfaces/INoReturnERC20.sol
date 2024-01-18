// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

interface INoReturnERC20 {
  function transferFrom(address from, address to, uint256 value) external;
}
