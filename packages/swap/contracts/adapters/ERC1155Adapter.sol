// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "../interfaces/IAdapter.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

contract ERC1155Adapter is IAdapter {
  /**
   * @notice Indicates the ERC165 interfaceID supported by this adapter
   */
  bytes4 public constant interfaceID = 0xd9b67a26;

  /**
   * @notice Indicates whether to attempt a fee transfer on the token
   */
  bool public constant attemptFeeTransfer = true;

  /**
   * @notice Function to wrap token transfer for different token types
   * @param party Party from whom swap would be made
   */
  function hasAllowance(Party calldata party) external view returns (bool) {
    return IERC1155(party.token).isApprovedForAll(party.wallet, address(this));
  }

  /**
   * @notice Function to wrap token transfer for different token types
   * @param party Party from whom swap would be made
   */
  function hasBalance(Party calldata party) external view returns (bool) {
    return
      IERC1155(party.token).balanceOf(party.wallet, party.id) >= party.amount;
  }

  /**
   * @notice Function to wrap safeTransferFrom for ERC1155
   * @param from address Wallet address to transfer from
   * @param to address Wallet address to transfer to
   * @param amount uint256 Amount for ERC-1155
   * @param id uint256 token ID for ERC-1155
   * @param token address Contract address of token
   */
  function transferTokens(
    address from,
    address to,
    uint256 amount,
    uint256 id,
    address token
  ) external {
    IERC1155(token).safeTransferFrom(
      from,
      to,
      id,
      amount,
      "" // bytes are empty
    );
  }
}
