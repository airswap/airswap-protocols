// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import "../interfaces/IAdapter.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract ERC721Adapter is IAdapter {
  /**
   * @notice Indicates the ERC165 interfaceId supported by this adapter
   */
  bytes4 public constant interfaceId = 0x80ac58cd;

  /**
   * @notice Checks allowance on an ERC721
   * @param party Party params to check
   * @dev Use call: "msg.sender" is Swap contract
   */
  function hasAllowance(Party calldata party) external view returns (bool) {
    return IERC721(party.token).getApproved(party.id) == address(msg.sender);
  }

  /**
   * @notice Checks balance on an ERC721
   * @param party Party params to check
   */
  function hasBalance(Party calldata party) external view returns (bool) {
    return IERC721(party.token).ownerOf(party.id) == party.wallet;
  }

  /**
   * @notice Checks params for transfer
   * @param party Party params to check
   */
  function hasValidParams(Party calldata party) external pure returns (bool) {
    return (party.amount == 0);
  }

  /**
   * @notice Function to wrap safeTransferFrom for ERC721
   * @param from address Wallet address to transfer from
   * @param to address Wallet address to transfer to
   * @param amount uint256, must be 0 for this contract
   * @param id uint256 ID for ERC721
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
    if (amount != 0) revert AmountOrIDInvalid("amount");
    IERC721(token).safeTransferFrom(from, to, id);
  }
}
