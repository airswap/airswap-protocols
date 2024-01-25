// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

interface IStaking {
  struct Stake {
    uint256 start;
    uint256 finish;
    uint256 balance;
  }

  // ERC-20 Transfer
  event Transfer(address indexed from, address indexed to, uint256 tokens);

  // Schedule stake duration change
  event ScheduleDurationChange(
    uint256 proposedStakeDuration,
    uint256 indexed unlockTimestamp
  );

  // Cancel stake duration change
  event CancelDurationChange();

  // Complete stake duration change
  event CompleteDurationChange(uint256 indexed newDuration);

  // Propose delegate
  event ProposeDelegate(address indexed from, address indexed to);

  // Set delegate (proposal accepted)
  event SetDelegate(address indexed staker, address indexed delegate);

  // Unset delegate
  event UnsetDelegate(address indexed staker, address indexed delegate);

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
   * @notice Set timelock for duration change
   * @param _proposedStakingDuration uint256
   * @param _durationChangeDelay uint256
   */
  function scheduleDurationChange(
    uint256 _proposedStakingDuration,
    uint256 _durationChangeDelay
  ) external;

  /**
   * @notice Cancel timelock for duration change
   */
  function cancelDurationChange() external;

  /**
   * @notice Complete timelocked duration change
   */
  function completeDurationChange() external;

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
