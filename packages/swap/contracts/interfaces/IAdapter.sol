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
   * @notice Return the ERC165 interfaceID this adapter supports
   */
  function interfaceID() external view returns (bytes4);

  /**
   * @notice Indicates whether to attempt a fee transfer on the token
   */
  function attemptFeeTransfer() external returns (bool);

  /**
   * @notice Function to indicate whether the party token implements EIP-2981
   * @param token contract address from which royalties need to be considered
   */
  function implementsEIP2981(address token) external view returns (bool);

  /**
   * @notice Function to query EIP-2981 implementation and provide royalties information
   * @param token contract address from which royalties need to be considered
   */
  function getRoyaltyInfo(
    address token,
    uint256 tokenId,
    uint256 salePrice
  ) external view returns (address, uint256);

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
  function transferTokens(
    address from,
    address to,
    uint256 amount,
    uint256 id,
    address token
  ) external;
}
