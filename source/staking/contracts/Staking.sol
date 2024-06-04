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

  // ERC20 token properties
  string public name;
  string public symbol;

  // Token to be staked
  ERC20 public immutable stakingToken;

  // Current stake duration
  uint256 public stakeDuration;

  // Proposed stake duration (subject to timelock)
  uint256 private proposedStakeDuration;

  // Minimum timelock for change to stake duration
  uint256 private immutable minimumTimelock;

  // Time after which change to stake duration can be completed
  uint256 private activeTimelock;

  // Mapping of staker to proposed delegate
  mapping(address staker => address delegate) public proposedDelegates;

  // Mapping of staker to delegate
  mapping(address staker => address delegate) public stakerDelegates;

  // Mapping of delegate to staker
  mapping(address delegate => address staker) public delegateStakers;

  // Mapping of staker to stake
  mapping(address staker => Stake stake) public stakes;

  // Whether stakes are unlocked
  bool private unlocked;

  /**
   * @notice Staking constructor
   * @param _name string Token name for this contract
   * @param _symbol string Token symbol for this contract
   * @param _stakingToken address Token used for staking
   * @param _stakeDuration uint256 Required duration for each new stake
   * @param _minimumTimelock uint256 Time delay for a duration change
   */
  constructor(
    string memory _name,
    string memory _symbol,
    ERC20 _stakingToken,
    uint256 _stakeDuration,
    uint256 _minimumTimelock
  ) {
    stakingToken = _stakingToken;
    stakeDuration = _stakeDuration;
    minimumTimelock = _minimumTimelock;
    name = _name;
    symbol = _symbol;
  }

  /**
   * @notice Stake tokens for msg.sender
   * @param _amount uint256
   */
  function stake(uint256 _amount) external override {
    stakeFor(msg.sender, _amount);
  }

  /**
   * @notice Stake tokens
   * @param _staker address
   * @param _amount uint256
   */
  function stakeFor(address _staker, uint256 _amount) public override {
    // Ensure _amount to stake is non-zero
    if (_amount == 0) revert AmountInvalid(0);

    // Stake as delegate if set
    if (delegateStakers[_staker] != address(0)) {
      _staker = delegateStakers[_staker];
    }

    // Either create or update the stake
    if (stakes[_staker].balance == 0) {
      stakes[_staker].start = block.timestamp;
      stakes[_staker].balance = _amount;
    } else {
      // Update start according to progress and stake _amount
      // Calc: Now - (Duration * (Available / New Stake Balance))
      stakes[_staker].start =
        block.timestamp -
        (stakeDuration * available(_staker)) /
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
   * @notice Unstake tokens
   * @param _amount uint256
   */
  function unstake(uint256 _amount) external override {
    // Ensure _amount to unstake is non-zero
    if (_amount == 0) revert AmountInvalid(0);

    // Unstake as delegate if set
    address _staker = msg.sender;
    if (delegateStakers[msg.sender] != address(0)) {
      _staker = delegateStakers[msg.sender];
    }

    // Select stake and currently available
    Stake storage _selected = stakes[_staker];
    uint256 currentlyAvailable = available(_staker);

    // Ensure _amount does not exceed available
    if (_amount > currentlyAvailable) revert AmountInvalid(_amount);

    // Update start according to progress and unstake _amount
    // Calc: Now - ((Now - Start) * ((Available - Unstake Amount) / Available))
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

  /**
   * @notice Amount available to unstake
   * @dev Linear from start to finish (0 to 100%)
   * @param _staker uint256
   */
  function available(address _staker) public view override returns (uint256) {
    Stake storage _selected = stakes[_staker];
    if (unlocked || block.timestamp >= _selected.finish) {
      return _selected.balance;
    }
    // Calc: (Balance * (Now - Start)) / (Finish - Start)
    return
      (_selected.balance * (block.timestamp - _selected.start)) /
      (_selected.finish - _selected.start);
  }

  /**
   * @notice Get balance of a staker
   * @param _staker address
   */
  function balanceOf(address _staker) external view override returns (uint256) {
    return stakes[_staker].balance;
  }

  /**
   * @notice Get total of all staked balances
   */
  function totalSupply() external view override returns (uint256) {
    return stakingToken.balanceOf(address(this));
  }

  /**
   * @notice Get decimals of underlying token
   */
  function decimals() external view override returns (uint8) {
    return stakingToken.decimals();
  }

  /**
   * @notice Propose delegate
   * @param _to address
   */
  function proposeDelegate(address _to) external {
    if (stakerDelegates[msg.sender] != address(0))
      revert SenderHasDelegate(msg.sender, _to);
    if (delegateStakers[_to] != address(0)) revert DelegateTaken(_to);
    if (stakes[_to].balance != 0) revert DelegateStaked(_to);
    proposedDelegates[msg.sender] = _to;
    emit ProposeDelegate(msg.sender, _to);
  }

  /**
   * @notice Accept delegate proposal
   * @param _from address
   */
  function acceptDelegateProposal(address _from) external {
    if (proposedDelegates[_from] != msg.sender)
      revert DelegateNotProposed(_from);
    if (delegateStakers[msg.sender] != address(0)) revert DelegateTaken(_from);
    if (stakes[msg.sender].balance != 0) revert DelegateStaked(_from);
    stakerDelegates[_from] = msg.sender;
    delegateStakers[msg.sender] = _from;
    delete proposedDelegates[_from];
    emit SetDelegate(_from, msg.sender);
  }

  /**
   * @notice Unset delegate
   * @param _delegate address
   */
  function unsetDelegate(address _delegate) external {
    if (stakerDelegates[msg.sender] != _delegate)
      revert DelegateNotSet(_delegate);
    stakerDelegates[msg.sender] = address(0);
    delegateStakers[_delegate] = address(0);
    emit UnsetDelegate(msg.sender, _delegate);
  }

  /**
   * @notice Set timelock for duration change
   * @param _proposedStakeDuration uint256
   * @param _durationChangeDelay uint256
   */
  function scheduleDurationChange(
    uint256 _proposedStakeDuration,
    uint256 _durationChangeDelay
  ) external onlyOwner {
    if (activeTimelock != 0) revert TimelockActive();
    if (_durationChangeDelay < minimumTimelock)
      revert DelayInvalid(_durationChangeDelay);
    if (_proposedStakeDuration == 0)
      revert DurationInvalid(_proposedStakeDuration);
    activeTimelock = block.timestamp + _durationChangeDelay;
    proposedStakeDuration = _proposedStakeDuration;
    emit ScheduleDurationChange(proposedStakeDuration, activeTimelock);
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
   * @notice Unlock (or re-lock) stakes
   * @param _unlocked bool Either locked or unlocked
   */
  function setUnlocked(bool _unlocked) external onlyOwner {
    unlocked = _unlocked;
    emit SetUnlocked(_unlocked);
  }

  /**
   * @notice Complete timelocked duration change
   */
  function completeDurationChange() external onlyOwner {
    if (activeTimelock == 0) revert TimelockInactive();
    if (block.timestamp < activeTimelock) revert Timelocked();
    stakeDuration = proposedStakeDuration;
    delete activeTimelock;
    delete proposedStakeDuration;
    emit CompleteDurationChange(stakeDuration);
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
}
