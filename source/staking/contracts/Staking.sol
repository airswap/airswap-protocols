// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
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

  // Minimum timelock for staking duration change
  uint256 private immutable minimumTimelock;

  // Time after which duration change can be completed
  uint256 private activeTimelock;

  // Proposed staking duration during timelock
  uint256 private proposedStakeDuration;

  // Mapping of account to stakes
  mapping(address => Stake) private stakes;

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
   * @notice Staking constructor
   * @param _name string Token name for this contract
   * @param _symbol string Token symbol for this contract
   * @param _stakingToken address Token used for staking
   * @param _stakingDuration uint256 Amount of time tokens are staked
   * @param _minimumTimelock uint256 Time delay for a duration change
   */
  constructor(
    string memory _name,
    string memory _symbol,
    ERC20 _stakingToken,
    uint256 _stakingDuration,
    uint256 _minimumTimelock
  ) {
    stakingToken = _stakingToken;
    stakingDuration = _stakingDuration;
    minimumTimelock = _minimumTimelock;
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
   * @notice Set timelock for duration change
   * @param _proposedStakingDuration uint256
   * @param _durationChangeDelay uint256
   */
  function scheduleDurationChange(
    uint256 _proposedStakingDuration,
    uint256 _durationChangeDelay
  ) external onlyOwner {
    if (activeTimelock != 0) revert TimelockActive();
    if (_durationChangeDelay < minimumTimelock)
      revert DelayInvalid(_durationChangeDelay);
    if (_proposedStakingDuration == 0)
      revert DurationInvalid(_proposedStakingDuration);
    activeTimelock = block.timestamp + _durationChangeDelay;
    proposedStakeDuration = _proposedStakingDuration;
    emit ScheduleDurationChange(activeTimelock);
  }

  /**
   * @notice Cancel timelock for duration change
   */
  function cancelDurationChange() external onlyOwner {
    if (activeTimelock == 0) revert TimelockInactive();
    delete activeTimelock;
    delete proposedStakeDuration;
    emit CancelDurationChange();
  }

  /**
   * @notice Complete timelocked duration change
   */
  function completeDurationChange() external onlyOwner {
    if (activeTimelock == 0) revert TimelockInactive();
    if (block.timestamp < activeTimelock) revert Timelocked();
    stakingDuration = proposedStakeDuration;
    delete activeTimelock;
    delete proposedStakeDuration;
    emit CompleteDurationChange(proposedStakeDuration);
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
    if (delegateAccounts[msg.sender] != address(0)) {
      _unstake(delegateAccounts[msg.sender], _amount);
    } else {
      _unstake(msg.sender, _amount);
    }
  }

  /**
   * @notice Receive stakes for an account
   * @param _account address
   */
  function getStakes(
    address _account
  ) external view override returns (Stake memory) {
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
  ) external view override returns (uint256) {
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
  function stakeFor(address _account, uint256 _amount) external override {
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
    if (_selected.maturity == _selected.timestamp) {
      return _selected.balance;
    } else {
      uint256 _available = (_selected.balance *
        (block.timestamp - _selected.timestamp)) /
        (_selected.maturity - _selected.timestamp);
      if (_available >= _selected.balance) {
        return _selected.balance;
      } else {
        return _available;
      }
    }
  }

  /**
   * @notice Stake tokens for an account
   * @param _account address
   * @param _amount uint256
   */
  function _stake(address _account, uint256 _amount) private {
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
  function _unstake(address _account, uint256 _amount) private {
    Stake storage _selected = stakes[_account];
    uint256 nowAvailable = available(_account);
    if (_amount > nowAvailable) revert AmountInvalid(_amount);
    _selected.balance = _selected.balance - _amount;
    _selected.timestamp = Math.min(
      block.timestamp -
        (((10000 - ((10000 * _amount) / nowAvailable)) *
          (block.timestamp - _selected.timestamp)) / 10000),
      _selected.maturity
    );
    stakingToken.safeTransfer(_account, _amount);
    emit Transfer(_account, address(0), _amount);
  }
}
