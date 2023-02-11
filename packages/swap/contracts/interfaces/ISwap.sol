// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "./IAdapter.sol";

interface ISwap {
  struct Order {
    uint256 nonce; // Unique per order and should be sequential
    uint256 expiry; // Expiry in seconds since 1 January 1970
    uint256 protocolFee;
    Party signer; // Party to the trade that sets terms
    Party sender; // Party to the trade that accepts terms
    Party affiliate; // Party compensated for facilitating (optional)
    uint8 v;
    bytes32 r;
    bytes32 s;
  }

  event SetAdapters(address[] adapters);

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
    uint256 affiliateAmount,
    uint256 affiliateId,
    address affiliateToken
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
  error SignatureInvalid();
  error SignatoryInvalid();
  error RoyaltyExceedsMax(uint256);
  error TokenKindUnknown();
  error TransferFailed(address, address);
  error Unauthorized();

  /**
   * @notice Atomic Token Swap
   * @param order Order
   */
  function swap(
    address recipient,
    uint256 maxRoyalty,
    Order calldata order
  ) external;

  /**
   * @notice Cancel one or more open orders by nonce
   * @param nonces uint256[]
   */
  function cancel(uint256[] calldata nonces) external;

  /**
   * @notice Cancels all orders below a nonce value
   * @dev These orders can be made active by reducing the minimum nonce
   * @param minimumNonce uint256
   */
  function cancelUpTo(uint256 minimumNonce) external;

  function nonceUsed(address, uint256) external view returns (bool);

  function authorize(address sender) external;

  function revoke() external;

  function authorized(address) external view returns (address);
}
