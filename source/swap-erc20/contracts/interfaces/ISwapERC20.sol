// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface ISwapERC20 {
  struct OrderERC20 {
    uint256 nonce; // Unique number per signatory per order
    uint256 expiry; // Expiry time (seconds since unix epoch)
    address signerWallet; // Party to the swap that sets terms
    address signerToken; // ERC20 token address transferred from signer
    uint256 signerAmount; // Amount of tokens transferred from signer
    address senderWallet; // Party to the swap that accepts terms
    address senderToken; // ERC20 token address transferred from sender
    uint256 senderAmount; // Amount of tokens transferred from sender
    uint8 v; // ECDSA
    bytes32 r;
    bytes32 s;
  }

  event SwapERC20(uint256 indexed nonce, address indexed signerWallet);

  event Cancel(uint256 indexed nonce, address indexed signerWallet);
  event Authorize(address indexed signer, address indexed signerWallet);
  event Revoke(address indexed signer, address indexed signerWallet);
  event SetProtocolFee(uint256 protocolFee);
  event SetProtocolFeeLight(uint256 protocolFeeLight);
  event SetProtocolFeeWallet(address indexed feeWallet);
  event SetDiscountScale(uint256 discountScale);
  event SetDiscountMax(uint256 discountMax);
  event SetStaking(address indexed staking);

  error ChainIdChanged();
  error InvalidFee();
  error InvalidFeeLight();
  error InvalidFeeWallet();
  error InvalidStaking();
  error OrderExpired();
  error MaxTooHigh();
  error NonceAlreadyUsed(uint256);
  error ScaleTooHigh();
  error SignatureInvalid();
  error SignatoryInvalid();
  error SignatoryUnauthorized();
  error Unauthorized();

  function swap(
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

  function swapAnySender(
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

  function swapLight(
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

  function calculateProtocolFee(
    address,
    uint256
  ) external view returns (uint256);
}
