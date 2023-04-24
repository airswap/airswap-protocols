// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

interface IStaking {
  struct Stake {
    uint256 duration;
    uint256 balance;
    uint256 timestamp;
    uint256 maturity;
  }

  // ERC-20 Transfer event
  event Transfer(address indexed from, address indexed to, uint256 tokens);

  // Schedule timelock event
  event ScheduleDurationChange(uint256 indexed unlockTimestamp);

  // Cancel timelock event
  event CancelDurationChange();

  // Complete timelock event
  event CompleteDurationChange(uint256 indexed newDuration);

  // Propose Delegate event
  event ProposeDelegate(address indexed delegate, address indexed account);

  // Set Delegate event
  event SetDelegate(address indexed delegate, address indexed account);

  error AmountInvalid(uint256);
  error DelayInvalid(uint256);
  error DelegateInvalid(address);
  error DelegateNotProposed(address);
  error DelegateNotSet(address);
  error DelegateStaked(address);
  error DelegateTaken(address);
  error DurationInvalid(uint256);
  error SenderHasDelegate(address sender, address delegate);
  error TimelockActive();
  error Timelocked();
  error TimelockInactive();

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
  function getStakes(
    address account
  ) external view returns (Stake memory accountStake);

  /**
   * @notice Total balance of all accounts (ERC-20)
   */
  function totalSupply() external view returns (uint256);

  /**
   * @notice Balance of an account (ERC-20)
   * @param account address
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
