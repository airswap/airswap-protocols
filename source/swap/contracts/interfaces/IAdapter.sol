// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

struct Party {
  address wallet; // Wallet address of the party
  address token; // Contract address of the token
  bytes4 kind; // Interface ID of the token
  uint256 id; // ID for ERC-721 or ERC-1155
  uint256 amount; // Amount for ERC-20 or ERC-1155
}

/**
 * @title IAdapter: Adapter for various token kinds
 */
interface IAdapter {
  /**
   * @notice Revert if provided an invalid transfer argument
   */
  error InvalidArgument(string);

  /**
   * @notice Return the ERC165 interfaceId this adapter supports
   */
  function interfaceId() external view returns (bytes4);

  /**
   * @notice Function to wrap token transfer for different token types
   * @param party Party from whom swap would be made
   */
  function hasAllowance(Party calldata party) external view returns (bool);

  /**
   * @notice Function to wrap token transfer for different token types
   * @param party Party from whom swap would be made
   */
  function hasBalance(Party calldata party) external view returns (bool);

  /**
   * @notice Function to wrap token transfer for different token types
   * @param from address Wallet address to transfer from
   * @param to address Wallet address to transfer to
   * @param amount uint256 Amount for ERC-20
   * @param id token ID for ERC-721
   * @param token address Contract address of token
   */
  function transfer(
    address from,
    address to,
    uint256 amount,
    uint256 id,
    address token
  ) external;
}
