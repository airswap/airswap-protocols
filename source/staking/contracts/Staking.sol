// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
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
   * @param _delay uint256
   */
  function scheduleDurationChange(uint256 _delay) external onlyOwner {
    if (timeUnlock != 0) revert TimelockActive();
    if (_delay < minDelay) revert DelayInvalid(_delay);
    timeUnlock = block.timestamp + _delay;
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
    token.safeTransfer(_account, _amount);
    emit Transfer(_account, address(0), _amount);
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
    return token.balanceOf(address(this));
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
    return token.decimals();
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
   * @notice Amountt available for withdrawal for a given account
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
    stakes[_account].duration = duration;
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
    token.safeTransferFrom(msg.sender, address(this), _amount);
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
  }
}
