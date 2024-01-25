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

  // Stake duration
  uint256 public stakeDuration;

  // Minimum delay for a change to stake duration
  uint256 private immutable minDurationChangeDelay;

  // Time after which change to stake duration is possible
  uint256 private activeDurationChangeTimestamp;

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
   * @param _stakingToken address Token used for stake
   * @param _stakeDuration uint256 Amount of time tokens are staked
   * @param _minDurationChangeDelay uint256 Time delay for a duration change
   */
  constructor(
    string memory _name,
    string memory _symbol,
    ERC20 _stakingToken,
    uint256 _stakeDuration,
    uint256 _minDurationChangeDelay
  ) {
    stakingToken = _stakingToken;
    stakeDuration = _stakeDuration;
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
   * @notice Set stake duration
   * @param _stakeDuration uint256
   */
  function setDuration(uint256 _stakeDuration) external onlyOwner {
    if (_stakeDuration == 0) revert DurationInvalid(_stakeDuration);
    if (activeDurationChangeTimestamp == 0) revert TimelockInactive();
    if (block.timestamp < activeDurationChangeTimestamp) revert Timelocked();
    stakeDuration = _stakeDuration;
    delete activeDurationChangeTimestamp;
    emit CompleteDurationChange(_stakeDuration);
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
   * @param _staker address
   */
  function setDelegate(address _staker) external {
    if (proposedDelegates[_staker] != msg.sender)
      revert DelegateNotProposed(_staker);
    if (delegateAccounts[msg.sender] != address(0))
      revert DelegateTaken(_staker);
    if (stakes[msg.sender].balance != 0) revert DelegateStaked(_staker);
    accountDelegates[_staker] = msg.sender;
    delegateAccounts[msg.sender] = _staker;
    delete proposedDelegates[_staker];
    emit SetDelegate(msg.sender, _staker);
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
   * @param _staker address
   */
  function getStakes(
    address _staker
  ) external view override returns (Stake memory) {
    return stakes[_staker];
  }

  /**
   * @notice Get total balance of all staked accounts
   */
  function totalSupply() external view override returns (uint256) {
    return stakingToken.balanceOf(address(this));
  }

  /**
   * @notice Get balance of an account
   * @param _staker address
   */
  function balanceOf(address _staker) external view override returns (uint256) {
    return stakes[_staker].balance;
  }

  /**
   * @notice Get decimals of underlying token
   */
  function decimals() external view override returns (uint8) {
    return stakingToken.decimals();
  }

  /**
   * @notice Stake tokens for an account
   * @param _staker address
   * @param _amount uint256
   */
  function stakeFor(address _staker, uint256 _amount) external override {
    if (delegateAccounts[_staker] != address(0)) {
      _stake(delegateAccounts[_staker], _amount);
    } else {
      _stake(_staker, _amount);
    }
  }

  /**
   * @notice Amount available to unstake for a given account
   * @dev Progresses linearly from start to finish (0 to 100%)
   * @param _staker uint256
   */
  function available(address _staker) public view override returns (uint256) {
    Stake storage _selected = stakes[_staker];
    if (block.timestamp >= _selected.finish) {
      return _selected.balance;
    }
    // Calc: (Balance * (Now - Start)) / (Finish - Start)
    return
      (_selected.balance * (block.timestamp - _selected.start)) /
      (_selected.finish - _selected.start);
  }

  /**
   * @notice Stake tokens for an account
   * @param _staker address
   * @param _amount uint256
   */
  function _stake(address _staker, uint256 _amount) private {
    // Ensure _amount to stake is non-zero
    if (_amount == 0) revert AmountInvalid(_amount);

    // Either create or update the stake
    if (stakes[_staker].balance == 0) {
      stakes[_staker].start = block.timestamp;
      stakes[_staker].balance = _amount;
    } else {
      // Update start accounting for progress and stake _amount
      // Calc: Now - (Available / Stake Amount) * Duration
      stakes[_staker].start =
        block.timestamp -
        (available(_staker) * stakeDuration) /
        (stakes[_staker].balance + _amount);

      // Add _amount to stake balance
      stakes[_staker].balance = stakes[_staker].balance + _amount;
    }

    // Update finish with new start plus duration
    stakes[_staker].finish = stakes[_staker].start + stakeDuration;

    // Transfer from msg.sender to this contract
    stakingToken.safeTransferFrom(msg.sender, address(this), _amount);

    // Mint staked tokens for the _staker
    emit Transfer(address(0), _staker, _amount);
  }

  /**
   * @notice Unstake tokens for an account
   * @param _staker address
   * @param _amount uint256
   */
  function _unstake(address _staker, uint256 _amount) private {
    Stake storage _selected = stakes[_staker];
    uint256 currentlyAvailable = available(_staker);

    // Ensure _amount does not exceed available
    if (_amount > currentlyAvailable) revert AmountInvalid(_amount);

    // Update start accounting for progress and unstake _amount
    // Calc: Now - ((Now - Start) * (Available - Unstake Amount)) / Available
    _selected.start =
      block.timestamp -
      (((block.timestamp - _selected.start) * (currentlyAvailable - _amount)) /
        currentlyAvailable);

    // Subtract _amount from stake balance
    _selected.balance = _selected.balance - _amount;

    // Delete the stake if it is now zero
    if (_selected.balance == 0) delete stakes[_staker];

    // Transfer from this contract to the _staker
    stakingToken.safeTransfer(_staker, _amount);

    // Burn staked tokens for the _staker
    emit Transfer(_staker, address(0), _amount);
  }
}
