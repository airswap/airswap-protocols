// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

/**
 * @title ITransferHandler: interface for token transfers
 */
interface ITransferHandler {
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

  /**
   * @notice Function to return whether the token transfered is fungible or not
   */
  function isFungible () external returns(bool);
}
