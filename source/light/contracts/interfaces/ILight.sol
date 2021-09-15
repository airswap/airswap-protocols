// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface ILight {
  event Swap(
    uint256 indexed nonce,
    uint256 timestamp,
    address indexed signerWallet,
    address signerToken,
    uint256 signerAmount,
    uint256 signerFee,
    address indexed senderWallet,
    address senderToken,
    uint256 senderAmount
  );

  event Cancel(uint256 indexed nonce, address indexed signerWallet);

  event Authorize(address indexed signer, address indexed signerWallet);

  event Revoke(address indexed signer, address indexed signerWallet);

  event SetFee(uint256 indexed signerFee);

  event SetFeeWallet(address indexed feeWallet);

  function swap(
    uint256 nonce,
    uint256 expiry,
    address signerWallet,
    address signerToken,
    uint256 signerAmount,
    address senderToken,
    uint256 senderAmount,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external;

  function swapWithRecipient(
    address recipient,
    uint256 nonce,
    uint256 expiry,
    address signerWallet,
    address signerToken,
    uint256 signerAmount,
    address senderToken,
    uint256 senderAmount,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external;

  function authorize(address sender) external;

  function revoke() external;

  function cancel(uint256[] calldata nonces) external;

  function nonceUsed(address, uint256) external view returns (bool);

  function authorized(address) external view returns (address);
}
