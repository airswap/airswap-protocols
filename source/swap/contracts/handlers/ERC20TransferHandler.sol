// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "../interfaces/ITransferHandler.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract ERC20TransferHandler is ITransferHandler {
  /**
   * @notice Function to wrap token transfer for different token types
   * @param party Party from whom swap would be made
   */
  function hasAllowance(Party calldata party) external pure returns (bool) {
    return party.wallet != address(0);
  }

  /**
   * @notice Function to wrap token transfer for different token types
   * @param party Party from whom swap would be made
   */
  function hasBalance(Party calldata party) external pure returns (bool) {
    return party.wallet != address(0);
  }

  /**
   * @notice Function to wrap safeTransferFrom for ERC20
   * @param from address Wallet address to transfer from
   * @param to address Wallet address to transfer to
   * @param amount uint256 Amount for ERC-20
   * @param id uint256 ID, must be 0 for this contract
   * @param token address Contract address of token
   * @return bool on success of the token transfer
   */
  function transferTokens(
    address from,
    address to,
    uint256 amount,
    uint256 id,
    address token
  ) external returns (bool) {
    require(id == 0, "ID_INVALID");
    IERC20(token).transferFrom(from, to, amount);
    return true;
  }
}
