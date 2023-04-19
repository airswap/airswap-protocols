// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./interfaces/IStaking.sol";

/**
 * @title AirSwap: Stake Tokens
 * @notice https://www.airswap.io/
 */
contract Staking is IStaking, Ownable {
  using SafeERC20 for ERC20;

  // Token to be staked
  ERC20 public immutable token;

  // Unstaking duration
  uint256 public duration;

  // Timelock delay
  uint256 private minDelay;

  // Timeunlock timestamp
  uint256 private timeUnlock;

  // Mapping of account to stakes
  mapping(address => Stake) internal stakes;

  // Mapping of account to proposed delegate
  mapping(address => address) public proposedDelegates;

  // Mapping of account to delegate
  mapping(address => address) public accountDelegates;

  // Mapping of delegate to account
  mapping(address => address) public delegateAccounts;

  // ERC-20 token properties
  string public name;
  string public symbol;

  /**
   * @notice Constructor
   * @param _token address Token used for staking
   * @param _name string Token name for this contract
   * @param _symbol string Token symbol for this contract
   * @param _duration uint256 Amount of time tokens are staked
   * @param _minDelay uint256 Amount of time between duration changes
   */
  constructor(
    ERC20 _token,
    string memory _name,
    string memory _symbol,
    uint256 _duration,
    uint256 _minDelay
  ) {
    token = _token;
    name = _name;
    symbol = _symbol;
    duration = _duration;
    minDelay = _minDelay;
  }

  /**
   * @notice Set token metadata for this contract
   * @param _name string Token name for this contract
   * @param _symbol string Token symbol for this contract
   */
  function setMetaData(
    string memory _name,
    string memory _symbol
  ) external onlyOwner {
    name = _name;
    symbol = _symbol;
  }

  /**
   * @dev Schedules timelock to change duration
   * @param delay uint256
   */
  function scheduleDurationChange(uint256 delay) external onlyOwner {
    if (timeUnlock != 0) revert TimelockActive();
    if (delay < minDelay) revert DelayInvalid(delay);
    timeUnlock = block.timestamp + delay;
    emit ScheduleDurationChange(timeUnlock);
  }

  /**
   * @dev Cancels timelock to change duration
   */
  function cancelDurationChange() external onlyOwner {
    if (timeUnlock <= 0) revert TimelockInactive();
    delete timeUnlock;
    emit CancelDurationChange();
  }

  /**
   * @notice Set unstaking duration
   * @param _duration uint256
   */
  function setDuration(uint256 _duration) external onlyOwner {
    if (_duration == 0) revert DurationInvalid(_duration);
    if (timeUnlock <= 0) revert TimelockInactive();
    if (block.timestamp < timeUnlock) revert Timelocked();
    duration = _duration;
    delete timeUnlock;
    emit CompleteDurationChange(_duration);
  }

  /**
   * @notice Propose delegate for account
   * @param delegate address
   */
  function proposeDelegate(address delegate) external {
    if (accountDelegates[msg.sender] != address(0))
      revert SenderHasDelegate(msg.sender, delegate);
    if (delegateAccounts[delegate] != address(0))
      revert DelegateTaken(delegate);
    if (stakes[delegate].balance != 0) revert DelegateStaked(delegate);
    proposedDelegates[msg.sender] = delegate;
    emit ProposeDelegate(delegate, msg.sender);
  }

  /**
   * @notice Set delegate for account
   * @param account address
   */
  function setDelegate(address account) external {
    if (proposedDelegates[account] != msg.sender)
      revert DelegateNotProposed(account);
    if (delegateAccounts[msg.sender] != address(0))
      revert DelegateTaken(account);
    if (stakes[msg.sender].balance != 0) revert DelegateStaked(account);
    accountDelegates[account] = msg.sender;
    delegateAccounts[msg.sender] = account;
    delete proposedDelegates[account];
    emit SetDelegate(msg.sender, account);
  }

  /**
   * @notice Unset delegate for account
   * @param delegate address
   */
  function unsetDelegate(address delegate) external {
    if (accountDelegates[msg.sender] != delegate)
      revert DelegateNotSet(delegate);
    accountDelegates[msg.sender] = address(0);
    delegateAccounts[delegate] = address(0);
  }

  /**
   * @notice Stake tokens
   * @param amount uint256
   */
  function stake(uint256 amount) external override {
    if (delegateAccounts[msg.sender] != address(0)) {
      _stake(delegateAccounts[msg.sender], amount);
    } else {
      _stake(msg.sender, amount);
    }
  }

  /**
   * @notice Unstake tokens
   * @param amount uint256
   */
  function unstake(uint256 amount) external override {
    address account;
    delegateAccounts[msg.sender] != address(0)
      ? account = delegateAccounts[msg.sender]
      : account = msg.sender;
    _unstake(account, amount);
    token.safeTransfer(account, amount);
    emit Transfer(account, address(0), amount);
  }

  /**
   * @notice Receive stakes for an account
   * @param account address
   */
  function getStakes(
    address account
  ) external view override returns (Stake memory accountStake) {
    return stakes[account];
  }

  /**
   * @notice Get total balance of all staked accounts
   */
  function totalSupply() external view override returns (uint256) {
    return token.balanceOf(address(this));
  }

  /**
   * @notice Get balance of an account
   */
  function balanceOf(
    address account
  ) external view override returns (uint256 total) {
    return stakes[account].balance;
  }

  /**
   * @notice Get decimals of underlying token
   */
  function decimals() external view override returns (uint8) {
    return token.decimals();
  }

  /**
   * @notice Stake tokens for an account
   * @param account address
   * @param amount uint256
   */
  function stakeFor(address account, uint256 amount) public override {
    if (delegateAccounts[account] != address(0)) {
      _stake(delegateAccounts[account], amount);
    } else {
      _stake(account, amount);
    }
  }

  /**
   * @notice Available amount for an account
   * @param account uint256
   */
  function available(address account) public view override returns (uint256) {
    Stake storage selected = stakes[account];
    uint256 _available = (selected.balance *
      (block.timestamp - selected.timestamp)) /
      (selected.maturity - selected.timestamp);
    if (_available >= selected.balance) {
      return selected.balance;
    } else {
      return _available;
    }
  }

  /**
   * @notice Stake tokens for an account
   * @param account address
   * @param amount uint256
   */
  function _stake(address account, uint256 amount) internal {
    if (amount <= 0) revert AmountInvalid(amount);
    stakes[account].duration = duration;
    if (stakes[account].balance == 0) {
      stakes[account].balance = amount;
      stakes[account].timestamp = block.timestamp;
      stakes[account].maturity =
        stakes[account].timestamp +
        stakes[account].duration;
    } else {
      uint256 nowAvailable = available(account);
      stakes[account].balance = stakes[account].balance + amount;
      stakes[account].timestamp =
        block.timestamp -
        ((nowAvailable * stakes[account].duration) / stakes[account].balance);
      stakes[account].maturity =
        stakes[account].timestamp +
        stakes[account].duration;
    }
    token.safeTransferFrom(msg.sender, address(this), amount);
    emit Transfer(address(0), account, amount);
  }

  /**
   * @notice Unstake tokens
   * @param account address
   * @param amount uint256
   */
  function _unstake(address account, uint256 amount) internal {
    Stake storage selected = stakes[account];
    if (amount > available(account)) revert AmountInvalid(amount);
    uint256 nowAvailable = available(account);
    selected.balance = selected.balance - amount;
    selected.timestamp =
      block.timestamp -
      (((10000 - ((10000 * amount) / nowAvailable)) *
        (block.timestamp - selected.timestamp)) / 10000);
  }
}
