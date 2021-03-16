pragma solidity ^0.7.6;
pragma abicoder v2;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/Math.sol";

/**
 * @title Staking: Stake and Unstake Tokens
 */
contract Staking is Ownable {
  using SafeERC20 for ERC20;
  using SafeMath for uint256;
  struct Stake {
    uint256 duration;
    uint256 cliff;
    uint256 initial;
    uint256 balance;
    uint256 timestamp;
  }

  // Token to be staked
  ERC20 public immutable token;

  // Vesting duration and cliff
  uint256 public duration;
  uint256 public cliff;

  // Mapping of account to stakes
  mapping(address => Stake[]) public allStakes;

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
   * @param _duration uint256
   * @param _cliff uint256
   */
  constructor(
    ERC20 _token,
    string memory _name,
    string memory _symbol,
    uint256 _duration,
    uint256 _cliff
  ) {
    token = _token;
    name = _name;
    symbol = _symbol;
    duration = _duration;
    cliff = _cliff;
  }

  /**
   * @notice Set vesting duration and cliff
   * @param _duration uint256
   * @param _cliff uint256
   */
  function setVesting(uint256 _duration, uint256 _cliff) external onlyOwner {
    duration = _duration;
    cliff = _cliff;
  }

  /**
   * @notice Stake tokens
   * @param amount uint256
   */
  function stake(uint256 amount) external {
    stakeFor(msg.sender, amount);
  }

  /**
   * @notice Stake tokens for an account
   * @param account address
   * @param amount uint256
   */
  function stakeFor(address account, uint256 amount) public {
    require(amount > 0, "AMOUNT_INVALID");
    allStakes[account].push(
      Stake(duration, cliff, amount, amount, block.timestamp)
    );
    token.safeTransferFrom(account, address(this), amount);
    emit Transfer(address(0), account, amount);
  }

  /**
   * @notice Extend a stake
   * @param amount uint256
   */
  function extend(uint256 index, uint256 amount) external {
    extendFor(index, msg.sender, amount);
  }

  /**
   * @notice Extend a stake for an account
   * @param index uint256
   * @param account address
   * @param amount uint256
   */
  function extendFor(
    uint256 index,
    address account,
    uint256 amount
  ) public {
    require(amount > 0, "AMOUNT_INVALID");

    Stake storage selected = allStakes[msg.sender][index];

    uint256 newInitial = selected.initial.add(amount);
    uint256 newBalance = selected.balance.add(amount);

    // Calculate a new timestamp proportional to the new amount
    // Limited to current block timestamp (amount / newInitial approaches 1)
    uint256 newTimestamp =
      selected.timestamp +
        amount.mul(block.timestamp.sub(selected.timestamp)).div(newInitial);

    allStakes[msg.sender][index] = Stake(
      duration,
      cliff,
      newInitial,
      newBalance,
      newTimestamp
    );
    token.safeTransferFrom(account, address(this), amount);
    emit Transfer(address(0), account, amount);
  }

  /**
   * @notice Unstake tokens
   * @param index uint256
   * @param amount uint256
   */
  function unstake(uint256 index, uint256 amount) external {
    Stake storage selected = allStakes[msg.sender][index];
    require(
      block.timestamp.sub(selected.timestamp) >= selected.cliff,
      "CLIFF_NOT_REACHED"
    );
    uint256 withdrawableAmount = available(msg.sender, index);
    require(amount <= withdrawableAmount, "AMOUNT_EXCEEDS_AVAILABLE");
    selected.balance = selected.balance.sub(amount);

    if (selected.balance == 0) {
      Stake[] storage stakes = allStakes[msg.sender];
      Stake storage last = stakes[stakes.length.sub(1)];
      selected.duration = last.duration;
      selected.cliff = last.cliff;
      selected.initial = last.initial;
      selected.balance = last.balance;
      selected.timestamp = last.timestamp;
      allStakes[msg.sender].pop();
    }
    token.transfer(msg.sender, amount);
    emit Transfer(msg.sender, address(0), amount);
  }

  /**
   * @notice Vested amount for an account
   * @param account uint256
   * @param index uint256
   */
  function vested(address account, uint256 index)
    public
    view
    returns (uint256)
  {
    Stake storage stakeData = allStakes[account][index];
    if (block.timestamp.sub(stakeData.timestamp) > duration) {
      return stakeData.initial;
    }
    return
      stakeData.initial.mul(block.timestamp.sub(stakeData.timestamp)).div(
        stakeData.duration
      );
  }

  /**
   * @notice Available amount for an account
   * @param account uint256
   * @param index uint256
   */
  function available(address account, uint256 index)
    public
    view
    returns (uint256)
  {
    Stake memory selected = allStakes[account][index];

    if (block.timestamp.sub(selected.timestamp) < selected.cliff) {
      return 0;
    }
    return vested(account, index) - (selected.initial - selected.balance);
  }

  /**
   * @notice All stakes for an account
   * @param account uint256
   */
  function getStakes(address account)
    external
    view
    returns (Stake[] memory stakes)
  {
    uint256 length = allStakes[account].length;
    stakes = new Stake[](length);
    for (uint256 i = 0; i < length; i++) {
      stakes[i] = allStakes[account][i];
    }
    return stakes;
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
    Stake[] memory stakes = allStakes[account];
    for (uint256 i = 0; i < stakes.length; i++) {
      total = total.add(stakes[i].balance);
    }
    return total;
  }

  /**
   * @notice Decimals of underlying token (ERC-20)
   */
  function decimals() external view returns (uint8) {
    return token.decimals();
  }
}
