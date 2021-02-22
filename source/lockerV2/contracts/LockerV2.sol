//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.1;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/Math.sol";

contract LockerV2 is Ownable {
  using SafeERC20 for IERC20;

  event Stake(address participant, uint256 amount);
  event Unstake(address participant, uint256 amount);

  struct Stake {
    uint256 initialAmount;
    uint256 claimableAmount;
    uint256 blockNumber;
  }

  IERC20 public immutable stakingToken;
  uint256 public immutable cliff;
  uint256 public immutable period;
  uint256 public immutable percentPerPeriod;
  mapping(address => Stake[]) public stake;

  constructor(
    IERC20 _stakingToken,
    uint256 _cliff,
    uint256 _period,
    uint256 _percentPerPeriod
  ) public {
    stakingToken = _stakingToken;
    cliff = _cliff;
    period = _period;
    percentPerPeriod = _percentPerPeriod;
  }

  function stake(uint256 amount) external {
    stake[msg.sender].push(Stake(amount, amount, block.number));
    stakingToken.safeTransferFrom(msg.sender, this, amount);
    emit Stake(msg.sender, amount);
  }

  function stakeFor(address account, uint256 amount) external {
    stake[account].push(Stake(amount, amount, block.number));
    stakingToken.safeTransferFrom(account, this, amount);
    emit Stake(account, amount);
  }

  function unstake(uint256 index, uint256 amount) external {
    Stake stakeData = stake[msg.sender][index];
    require(block.number - stakeData.blockNumber < cliff, "cliff not reached");
    uint256 vested = vested(index, msg.sender);
    uint256 withdrawableAmount = unstakeable(index, msg.sender);
    uint256 amountToWithdraw = Math.min(withdrawableAmount, amount);
    stakeData.claimableAmount -= amountToWithdraw;
    if (stakeData.claimableAmount == 0) {
      // remove stake element if claimable amount goes to 0
      Stake[] stakes = stake[msg.sender];
      stakeData[index] = stakes[stakes.length - 1];
      stakes.pop();
    }
    emit Unstake(msg.sender, amountToWithdraw);
    stakingToken.transfer(msg.sender, amountToWithdraw);
  }

  function vested(uint256 index, address account)
    public
    view
    returns (uint256)
  {
    Stake stakeData = stake[account][index];
    uint256 numPeriods = (block.number - stakeData.blockNumber) / period;
    return (percentPerPeriod * numPeriods * stakeData.initialAmount) / 100;
  }

  function unstakeable(uint256 index, address account)
    public
    view
    returns (uint256)
  {
    uint256 vestedAmount = vested(index, account);
    uint256 claimableAmount = stake[account][index].claimableAmount;
    return Math.min(vestedAmount, claimableAmount);
  }

  function stakedBalance(address account) external view returns (uint256) {
    Stake[] stakes = stake[account];
    uint256 stakedBalance = 0;
    for (uint256 i = 0; i < stakes.length; i++) {
      stakedBalance += stakes[account][i].claimableAmount;
    }
    return stakedBalance;
  }
}
