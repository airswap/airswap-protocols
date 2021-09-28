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

  // Vesting duration min and max
  uint256 public vestingLength;

  // Mapping of account to stakes
  mapping(address => Stake) internal allStakes;

  // Mapping of account to delegate
  mapping(address => address) public accountDelegate;
  mapping(address => address) public delegateAccount;
  mapping(address => bool) public isDelegate;

  // ERC-20 token properties
  string public name;
  string public symbol;

  // ERC-20 Transfer event
  event Transfer(address indexed from, address indexed to, uint256 tokens);

  /**
   * @notice Constructor
   * @param _token address
   * @param _name string
   * @param _symbol string
   * @param _vestingLength uint256
   */
  constructor(
    ERC20 _token,
    string memory _name,
    string memory _symbol,
    uint256 _vestingLength
  ) {
    token = _token;
    name = _name;
    symbol = _symbol;
    setVesting(_vestingLength);
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
   * @notice Add delegate for account
   * @param delegate address
   */
  function addDelegate(address delegate) external {
    require(!isDelegate[delegate], "ALREADY_DELEGATE");
    require(allStakes[delegate].balance == 0, "ALREADY_STAKING");
    accountDelegate[msg.sender] = delegate;
    isDelegate[delegate] = true;
    delegateAccount[delegate] = msg.sender;
  }

  /**
   * @notice Remove delegate for account
   * @param delegate address
   */
  function removeDelegate(address delegate) external {
    require(accountDelegate[msg.sender] == delegate, "NOT_DELEGATE");
    accountDelegate[msg.sender] = address(0);
    isDelegate[delegate] = false;
    delegateAccount[delegate] = address(0);
  }

  /**
   * @notice Stake tokens
   * @param amount uint256
   */
  function stake(uint256 amount) external {
    if (isDelegate[msg.sender]) {
      _stake(delegateAccount[msg.sender], amount);
    } else {
      _stake(msg.sender, amount);
    }
  }

  /**
   * @notice Unstake multiple
   * @param amount uint256
   */
  function unstake(uint256 amount) external {
    uint256 totalAmount = 0;
    address account;
    isDelegate[msg.sender]
      ? account = delegateAccount[msg.sender]
      : account = msg.sender;
    _unstake(account, amount);
    totalAmount += amount;

    if (totalAmount > 0) {
      token.transfer(account, totalAmount);
      emit Transfer(account, address(0), totalAmount);
    }
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
    return allStakes[account];
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
    return allStakes[account].balance;
  }

  /**
   * @notice Decimals of underlying token (ERC-20)
   */
  function decimals() external view returns (uint8) {
    return token.decimals();
  }

  /**
   * @notice Set vesting config
   * @param _vestingLength uint256
   */
  function setVesting(uint256 _vestingLength) public onlyOwner {
    require(_vestingLength != 0, "INVALID_VESTING");
    vestingLength = _vestingLength;
  }

  /**
   * @notice Stake tokens for an account
   * @param account address
   * @param amount uint256
   */
  function stakeFor(address account, uint256 amount) external {
    _stake(account, amount);
  }

  /**
   * @notice Available amount for an account
   * @param account uint256
   */
  function available(address account) public view returns (uint256) {
    Stake storage selected = allStakes[account];
    uint256 _available = (block.timestamp.sub(selected.timestamp))
      .mul(selected.balance)
      .div(selected.duration);
    if (_available >= allStakes[account].balance) {
      return allStakes[account].balance;
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
    allStakes[account].duration = vestingLength;
    if (allStakes[account].balance == 0) {
      allStakes[account].balance = amount;
      allStakes[account].timestamp = block.timestamp;
    } else {
      uint256 nowAvailable = available(account);
      allStakes[account].balance = allStakes[account].balance.add(amount);
      allStakes[account].timestamp = block.timestamp.sub(
        nowAvailable.mul(allStakes[account].duration).div(
          allStakes[account].balance
        )
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
    Stake storage selected = allStakes[account];
    require(amount <= available(account), "AMOUNT_EXCEEDS_AVAILABLE");
    selected.balance = selected.balance.sub(amount);
  }
}