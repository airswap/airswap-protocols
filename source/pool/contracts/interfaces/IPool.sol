// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IPool {
  struct Claim {
    bytes32 root;
    uint256 score;
    bytes32[] proof;
  }

  event Enable(bytes32 root);
  event Withdraw(
    bytes32[] roots,
    address account,
    address token,
    uint256 amount
  );
  event SetScale(uint256 scale);
  event SetMax(uint256 max);
  event DrainTo(address[] tokens, address dest);
  event WithdrawWithSignature(
    address signer,
    address token,
    uint256 amount,
    address account,
    uint256 nonce
  );

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

  function withdrawProtected(
    Claim[] memory claims,
    address token,
    uint256 minimumAmount,
    address recipient
  ) external returns (uint256);

  function calculate(uint256 score, address token)
    external
    view
    returns (uint256 amount);

  function calculateMultiple(uint256 score, address[] calldata tokens)
    external
    view
    returns (uint256[] memory outputAmounts);

  function verify(
    address participant,
    bytes32 root,
    uint256 score,
    bytes32[] memory proof
  ) external pure returns (bool valid);


  function withdrawWithSignature(
    bytes memory signature,
    bytes32 messageHash,
    address token,
    uint256 amount,
    address recipient,
    uint256 nonce
  ) external returns (uint256);
}