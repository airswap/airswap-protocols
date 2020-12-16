/*
  Copyright 2020 Swap Holdings Ltd.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

pragma solidity ^0.6.12;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

/**
 * @title Locker: Lock and Unlock Token Balances
 */
contract Locker is Ownable {
  using SafeMath for uint256;

  uint256 internal constant MAX_PERCENTAGE = 100;

  // Token to be locked (ERC-20)
  ERC20 public immutable token;

  // Locked token balances per account
  mapping(address => uint256) public balances;

  // Previous withdrawals per epoch
  mapping(address => mapping(uint256 => uint256)) public withdrawals;

  // Total amount locked
  uint256 public totalSupply;

  // ERC-20 token properties
  string public name;
  string public symbol;
  uint8 public decimals;

  // Maximum unlockable percentage per epoch
  uint256 public throttlingPercentage;

  // Duration of each epoch in seconds
  uint256 public throttlingDuration;

  // Balance above which maximum percentage kicks in
  uint256 public throttlingBalance;

  /**
   * @notice Events
   */
  event Lock(address participant, uint256 amount);
  event Unlock(address participant, uint256 amount);
  event SetThrottlingPercentage(uint256 throttlingPercentage);
  event SetThrottlingDuration(uint256 throttlingDuration);
  event SetThrottlingBalance(uint256 throttlingBalance);

  /**
   * @notice Constructor
   * @param _token address
   * @param _name string
   * @param _symbol string
   * @param _decimals uint8
   * @param _throttlingPercentage uint256
   * @param _throttlingDuration uint256
   * @param _throttlingBalance uint256
   */
  constructor(
    address _token,
    string memory _name,
    string memory _symbol,
    uint8 _decimals,
    uint256 _throttlingPercentage,
    uint256 _throttlingDuration,
    uint256 _throttlingBalance
  ) public {
    require(_throttlingPercentage <= MAX_PERCENTAGE, "PERCENTAGE_TOO_HIGH");

    token = ERC20(_token);
    name = _name;
    symbol = _symbol;
    decimals = _decimals;
    throttlingPercentage = _throttlingPercentage;
    throttlingDuration = _throttlingDuration;
    throttlingBalance = _throttlingBalance;

    emit SetThrottlingPercentage(_throttlingPercentage);
    emit SetThrottlingDuration(_throttlingDuration);
    emit SetThrottlingBalance(_throttlingBalance);
  }

  /**
   * @notice Locks tokens for msg.sender
   * @param amount of tokens to lock
   */
  function lock(uint256 amount) public {
    _lock(msg.sender, msg.sender, amount);
  }

  /**
   * @notice Locks tokens on behalf of another account
   * @param account to lock tokens for
   * @param amount of tokens to lock
   */
  function lockFor(address account, uint256 amount) public {
    _lock(msg.sender, account, amount);
  }

  /**
   * @notice Unlocks and transfers to msg.sender
   * @param amount of tokens to unlock
   */
  function unlock(uint256 amount) public {
    uint256 previous = withdrawals[msg.sender][epoch()];

    // Only enforce percentage above a certain balance
    if (balances[msg.sender] > throttlingBalance) {
      require(
        (previous.add(amount)) <=
          ((throttlingPercentage.mul(balances[msg.sender])).div(100)),
        "AMOUNT_EXCEEDS_LIMIT"
      );
    } else {
      require(amount <= balances[msg.sender], "BALANCE_INSUFFICIENT");
    }

    balances[msg.sender] = balances[msg.sender].sub(amount);
    totalSupply = totalSupply.sub(amount);
    withdrawals[msg.sender][epoch()] = previous.add(amount);
    IERC20(token).transfer(msg.sender, amount);
    emit Unlock(msg.sender, amount);
  }

  /**
   * @notice Sets throttling percentage
   * @dev Only owner
   */
  function setThrottlingPercentage(uint256 _throttlingPercentage)
    public
    onlyOwner
  {
    require(_throttlingPercentage <= MAX_PERCENTAGE, "PERCENTAGE_TOO_HIGH");
    throttlingPercentage = _throttlingPercentage;
    emit SetThrottlingPercentage(throttlingPercentage);
  }

  /**
   * @notice Sets throttling duration
   * @dev Only owner
   */
  function setThrottlingDuration(uint256 _throttlingDuration) public onlyOwner {
    throttlingDuration = _throttlingDuration;
    emit SetThrottlingDuration(throttlingDuration);
  }

  /**
   * @notice Sets throttling balance
   * @dev Only owner
   */
  function setThrottlingBalance(uint256 _throttlingBalance) public onlyOwner {
    throttlingBalance = _throttlingBalance;
    emit SetThrottlingBalance(throttlingBalance);
  }

  /**
   * @dev Returns the current epoch
   */
  function epoch() public view returns (uint256) {
    return block.timestamp.sub(block.timestamp.mod(throttlingDuration));
  }

  /**
   * @dev See {IERC20-balanceOf}
   */
  function balanceOf(address account) public view returns (uint256) {
    return balances[account];
  }

  /**
   * @dev Perform a locking token transfer
   * @param from address
   * @param account address
   * @param amount uint256
   */
  function _lock(
    address from,
    address account,
    uint256 amount
  ) private {
    require(token.balanceOf(from) >= amount, "BALANCE_INSUFFICIENT");
    balances[account] = balances[account].add(amount);
    totalSupply = totalSupply.add(amount);
    IERC20(token).transferFrom(from, address(this), amount);
    emit Lock(account, amount);
  }
}
