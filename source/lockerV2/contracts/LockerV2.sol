//SPDX-License-Identifier: Unlicense
pragma solidity ^0.7.6;
pragma abicoder v2;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/Math.sol";

contract LockerV2 is Ownable {
  using SafeERC20 for IERC20;
  using SafeMath for uint256;
  struct Stake {
    uint256 initialAmount;
    uint256 claimableAmount;
    uint256 blockNumber;
  }

  IERC20 public immutable stakingToken;
  uint256 public immutable cliff;
  uint256 public immutable periodLength;
  uint256 public immutable percentPerPeriod;
  mapping(address => Stake[]) public stakes;

  constructor(
    IERC20 _stakingToken,
    uint256 _cliff,
    uint256 _periodLength,
    uint256 _percentPerPeriod
  ) public {
    stakingToken = _stakingToken;
    cliff = _cliff;
    periodLength = _periodLength;
    percentPerPeriod = _percentPerPeriod;
  }

  function stake(uint256 amount) external {
    stakes[msg.sender].push(Stake(amount, amount, block.number));
    stakingToken.safeTransferFrom(msg.sender, address(this), amount);
  }

  function stakeFor(address account, uint256 amount) external {
    stakes[account].push(Stake(amount, amount, block.number));
    stakingToken.safeTransferFrom(account, address(this), amount);
  }

  function unstake(uint256 index, uint256 amount) external {
    Stake storage stakeData = stakes[msg.sender][index];
    require(
      block.number.sub(stakeData.blockNumber) < cliff,
      "cliff not reached"
    );
    uint256 vested = vested(index, msg.sender);
    uint256 withdrawableAmount = availableToUnstake(index, msg.sender);
    uint256 amountToWithdraw = Math.min(withdrawableAmount, amount);
    stakeData.claimableAmount = stakeData.claimableAmount.sub(amountToWithdraw);
    if (stakeData.claimableAmount == 0) {
      // remove stake element if claimable amount goes to 0
      Stake[] storage accountStakes = stakes[msg.sender];
      stakeData = accountStakes[accountStakes.length.sub(1)];
      stakes[msg.sender].pop();
    }
    stakingToken.transfer(msg.sender, amountToWithdraw);
  }

  function vested(uint256 index, address account)
    public
    view
    returns (uint256)
  {
    Stake storage stakeData = stakes[account][index];
    uint256 numPeriods =
      (block.number.sub(stakeData.blockNumber)).div(periodLength);
    return
      (percentPerPeriod.mul(numPeriods).mul(stakeData.initialAmount)).div(100);
  }

  function availableToUnstake(uint256 index, address account)
    public
    view
    returns (uint256)
  {
    uint256 vestedAmount = vested(index, account);
    uint256 claimableAmount = stakes[account][index].claimableAmount;
    return Math.min(vestedAmount, claimableAmount);
  }

  function balanceOf(address account) external view returns (uint256) {
    Stake[] memory accountStakes = stakes[account];
    uint256 stakedBalance = 0;
    for (uint256 i = 0; i < accountStakes.length; i++) {
      stakedBalance = stakedBalance.add(accountStakes[i].claimableAmount);
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
