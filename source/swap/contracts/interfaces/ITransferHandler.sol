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
 * @title ITransferHandler: interface for token transfers
 */
interface ITransferHandler {
  /**
   * Revert if provided an invalid parameter
   */
  error InvalidArgument(string);

  /**
   * @notice Indicates whether to attempt a fee transfer on the token
   */
  function attemptFeeTransfer() external returns (bool);

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
   * @return bool on success of the token transfer
   */
  function transferTokens(
    address from,
    address to,
    uint256 amount,
    uint256 id,
    address token
  ) external returns (bool);
}
