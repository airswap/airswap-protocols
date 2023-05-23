// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

interface IPool {
  struct Claim {
    bytes32 root;
    uint256 score;
    bytes32[] proof;
  }

  event AddAdmin(address admin);
  event DrainTo(address[] tokens, address dest);
  event Enable(bytes32);
  event SetMax(uint256 max);
  event SetScale(uint256 scale);
  event RemoveAdmin(address admin);
  event Withdraw(
    bytes32[] roots,
    address account,
    address token,
    uint256 amount
  );
  event WithdrawWithSignature(
    address signer,
    address token,
    uint256 amount,
    address account,
    uint256 nonce
  );

  error AddressInvalid(address);
  error AdminNotSet(address);
  error AlreadyClaimed();
  error AmountInsufficient(uint256);
  error ChainChanged(uint256);
  error ClaimsNotProvided();
  error ExpiryPassed();
  error MaxTooHigh(uint256);
  error NonceAlreadyUsed(uint256);
  error ProofInvalid(bytes32[]);
  error ScaleTooHigh(uint256);
  error ScoreNotProvided(uint256);
  error RootDisabled(bytes32);
  error RootExists(bytes32);
  error TokenInvalid(address);
  error Unauthorized();

  function setScale(uint256 _scale) external;

  function setMax(uint256 _max) external;

  function addAdmin(address _admin) external;

  function removeAdmin(address _admin) external;

  function setStakingContract(address _stakingContract) external;

  function setStakingToken(address _stakingToken) external;

  function setClaimed(bytes32 root, address[] memory accounts) external;

  function enable(bytes32 root) external;

  function drainTo(address[] calldata tokens, address dest) external;

  function withdraw(Claim[] memory claims, address token) external;

  function withdrawWithRecipient(
    Claim[] memory claims,
    address token,
    uint256 minimumAmount,
    address recipient
  ) external;

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

  function withdrawWithSignature(
    uint8 v,
    bytes32 r,
    bytes32 s,
    address token,
    uint256 amount,
    uint256 nonce
  ) external returns (uint256);

  function withdrawProtected(
    Claim[] memory claims,
    address token,
    uint256 minimumAmount,
    address recipient
  ) external returns (uint256);

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
