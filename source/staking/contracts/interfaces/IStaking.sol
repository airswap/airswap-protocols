// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

interface IStaking {
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

  struct Stake {
    uint256 start;
    uint256 finish;
    uint256 balance;
  }

  event CancelDurationChange();
  event CompleteDurationChange(uint256 indexed newDuration);
  event ProposeDelegate(address indexed from, address indexed to);
  event Transfer(address indexed from, address indexed to, uint256 tokens);
  event ScheduleDurationChange(
    uint256 proposedStakeDuration,
    uint256 indexed unlockTimestamp
  );
  event SetDelegate(address indexed staker, address indexed delegate);
  event SetUnlocked(bool unlock);
  event UnsetDelegate(address indexed staker, address indexed delegate);

  function stake(uint256 amount) external;

  function stakeFor(address account, uint256 amount) external;

  function unstake(uint256 amount) external;

  function available(address staker) external view returns (uint256);

  function balanceOf(address account) external view returns (uint256);

  function totalSupply() external view returns (uint256);

  function decimals() external view returns (uint8);

  function proposeDelegate(address to) external;

  function acceptDelegateProposal(address from) external;

  function unsetDelegate(address delegate) external;

  function scheduleDurationChange(
    uint256 proposedStakingDuration,
    uint256 durationChangeDelay
  ) external;

  function cancelDurationChange() external;

  function completeDurationChange() external;

  function setMetaData(string memory name, string memory symbol) external;
}
