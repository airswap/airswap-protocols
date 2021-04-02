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
   * @notice Set vesting config
   * @param _duration uint256
   * @param _cliff uint256
   */
  function setVesting(uint256 _duration, uint256 _cliff) external onlyOwner {
    duration = _duration;
    cliff = _cliff;
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
    token.safeTransferFrom(msg.sender, address(this), amount);
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

    Stake storage selected = allStakes[account][index];

    // If selected stake is fully vested create a new stake
    if (vested(account, index) == selected.initial) {
      stakeFor(account, amount);
    } else {
      uint256 newInitial = selected.initial.add(amount);
      uint256 newBalance = selected.balance.add(amount);

      // Calculate a new timestamp proportional to the new amount
      // New timestamp limited to current timestamp (amount / newInitial approaches 1)
      uint256 newTimestamp =
        selected.timestamp +
          amount.mul(block.timestamp.sub(selected.timestamp)).div(newInitial);

      allStakes[account][index] = Stake(
        duration,
        cliff,
        newInitial,
        newBalance,
        newTimestamp
      );
      token.safeTransferFrom(msg.sender, address(this), amount);
      emit Transfer(address(0), account, amount);
    }
  }

  /**
   * @notice Unstake multiple
   * @param amounts uint256[]
   */
  function unstake(uint256[] calldata amounts) external {
    uint256 totalAmount = 0;
    uint256 length = amounts.length;
    while (length-- > 0) {
      if (amounts[length] > 0) {
        _unstake(length, amounts[length]);
        totalAmount += amounts[length];
      }
    }
    if (totalAmount > 0) {
      token.transfer(msg.sender, totalAmount);
      emit Transfer(msg.sender, address(0), totalAmount);
    }
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
    while (length-- > 0) {
      stakes[length] = allStakes[account][length];
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
    uint256 length = stakes.length;
    while (length-- > 0) {
      total = total.add(stakes[length].balance);
    }
    return total;
  }

  /**
   * @notice Decimals of underlying token (ERC-20)
   */
  function decimals() external view returns (uint8) {
    return token.decimals();
  }

  /**
   * @notice Unstake tokens
   * @param index uint256
   * @param amount uint256
   */
  function _unstake(uint256 index, uint256 amount) internal {
    require(index < allStakes[msg.sender].length, "INDEX_OUT_OF_RANGE");
    Stake storage selected = allStakes[msg.sender][index];
    require(
      block.timestamp.sub(selected.timestamp) >= selected.cliff,
      "CLIFF_NOT_REACHED"
    );
    require(amount <= available(msg.sender, index), "AMOUNT_EXCEEDS_AVAILABLE");
    selected.balance = selected.balance.sub(amount);
    if (selected.balance == 0) {
      Stake[] memory stakes = allStakes[msg.sender];
      allStakes[msg.sender][index] = stakes[stakes.length.sub(1)];
      allStakes[msg.sender].pop();
    }
  }
}
