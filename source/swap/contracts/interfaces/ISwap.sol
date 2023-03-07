// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./IAdapter.sol";

interface ISwap {
  struct Order {
    uint256 nonce; // Unique number per signatory per order
    uint256 expiry; // Expiry time (seconds since unix epoch)
    uint256 protocolFee; // Protocol fee numerator
    Party signer; // Party to the swap that sets terms
    Party sender; // Party to the swap that accepts terms
    address affiliateWallet; // Party tipped for facilitating (optional)
    uint256 affiliateAmount;
    uint8 v; // ECDSA
    bytes32 r;
    bytes32 s;
  }

  event Swap(
    uint256 indexed nonce,
    address indexed signerWallet,
    uint256 signerAmount,
    uint256 signerId,
    address signerToken,
    address indexed senderWallet,
    uint256 senderAmount,
    uint256 senderId,
    address senderToken,
    address affiliateWallet,
    uint256 affiliateAmount
  );
  event Cancel(uint256 indexed nonce, address indexed signerWallet);
  event CancelUpTo(uint256 indexed nonce, address indexed signerWallet);
  event SetProtocolFee(uint256 protocolFee);
  event SetProtocolFeeWallet(address indexed feeWallet);
  event Authorize(address indexed signer, address indexed signerWallet);
  event Revoke(address indexed signer, address indexed signerWallet);

  error ChainIdChanged();
  error AdaptersInvalid();
  error FeeInvalid();
  error FeeWalletInvalid();
  error NonceAlreadyUsed(uint256);
  error NonceTooLow();
  error OrderExpired();
  error SenderInvalid();
  error SenderTokenInvalid();
  error AffiliateAmountInvalid();
  error SignatureInvalid();
  error SignatoryInvalid();
  error RoyaltyExceedsMax(uint256);
  error TokenKindUnknown();
  error TransferFailed(address, address);
  error SignatoryUnauthorized();
  error Unauthorized();

  function swap(
    address recipient,
    uint256 maxRoyalty,
    Order calldata order
  ) external;

  function cancel(uint256[] calldata nonces) external;

  function cancelUpTo(uint256 minimumNonce) external;

  function nonceUsed(address, uint256) external view returns (bool);

  function authorize(address sender) external;

  function revoke() external;

  function adapters(bytes4) external view returns (IAdapter);

  function authorized(address) external view returns (address);

  function signatoryMinimumNonce(address) external view returns (uint256);
}
