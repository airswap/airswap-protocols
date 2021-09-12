// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../light/contracts/Light.sol";

/**
 * @title LightValidator: Helper contract to Light protocol
 * @notice contains helper method that checks whether
 * a Light Order is well-formed and counterparty criteria is met
 */

contract LightValidator {
  address public immutable light;
  bytes32 public constant LIGHT_ORDER_TYPEHASH =
    keccak256(
      abi.encodePacked(
        "LightOrder(",
        "uint256 nonce,",
        "uint256 expiry,",
        "address signerWallet,",
        "address signerToken,",
        "uint256 signerAmount,",
        "uint256 signerFee,",
        "address senderWallet,",
        "address senderToken,",
        "uint256 senderAmount",
        ")"
      )
    );
  // size of fixed array that holds max returning error messages
  uint256 internal constant MAX_ERROR_COUNT = 8;

  constructor(address _lightAddress) {
    light = _lightAddress;
  }

  /**
   * @notice Checks Light Order for any potential errors
   * @param nonce uint256 Unique and should be sequential
   * @param expiry uint256 Expiry in seconds since 1 January 1970
   * @param signerWallet address Wallet of the signer
   * @param signerToken address ERC20 token transferred from the signer
   * @param signerAmount uint256 Amount transferred from the signer
   * @param senderToken address ERC20 token transferred from the sender
   * @param senderAmount uint256 Amount transferred from the sender
   * @param v uint8 "v" value of the ECDSA signature
   * @param r bytes32 "r" value of the ECDSA signature
   * @param s bytes32 "s" value of the ECDSA signature
   * @param senderWallet address Wallet of the sender
   * @return tuple of error count and bytes32[] memory array of error messages
   */
  function checkSwap(
    uint256 nonce,
    uint256 expiry,
    address signerWallet,
    IERC20 signerToken,
    uint256 signerAmount,
    IERC20 senderToken,
    uint256 senderAmount,
    uint8 v,
    bytes32 r,
    bytes32 s,
    address senderWallet
  ) public returns (uint256, bytes32[] memory) {
    bytes32[] memory errors = new bytes32[](MAX_ERROR_COUNT);
    uint256 errCount;
    bytes32 hashed =
      _getOrderHash(
        nonce,
        expiry,
        signerWallet,
        signerToken,
        signerAmount,
        senderWallet,
        senderToken,
        senderAmount
      );
    address signatory = _getSignatory(hashed, v, r, s);
    // Ensure the signatory is not null
    if (signatory == address(0)) {
      errors[errCount] = "SIGNATURE_INVALID";
      errCount++;
    }
    //expiry check
    if (expiry < block.timestamp) {
      errors[errCount] = "ORDER_EXPIRED";
      errCount++;
    }
    //if signatory is not the signerWallet, then it must have been authorized
    if (signerWallet != signatory) {
      if (Light(light).authorized(signerWallet) != signatory) {
        errors[errCount] = "SIGNATURE_UNAUTHORIZED";
        errCount++;
      }
    }
    //accounts & balances check
    uint256 senderBalance = IERC20(senderToken).balanceOf(senderWallet);
    uint256 signerBalance = IERC20(signerToken).balanceOf(signerWallet);
    uint256 senderAllowance =
      IERC20(senderToken).allowance(senderWallet, light);
    uint256 signerAllowance =
      IERC20(signerToken).allowance(signerWallet, light);

    if (senderAllowance < senderAmount) {
      errors[errCount] = "SENDER_ALLOWANCE_LOW";
      errCount++;
    }
    if (signerAllowance < signerAmount) {
      errors[errCount] = "SIGNER_ALLOWANCE_LOW";
      errCount++;
    }
    if (senderBalance < senderAmount) {
      errors[errCount] = "SENDER_BALANCE_LOW";
      errCount++;
    }
    if (signerBalance < signerAmount) {
      errors[errCount] = "SIGNER_BALANCE_LOW";
      errCount++;
    }
    //nonce check
    if (Light(light).nonceUsed(signerWallet, nonce)) {
      errors[errCount] = "ORDER_TAKEN_OR_CANCELLED";
      errCount++;
    }
    return (errCount, errors);
  }

  /**
   * @notice Hash order parameters
   * @param nonce uint256
   * @param expiry uint256
   * @param signerWallet address
   * @param signerToken address
   * @param signerAmount uint256
   * @param senderWallet address
   * @param senderToken address
   * @param senderAmount uint256
   * @return bytes32
   */
  function _getOrderHash(
    uint256 nonce,
    uint256 expiry,
    address signerWallet,
    IERC20 signerToken,
    uint256 signerAmount,
    address senderWallet,
    IERC20 senderToken,
    uint256 senderAmount
  ) internal view returns (bytes32) {
    return
      keccak256(
        abi.encode(
          LIGHT_ORDER_TYPEHASH,
          nonce,
          expiry,
          signerWallet,
          signerToken,
          signerAmount,
          Light(light).signerFee(),
          senderWallet,
          senderToken,
          senderAmount
        )
      );
  }

  /**
   * @notice Recover the signatory from a signature
   * @param hash bytes32
   * @param v uint8
   * @param r bytes32
   * @param s bytes32
   */
  function _getSignatory(
    bytes32 hash,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) internal view returns (address) {
    bytes32 digest =
      keccak256(
        abi.encodePacked("\x19\x01", Light(light).DOMAIN_SEPARATOR(), hash)
      );
    address signatory = ecrecover(digest, v, r, s);
    return signatory;
  }
}
