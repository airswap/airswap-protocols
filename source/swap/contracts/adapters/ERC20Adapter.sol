// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "../interfaces/IAdapter.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract ERC20Adapter is IAdapter {
  using SafeERC20 for IERC20;
  /**
   * @notice Indicates the ERC165 interfaceId supported by this adapter
   */
  bytes4 public constant interfaceId = 0x36372b07;

  /**
   * @notice Function to wrap token transfer for different token types
   * @param party Party from whom swap would be made
   * @dev Use call: "msg.sender" is Swap contract
   */
  function hasAllowance(Party calldata party) external view returns (bool) {
    return
      IERC20(party.token).allowance(party.wallet, address(msg.sender)) >=
      party.amount;
  }

  /**
   * @notice Function to wrap token transfer for different token types
   * @param party Party from whom swap would be made
   */
  function hasBalance(Party calldata party) external view returns (bool) {
    return IERC20(party.token).balanceOf(party.wallet) >= party.amount;
  }

  /**
   * @notice Function to wrap safeTransferFrom for ERC20
   * @param from address Wallet address to transfer from
   * @param to address Wallet address to transfer to
   * @param amount uint256 Amount for ERC20
   * @param id uint256 ID, must be 0 for this contract
   * @param token address Contract address of token
   * @dev Use delegatecall: "this" is Swap contract
   */
  function transfer(
    address from,
    address to,
    uint256 amount,
    uint256 id,
    address token
  ) external {
    if (id != 0) revert InvalidArgument("id");
    IERC20(token).safeTransferFrom(from, to, amount);
  }
}
