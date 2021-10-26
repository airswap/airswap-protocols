// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title AirSwap Staking: Stake and Unstake Tokens
 * @notice https://www.airswap.io/
 */
contract Staking is Ownable {
  using SafeERC20 for ERC20;
  using SafeMath for uint256;
  struct Stake {
    uint256 duration;
    uint256 balance;
    uint256 timestamp;
  }

  // Token to be staked
  ERC20 public immutable token;

  // Unstaking duration
  uint256 public duration;

  // Timelock delay
  uint256 private minDelay;

  // Timelock toggle
  bool private timelockState;

  // Mapping of account to stakes
  mapping(address => Stake) internal stakes;

  // Mapping of account to proposed delegate
  mapping(address => address) public proposedDelegates;

  // Mapping of account to delegate
  mapping(address => address) public accountDelegates;

  // Mapping of delegate to account
  mapping(address => address) public delegateAccounts;

  // Mapping of timelock ids to used state
  mapping(bytes32 => bool) private usedIds;

  // Mapping of ids to timestamps
  mapping(bytes32 => uint256) private unlockTimestamps;

  // ERC-20 token properties
  string public name;
  string public symbol;

  // ERC-20 Transfer event
  event Transfer(address indexed from, address indexed to, uint256 tokens);

  // Schedule timelock event
  event ScheduleDurationChange(bytes32 indexed id, uint256 indexed unlockTimestamp);

  // Cancel timelock event
  event CancelDurationChange(bytes32 indexed id);

  // Complete timelock event
  event CompleteDurationChange(bytes32 indexed id, uint256 indexed newDuration);

  // Propose Delegate event
  event ProposeDelegate(address indexed delegate, address indexed account);

  // Set Delegate event
  event SetDelegate(address indexed delegate, address indexed account);

  /**
   * @notice Constructor
   * @param _token address
   * @param _name string
   * @param _symbol string
   * @param _duration uint256
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
   * @notice Set metadata config
   * @param _name string
   * @param _symbol string
   */
  function setMetaData(string memory _name, string memory _symbol)
    external
    onlyOwner
  {
    name = _name;
    symbol = _symbol;
  }

  /**
   * @notice Propose delegate for account
   * @param delegate address
   */
  function proposeDelegate(address delegate) external {
    require(accountDelegates[msg.sender] == address(0), "SENDER_HAS_DELEGATE");
    require(delegateAccounts[delegate] == address(0), "DELEGATE_IS_TAKEN");
    require(stakes[delegate].balance == 0, "DELEGATE_MUST_NOT_BE_STAKED");
    proposedDelegates[msg.sender] = delegate;
    emit ProposeDelegate(delegate, msg.sender);
  }

  /**
   * @notice Set delegate for account
   * @param account address
   */
  function setDelegate(address account) external {
    require(proposedDelegates[account] == msg.sender, "MUST_BE_PROPOSED");
    require(delegateAccounts[msg.sender] == address(0), "DELEGATE_IS_TAKEN");
    require(stakes[msg.sender].balance == 0, "DELEGATE_MUST_NOT_BE_STAKED");
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
    require(accountDelegates[msg.sender] == delegate, "DELEGATE_NOT_SET");
    accountDelegates[msg.sender] = address(0);
    delegateAccounts[delegate] = address(0);
  }

  /**
   * @notice Stake tokens
   * @param amount uint256
   */
  function stake(uint256 amount) external {
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
  function unstake(uint256 amount) external {
    address account;
    delegateAccounts[msg.sender] != address(0)
      ? account = delegateAccounts[msg.sender]
      : account = msg.sender;
    _unstake(account, amount);
    token.transfer(account, amount);
    emit Transfer(account, address(0), amount);
  }

  /**
   * @notice Receive stakes for an account
   * @param account address
   */
  function getStakes(address account)
    external
    view
    returns (Stake memory accountStake)
  {
    return stakes[account];
  }

  /**
   * @notice Total balance of all accounts (ERC-20)
   */
  function totalSupply() external view returns (uint256) {
    return token.balanceOf(address(this));
  }

  /**
   * @notice Balance of an account (ERC-20)
   */
  function balanceOf(address account) external view returns (uint256 total) {
    return stakes[account].balance;
  }

  /**
   * @notice Decimals of underlying token (ERC-20)
   */
  function decimals() external view returns (uint8) {
    return token.decimals();
  }

  /**
   * @dev Schedules timelock to change duration
   */
  function scheduleDurationChange(uint256 delay)
    external
    onlyOwner
  {
    require(timelockState == false, "TIMELOCK_ACTIVE");
    require(delay >= minDelay, "INVALID_DELAY");
    uint256 timeUnlock = block.timestamp + minDelay;
    bytes32 id = hashOperation(delay, block.timestamp, timeUnlock);
    unlockTimestamps[id] = timeUnlock;
    timelockState = true;
    emit ScheduleDurationChange(id, timeUnlock);
  }

  /**
   * @dev Cancels timelock to change duration
   */
  function cancelDurationChange(bytes32 timelockId) external onlyOwner {
    require(timelockState == true, "TIMELOCK_INACTIVE");
    timelockState = false;
    emit CancelDurationChange(timelockId);
  }

  /**
   * @dev Returns the identifier of an operation containing a single
   * transaction.
   */
  function hashOperation(
    uint256 delay,
    uint256 timestamp,
    uint256 timeUnlock
  ) public pure virtual returns (bytes32 hash) {
    return keccak256(abi.encode(delay, timestamp, timeUnlock));
  }

  /**
   * @notice Set unstaking duration
   * @param _duration uint256
   */
  function setDuration(uint256 _duration, bytes32 timelockId)
    public
    onlyOwner
  {
    require(_duration != 0, "DURATION_INVALID");
    require(timelockState == true, "TIMELOCK_INACTIVE");
    require(
      unlockTimestamps[timelockId] > 0,
      "INVALID_ID"
    );
    require(
      block.timestamp >= unlockTimestamps[timelockId],
      "TIMELOCK_NOT_PASSED"
    );
    duration = _duration;
    timelockState = false;
    emit CompleteDurationChange(timelockId, _duration);
  }

  /**
   * @notice Stake tokens for an account
   * @param account address
   * @param amount uint256
   */
  function stakeFor(address account, uint256 amount) public {
    _stake(account, amount);
  }

  /**
   * @notice Available amount for an account
   * @param account uint256
   */
  function available(address account) public view returns (uint256) {
    Stake storage selected = stakes[account];
    uint256 _available = (block.timestamp.sub(selected.timestamp))
      .mul(selected.balance)
      .div(selected.duration);
    if (_available >= stakes[account].balance) {
      return stakes[account].balance;
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
    require(amount > 0, "AMOUNT_INVALID");
    stakes[account].duration = duration;
    if (stakes[account].balance == 0) {
      stakes[account].balance = amount;
      stakes[account].timestamp = block.timestamp;
    } else {
      uint256 nowAvailable = available(account);
      stakes[account].balance = stakes[account].balance.add(amount);
      stakes[account].timestamp = block.timestamp.sub(
        nowAvailable.mul(stakes[account].duration).div(stakes[account].balance)
      );
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
    require(amount <= available(account), "AMOUNT_EXCEEDS_AVAILABLE");
    selected.balance = selected.balance.sub(amount);
  }
}
