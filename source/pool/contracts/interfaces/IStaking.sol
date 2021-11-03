// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IStaking {
  struct Stake {
    uint256 duration;
    uint256 balance;
    uint256 timestamp;
  }

  /**
   * @notice Stake tokens
   * @param amount uint256
   */
  function stake(uint256 amount) external;

  /**
   * @notice Unstake tokens
   * @param amount uint256
   */
  function unstake(uint256 amount) external;

  /**
   * @notice Receive stakes for an account
   * @param account address
   */
  function getStakes(address account)
    external
    view
    returns (Stake memory accountStake);

  /**
   * @notice Total balance of all accounts (ERC-20)
   */
  function totalSupply() external view returns (uint256);

  /**
   * @notice Balance of an account (ERC-20)
   */
  function balanceOf(address account) external view returns (uint256);

  /**
   * @notice Decimals of underlying token (ERC-20)
   */
  function decimals() external view returns (uint8);

  /**
   * @notice Stake tokens for an account
   * @param account address
   * @param amount uint256
   */
  function stakeFor(address account, uint256 amount) external;

  /**
   * @notice Available amount for an account
   * @param account uint256
   */
  function available(address account) external view returns (uint256);
}
