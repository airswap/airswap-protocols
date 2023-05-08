// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IStaking.sol";

/**
 * @title AirSwap: Stake Tokens
 * @notice https://www.airswap.io/
 */
contract Staking is IStaking, Ownable {
  using SafeERC20 for ERC20;

  // Token to be staked
  ERC20 public immutable stakingToken;

  // Unstaking duration
  uint256 public stakingDuration;

  // Minimum delay to staking duration change
  uint256 private minDurationChangeDelay;

  // Timestamp after which staking duration change is possible
  uint256 private activeDurationChangeTimestamp;

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
   * @param _name string Token name for this contract
   * @param _symbol string Token symbol for this contract
   * @param _stakingToken address Token used for staking
   * @param _stakingDuration uint256 Amount of time tokens are staked
   * @param _minDurationChangeDelay uint256 Time delay for a duration change
   */
  constructor(
    string memory _name,
    string memory _symbol,
    ERC20 _stakingToken,
    uint256 _stakingDuration,
    uint256 _minDurationChangeDelay
  ) {
    stakingToken = _stakingToken;
    stakingDuration = _stakingDuration;
    minDurationChangeDelay = _minDurationChangeDelay;
    name = _name;
    symbol = _symbol;
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
   * @param _delay uint256
   */
  function scheduleDurationChange(uint256 _delay) external onlyOwner {
    if (activeDurationChangeTimestamp != 0) revert TimelockActive();
    if (_delay < minDurationChangeDelay) revert DelayInvalid(_delay);
    activeDurationChangeTimestamp = block.timestamp + _delay;
    emit ScheduleDurationChange(activeDurationChangeTimestamp);
  }

  /**
   * @dev Cancels timelock to change duration
   */
  function cancelDurationChange() external onlyOwner {
    if (activeDurationChangeTimestamp == 0) revert TimelockInactive();
    delete activeDurationChangeTimestamp;
    emit CancelDurationChange();
  }

  /**
   * @notice Set unstaking duration
   * @param _stakingDuration uint256
   */
  function setDuration(uint256 _stakingDuration) external onlyOwner {
    if (_stakingDuration == 0) revert DurationInvalid(_stakingDuration);
    if (activeDurationChangeTimestamp == 0) revert TimelockInactive();
    if (block.timestamp < activeDurationChangeTimestamp) revert Timelocked();
    stakingDuration = _stakingDuration;
    delete activeDurationChangeTimestamp;
    emit CompleteDurationChange(_stakingDuration);
  }

  /**
   * @notice Propose delegate for account
   * @param _delegate address
   */
  function proposeDelegate(address _delegate) external {
    if (accountDelegates[msg.sender] != address(0))
      revert SenderHasDelegate(msg.sender, _delegate);
    if (delegateAccounts[_delegate] != address(0))
      revert DelegateTaken(_delegate);
    if (stakes[_delegate].balance != 0) revert DelegateStaked(_delegate);
    proposedDelegates[msg.sender] = _delegate;
    emit ProposeDelegate(_delegate, msg.sender);
  }

  /**
   * @notice Set delegate for account
   * @param _account address
   */
  function setDelegate(address _account) external {
    if (proposedDelegates[_account] != msg.sender)
      revert DelegateNotProposed(_account);
    if (delegateAccounts[msg.sender] != address(0))
      revert DelegateTaken(_account);
    if (stakes[msg.sender].balance != 0) revert DelegateStaked(_account);
    accountDelegates[_account] = msg.sender;
    delegateAccounts[msg.sender] = _account;
    delete proposedDelegates[_account];
    emit SetDelegate(msg.sender, _account);
  }

  /**
   * @notice Unset delegate for account
   * @param _delegate address
   */
  function unsetDelegate(address _delegate) external {
    if (accountDelegates[msg.sender] != _delegate)
      revert DelegateNotSet(_delegate);
    accountDelegates[msg.sender] = address(0);
    delegateAccounts[_delegate] = address(0);
  }

  /**
   * @notice Stake tokens
   * @param _amount uint256
   */
  function stake(uint256 _amount) external override {
    if (delegateAccounts[msg.sender] != address(0)) {
      _stake(delegateAccounts[msg.sender], _amount);
    } else {
      _stake(msg.sender, _amount);
    }
  }

  /**
   * @notice Unstake tokens
   * @param _amount uint256
   */
  function unstake(uint256 _amount) external override {
    address _account;
    delegateAccounts[msg.sender] != address(0)
      ? _account = delegateAccounts[msg.sender]
      : _account = msg.sender;
    _unstake(_account, _amount);
  }

  /**
   * @notice Receive stakes for an account
   * @param _account address
   */
  function getStakes(
    address _account
  ) external view override returns (Stake memory _accountStake) {
    return stakes[_account];
  }

  /**
   * @notice Get total balance of all staked accounts
   */
  function totalSupply() external view override returns (uint256) {
    return stakingToken.balanceOf(address(this));
  }

  /**
   * @notice Get balance of an account
   * @param _account address
   */
  function balanceOf(
    address _account
  ) external view override returns (uint256 total) {
    return stakes[_account].balance;
  }

  /**
   * @notice Get decimals of underlying token
   */
  function decimals() external view override returns (uint8) {
    return stakingToken.decimals();
  }

  /**
   * @notice Stake tokens for an account
   * @param _account address
   * @param _amount uint256
   */
  function stakeFor(address _account, uint256 _amount) public override {
    if (delegateAccounts[_account] != address(0)) {
      _stake(delegateAccounts[_account], _amount);
    } else {
      _stake(_account, _amount);
    }
  }

  /**
   * @notice Amount available to withdraw for a given account
   * @param _account uint256
   */
  function available(address _account) public view override returns (uint256) {
    Stake storage _selected = stakes[_account];
    uint256 _available = (_selected.balance *
      (block.timestamp - _selected.timestamp)) /
      (_selected.maturity - _selected.timestamp);
    if (_available >= _selected.balance) {
      return _selected.balance;
    } else {
      return _available;
    }
  }

  /**
   * @notice Stake tokens for an account
   * @param _account address
   * @param _amount uint256
   */
  function _stake(address _account, uint256 _amount) internal {
    if (_amount <= 0) revert AmountInvalid(_amount);
    stakes[_account].duration = stakingDuration;
    if (stakes[_account].balance == 0) {
      stakes[_account].balance = _amount;
      stakes[_account].timestamp = block.timestamp;
      stakes[_account].maturity =
        stakes[_account].timestamp +
        stakes[_account].duration;
    } else {
      uint256 _nowAvailable = available(_account);
      stakes[_account].balance = stakes[_account].balance + _amount;
      stakes[_account].timestamp =
        block.timestamp -
        ((_nowAvailable * stakes[_account].duration) /
          stakes[_account].balance);
      stakes[_account].maturity =
        stakes[_account].timestamp +
        stakes[_account].duration;
    }
    stakingToken.safeTransferFrom(msg.sender, address(this), _amount);
    emit Transfer(address(0), _account, _amount);
  }

  /**
   * @notice Unstake tokens
   * @param _account address
   * @param _amount uint256
   */
  function _unstake(address _account, uint256 _amount) internal {
    Stake storage _selected = stakes[_account];
    if (_amount > available(_account)) revert AmountInvalid(_amount);
    uint256 nowAvailable = available(_account);
    _selected.balance = _selected.balance - _amount;
    _selected.timestamp =
      block.timestamp -
      (((10000 - ((10000 * _amount) / nowAvailable)) *
        (block.timestamp - _selected.timestamp)) / 10000);
    stakingToken.safeTransfer(_account, _amount);
    emit Transfer(_account, address(0), _amount);
  }
}
