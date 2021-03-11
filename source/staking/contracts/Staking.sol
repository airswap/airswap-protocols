//SPDX-License-Identifier: Unlicense
pragma solidity ^0.7.6;
pragma abicoder v2;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/Math.sol";

contract Staking is Ownable {
  using SafeERC20 for IERC20;
  using SafeMath for uint256;
  struct Stake {
    uint256 duration;
    uint256 cliff;
    uint256 initialBalance;
    uint256 currentBalance;
    uint256 timestamp;
  }

  // Token to be staked
  IERC20 public immutable token;

  // Vesting duration and cliff
  uint256 public duration;
  uint256 public cliff;

  // Mapping of account to stakes
  mapping(address => Stake[]) public stakes;

  // ERC-20 token properties
  uint256 public totalSupply;
  string public name;
  string public symbol;
  uint8 public decimals;

  // ERC-20 Transfer event for accounting
  event Transfer(address indexed from, address indexed to, uint256 tokens);

  constructor(
    IERC20 _token,
    string memory _name,
    string memory _symbol,
    uint8 _decimals,
    uint256 _duration,
    uint256 _cliff
  ) public {
    token = _token;
    name = _name;
    symbol = _symbol;
    decimals = _decimals;
    duration = _duration;
    cliff = _cliff;
  }

  function setSchedule(uint256 _duration, uint256 _cliff) external onlyOwner {
    duration = _duration;
    cliff = _cliff;
  }

  function stake(uint256 amount) external {
    stakeFor(msg.sender, amount);
  }

  function stakeFor(address account, uint256 amount) public {
    require(amount > 0, "AMOUNT_INVALID");
    stakes[account].push(
      Stake(duration, cliff, amount, amount, block.timestamp)
    );
    token.safeTransferFrom(account, address(this), amount);
    totalSupply = totalSupply + amount;
    emit Transfer(address(0), account, amount);
  }

  function addToStake(uint256 index, uint256 amount) external {
    addToStakeFor(index, msg.sender, amount);
  }

  function addToStakeFor(
    uint256 index,
    address account,
    uint256 amount
  ) public {
    require(amount > 0, "AMOUNT_INVALID");

    Stake storage existing = stakes[msg.sender][index];

    uint256 newInitialBalance = existing.initialBalance.add(amount);
    uint256 newCurrentBalance = existing.currentBalance.add(amount);
    uint256 passed = block.timestamp.sub(existing.timestamp);
    uint256 newTimestamp;

    // If already vested or amount exceeds balance reset timestamp
    if (passed > duration || amount > existing.initialBalance) {
      newTimestamp = block.timestamp;
    } else {
      newTimestamp = existing.timestamp + passed.mul(passed).div(duration);
    }

    stakes[msg.sender][index] = Stake(
      duration,
      cliff,
      newInitialBalance,
      newCurrentBalance,
      newTimestamp
    );
    token.safeTransferFrom(account, address(this), amount);
    totalSupply = totalSupply + amount;
    emit Transfer(address(0), account, amount);
  }

  function unstake(uint256 index, uint256 amount) external {
    Stake storage stakeData = stakes[msg.sender][index];
    require(
      block.timestamp.sub(stakeData.timestamp) >= stakeData.cliff,
      "CLIFF_NOT_REACHED"
    );
    uint256 withdrawableAmount = availableToUnstake(msg.sender, index);
    require(amount <= withdrawableAmount, "AMOUNT_EXCEEDS_AVAILABLE");
    stakeData.currentBalance = stakeData.currentBalance.sub(amount);
    if (stakeData.currentBalance == 0) {
      // remove stake element if claimable amount goes to 0
      Stake[] storage accountStakes = stakes[msg.sender];
      Stake storage lastStake = accountStakes[accountStakes.length.sub(1)];
      // replace stake at index with last stake
      stakeData.duration = lastStake.duration;
      stakeData.cliff = lastStake.cliff;
      stakeData.initialBalance = lastStake.initialBalance;
      stakeData.currentBalance = lastStake.currentBalance;
      stakeData.timestamp = lastStake.timestamp;
      // remove last stake
      stakes[msg.sender].pop();
    }
    token.transfer(msg.sender, amount);
    totalSupply = totalSupply - amount;
    emit Transfer(msg.sender, address(0), amount);
  }

  function vested(address account, uint256 index)
    public
    view
    returns (uint256)
  {
    Stake storage stakeData = stakes[account][index];
    if (block.timestamp.sub(stakeData.timestamp) > duration) {
      return stakeData.initialBalance;
    }
    return
      stakeData
        .initialBalance
        .mul(block.timestamp.sub(stakeData.timestamp))
        .div(stakeData.duration);
  }

  function availableToUnstake(address account, uint256 index)
    public
    view
    returns (uint256)
  {
    uint256 vestedAmount = vested(account, index);
    uint256 currentBalance = 0;
    Stake memory stakeData = stakes[account][index];
    if (block.timestamp.sub(stakeData.timestamp) >= stakeData.cliff) {
      currentBalance = stakeData.currentBalance;
    }
    return Math.min(vestedAmount, vestedAmount - (stakeData.initialBalance - currentBalance));
  }

  function balanceOf(address account) external view returns (uint256) {
    Stake[] memory accountStakes = stakes[account];
    uint256 stakedBalance = 0;
    for (uint256 i = 0; i < accountStakes.length; i++) {
      stakedBalance = stakedBalance.add(accountStakes[i].currentBalance);
    }
    return stakedBalance;
  }

  function getStakes(address account)
    external
    view
    returns (Stake[] memory accountStakes)
  {
    uint256 length = stakes[account].length;
    accountStakes = new Stake[](length);
    for (uint256 i = 0; i < length; i++) {
      Stake memory stakeData = stakes[account][i];
      accountStakes[i] = stakeData;
    }
    return accountStakes;
  }
}
