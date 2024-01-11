// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import "../interfaces/IAdapter.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

contract ERC1155Adapter is IAdapter {
  /**
   * @notice Indicates the ERC165 interfaceId supported by this adapter
   */
  bytes4 public constant interfaceId = 0xd9b67a26;

  /**
   * @notice Checks allowance on an ERC1155
   * @param party Party params to check
   * @dev Use call: "msg.sender" is Swap contract
   */
  function hasAllowance(Party calldata party) external view returns (bool) {
    return
      IERC1155(party.token).isApprovedForAll(party.wallet, address(msg.sender));
  }

  /**
   * @notice Checks balance on an ERC1155
   * @param party Party params to check
   */
  function hasBalance(Party calldata party) external view returns (bool) {
    return
      IERC1155(party.token).balanceOf(party.wallet, party.id) >= party.amount;
  }

  /**
   * @notice Checks params for transfer
   * @param party Party params to check
   */
  function hasValidParams(Party calldata party) external pure returns (bool) {
    return (party.amount != 0);
  }

  /**
   * @notice Function to wrap safeTransferFrom for ERC1155
   * @param from address Wallet address to transfer from
   * @param to address Wallet address to transfer to
   * @param amount uint256 Amount for ERC-1155
   * @param id uint256 token ID for ERC-1155
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
    if (amount == 0) revert AmountOrIDInvalid("amount");
    IERC1155(token).safeTransferFrom(from, to, id, amount, "0x00");
  }
}
