// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

interface IPool {
  struct Claim {
    bytes32 tree;
    uint256 value;
    bytes32[] proof;
  }

  event DrainTo(address[] tokens, address dest);
  event Enable(bytes32 tree, bytes32 root);
  event SetAdmin(address admin);
  event SetMax(uint256 max);
  event SetScale(uint256 scale);
  event UnsetAdmin(address admin);

  event UseClaim(address account, bytes32 tree);
  event Withdraw(
    address account,
    address recipient,
    address token,
    uint256 amount
  );

  error AddressInvalid(address);
  error AdminNotSet(address);
  error AmountInsufficient(uint256);
  error ClaimAlreadyUsed();
  error ClaimsNotProvided();
  error MaxTooHigh(uint256);
  error ProofInvalid(bytes32, bytes32);
  error TreeNotEnabled(bytes32);
  error ScaleTooHigh(uint256);
  error Unauthorized();

  function drainTo(address[] calldata tokens, address dest) external;

  function setScale(uint256 _scale) external;

  function setMax(uint256 _max) external;

  function setAdmin(address _admin) external;

  function unsetAdmin(address _admin) external;

  function enable(bytes32 _tree, bytes32 _root) external;

  function enableAndSetClaimed(
    bytes32 _tree,
    bytes32 _root,
    address[] memory _accounts
  ) external;

  function withdraw(
    Claim[] memory claims,
    address token,
    uint256 minimum,
    address recipient
  ) external returns (uint256 amount);

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

  function getStatus(
    address _account,
    bytes32[] calldata _trees
  ) external returns (bool[] memory statuses);
}
