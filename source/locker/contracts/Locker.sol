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

pragma solidity 0.5.16;

import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

/**
 * @title Locker: Lock and Unlock a Token Balance
 */
contract Locker is Ownable, Pausable {
  using SafeMath for uint256;

  // Token to be used for staking (ERC-20)
  ERC20 private _lockingToken;

  mapping(address => uint256) private _balances;

  uint256 private _totalSupply;
  string private _name;
  string private _symbol;
  uint8 private _decimals;

  /**
   * @notice Contract Events
   */
  event Lock(address participant, uint256 amount);
  event Unlock(address participant, uint256 amount);

  /**
   * @notice Contract Constructor
   * @param lockingToken_ address
   */
  constructor(
    string memory name_,
    string memory symbol_,
    uint8 decimals_,
    address lockingToken_
  ) public {
    _name = name_;
    _symbol = symbol_;
    _decimals = decimals_;
    _lockingToken = ERC20(lockingToken_);
  }

  /**
   * @notice Transfers tokens to the contract balance for for msg.sender
   * @param amount The amount of tokens to lock
   */
  function lock(uint256 amount) public {
    require(
      _lockingToken.balanceOf(msg.sender) >= amount,
      "INSUFFICIENT_BALANCE"
    );
    _balances[msg.sender] = _balances[msg.sender] + amount;
    _totalSupply = _totalSupply + amount;
    IERC20(_lockingToken).transferFrom(msg.sender, address(this), amount);
    emit Lock(msg.sender, amount);
  }

  /**
   * @notice Unlocks and transfers tokens msg.sender
   * @param amount The amount of tokens to unlock
   */
  function unlock(uint256 amount) public {
    // TODO: Implement ithdrawal rate limits

    require(amount > _lockingToken.balanceOf(address(this)));
    _balances[msg.sender] = _balances[msg.sender] + amount;
    _totalSupply = _totalSupply + amount;
    IERC20(_lockingToken).transfer(msg.sender, amount);
    emit Unlock(msg.sender, amount);
  }

  /**
   * @dev Returns the name of the token.
   */
  function name() public view returns (string memory) {
    return _name;
  }

  /**
   * @dev Returns the symbol of the token, usually a shorter version of the
   * name.
   */
  function symbol() public view returns (string memory) {
    return _symbol;
  }

  function decimals() public view returns (uint8) {
    return _decimals;
  }

  /**
   * @dev See {IERC20-totalSupply}.
   */
  function totalSupply() public view returns (uint256) {
    return _totalSupply;
  }

  /**
   * @dev See {IERC20-balanceOf}.
   */
  function balanceOf(address account) public view returns (uint256) {
    return _balances[account];
  }
}
