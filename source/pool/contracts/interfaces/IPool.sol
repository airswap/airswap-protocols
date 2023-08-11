// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

interface IPool {
  struct Claim {
    bytes32 tree;
    uint256 value;
    bytes32[] proof;
  }

  event AddAdmin(address admin);
  event DrainTo(address[] tokens, address dest);
  event Enable(bytes32 tree, bytes32 root);
  event SetMax(uint256 max);
  event SetScale(uint256 scale);
  event SetStaking(address stakingToken, address stakingContract);
  event RemoveAdmin(address admin);
  event Withdraw(
    bytes32[] trees,
    address account,
    address token,
    uint256 amount
  );

  error AddressInvalid(address);
  error AdminNotSet(address);
  error AlreadyClaimed();
  error AmountInsufficient(uint256);
  error ClaimsNotProvided();
  error MaxTooHigh(uint256);
  error ProofInvalid(bytes32);
  error TreeDisabled(bytes32);
  error ScaleTooHigh(uint256);
  error TokenInvalid(address);
  error Unauthorized();

  function setScale(uint256 _scale) external;

  function setMax(uint256 _max) external;

  function addAdmin(address _admin) external;

  function removeAdmin(address _admin) external;

  function setStaking(address _stakingToken, address _stakingContract) external;

  function enable(bytes32 _tree, bytes32 _root) external;

  function getClaimStatusForTrees(
    address _account,
    bytes32[] calldata _trees
  ) external returns (bool[] memory claimStatusList);

  function drainTo(address[] calldata tokens, address dest) external;

  function withdraw(
    Claim[] memory claims,
    address token,
    uint256 minimumAmount
  ) external returns (uint256 amountWithdrawn);

  function withdrawFor(
    Claim[] memory claims,
    address token,
    uint256 minimumAmount,
    address recipient
  ) external returns (uint256 amountWithdrawn);

  function withdrawAndStake(
    Claim[] memory claims,
    address token,
    uint256 minimumAmount
  ) external;

  function withdrawAndStakeFor(
    Claim[] memory claims,
    address token,
    uint256 minimumAmount,
    address account
  ) external;

  function calculate(
    uint256 score,
    address token
  ) external view returns (uint256 amount);

  function verify(
    address participant,
    bytes32 root,
    uint256 score,
    bytes32[] memory proof
  ) external pure returns (bool valid);
}
