// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

// import "@airswap/transfers/contracts/TransferHandlerRegistry.sol";
import "../TransferHandlerRegistry.sol";

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

  struct Party {
    address wallet; // Wallet address of the party
    address token; // Contract address of the token
    bytes4 kind; // Interface ID of the token
    uint256 id; // ID for ERC-721 or ERC-1155
    uint256 amount; // Amount for ERC-20 or ERC-1155
  }

  event Swap(
    uint256 indexed nonce,
    uint256 timestamp,
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

  event SetRebateScale(uint256 rebateScale);

  event SetRebateMax(uint256 rebateMax);

  event SetStaking(address indexed staking);

  /**
   * @notice Atomic Token Swap
   * @param order Order
   */
  function swap(Order calldata order) external;

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

  function registry() external view returns (TransferHandlerRegistry);

  function calculateProtocolFee(address, uint256)
    external
    view
    returns (uint256);
}
