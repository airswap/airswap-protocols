// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IPool {
  event Withdraw(
    uint256 indexed nonce,
    uint256 indexed expiry,
    address indexed account,
    address token,
    uint256 amount,
    uint256 score
  );
  event SetScale(uint256 scale);
  event SetMax(uint256 max);
  event DrainTo(address[] tokens, address dest);

  function setScale(uint256 _scale) external;

  function setMax(uint256 _max) external;

  function addAdmin(address _admin) external;

  function removeAdmin(address _admin) external;

  function setStakingContract(address _stakingContract) external;

  function setStakingToken(address _stakingToken) external;

  function drainTo(address[] calldata tokens, address dest) external;

  function withdraw(
    address recipient,
    uint256 minimum,
    address token,
    uint256 nonce,
    uint256 expiry,
    uint256 score,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external returns (uint256);

  function withdrawAndStake(
    address recipient,
    uint256 minimum,
    address token,
    uint256 nonce,
    uint256 expiry,
    uint256 score,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external returns (uint256);

  function calculate(uint256 score, address token)
    external
    view
    returns (uint256 amount);

  function verify(
    uint256 nonce,
    uint256 expiry,
    address participant,
    uint256 score,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external view returns (bool valid);

  function nonceUsed(address participant, uint256 nonce)
    external
    view
    returns (bool);
}
