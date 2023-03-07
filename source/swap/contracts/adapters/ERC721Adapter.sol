// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "../interfaces/IAdapter.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract ERC721Adapter is IAdapter {
  /**
   * @notice Indicates the ERC165 interfaceId supported by this adapter
   */
  bytes4 public constant interfaceId = 0x80ac58cd;

  /**
   * @notice Function to wrap token transfer for different token types
   * @param party Party from whom swap would be made
   */
  function hasAllowance(Party calldata party) external view returns (bool) {
    return IERC721(party.token).isApprovedForAll(party.wallet, address(this));
  }

  /**
   * @notice Function to wrap token transfer for different token types
   * @param party Party from whom swap would be made
   */
  function hasBalance(Party calldata party) external view returns (bool) {
    return IERC721(party.token).ownerOf(party.id) == party.wallet;
  }

  /**
   * @notice Function to wrap safeTransferFrom for ERC721
   * @param from address Wallet address to transfer from
   * @param to address Wallet address to transfer to
   * @param amount uint256, must be 0 for this contract
   * @param id uint256 ID for ERC721
   * @param token address Contract address of token
   */
  function transfer(
    address from,
    address to,
    uint256 amount,
    uint256 id,
    address token
  ) external {
    if (amount != 0) revert InvalidArgument("amount");
    IERC721(token).safeTransferFrom(from, to, id);
  }
}
