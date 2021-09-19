// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@airswap/light/contracts/Light.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "hardhat/console.sol";

/**
 * @title LightValidator: Helper contract to Light protocol
 * @notice contains helper method that checks whether
 * a Light Order is well-formed and counterparty criteria is met
 */

contract LightValidator is Ownable {
  using SafeMath for uint256;

  struct OrderDetails {
    uint256 nonce;
    uint256 expiry;
    uint256 signerAmount;
    uint256 senderAmount;
    IERC20 signerToken;
    IERC20 senderToken;
    uint8 v;
    bytes32 r;
    bytes32 s;
    address senderWallet;
    address signerWallet;
  }
  address public light;
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

  constructor(address _lightAddress) Ownable() {
    light = _lightAddress;
  }

  /**
   * @notice sets the address for the current light contract
   * @param _lightAddress address new address to be set
   */

  function setLightAddress(address _lightAddress) public onlyOwner {
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
  ) public view returns (uint256, bytes32[] memory) {
    bytes32[] memory errors = new bytes32[](MAX_ERROR_COUNT);
    OrderDetails memory details;
    uint256 errCount;
    details.nonce = nonce;
    details.expiry = expiry;
    details.signerWallet = signerWallet;
    details.signerToken = signerToken;
    details.signerAmount = signerAmount;
    details.senderToken = senderToken;
    details.senderAmount = senderAmount;
    details.v = v;
    details.r = r;
    details.s = s;
    details.senderWallet = senderWallet;
    bytes32 hashed = _getOrderHash(details);
    address signatory = _getSignatory(hashed, v, r, s);
    uint256 swapFee = details.signerAmount.mul(Light(light).signerFee()).div(
      Light(light).FEE_DIVISOR()
    );
    // Ensure the signatory is not null
    if (signatory == address(0)) {
      errors[errCount] = "SIGNATURE_INVALID";
      errCount++;
    }
    //expiry check
    if (details.expiry < block.timestamp) {
      errors[errCount] = "ORDER_EXPIRED";
      errCount++;
    }
    //if signatory is not the signerWallet, then it must have been authorized
    if (details.signerWallet != signatory) {
      if (Light(light).authorized(details.signerWallet) != signatory) {
        errors[errCount] = "SIGNATURE_UNAUTHORIZED";
        errCount++;
      }
    }
    //accounts & balances check
    uint256 senderBalance = IERC20(details.senderToken).balanceOf(
      details.senderWallet
    );
    uint256 signerBalance = IERC20(details.signerToken).balanceOf(
      details.signerWallet
    );
    uint256 senderAllowance = IERC20(details.senderToken).allowance(
      details.senderWallet,
      light
    );
    uint256 signerAllowance = IERC20(details.signerToken).allowance(
      details.signerWallet,
      light
    );

    if (senderAllowance < details.senderAmount) {
      errors[errCount] = "SENDER_ALLOWANCE_LOW";
      errCount++;
    }
    if (signerAllowance < details.signerAmount + swapFee) {
      errors[errCount] = "SIGNER_ALLOWANCE_LOW";
      errCount++;
    }
    if (senderBalance < details.senderAmount) {
      errors[errCount] = "SENDER_BALANCE_LOW";
      errCount++;
    }
    if (signerBalance < details.signerAmount + swapFee) {
      errors[errCount] = "SIGNER_BALANCE_LOW";
      errCount++;
    }
    //nonce check
    if (Light(light).nonceUsed(details.signerWallet, details.nonce)) {
      errors[errCount] = "ORDER_TAKEN_OR_CANCELLED";
      errCount++;
    }
    return (errCount, errors);
  }

  /**
   * @notice Hash order parameters
   * @param _details OrderDetails
   * @return bytes32
   */
  function _getOrderHash(OrderDetails memory _details)
    internal
    view
    returns (bytes32)
  {
    return
      keccak256(
        abi.encode(
          LIGHT_ORDER_TYPEHASH,
          _details.nonce,
          _details.expiry,
          _details.signerWallet,
          _details.signerToken,
          _details.signerAmount,
          Light(light).signerFee(),
          _details.senderWallet,
          _details.senderToken,
          _details.senderAmount
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
    bytes32 digest = keccak256(
      abi.encodePacked("\x19\x01", Light(light).DOMAIN_SEPARATOR(), hash)
    );
    address signatory = ecrecover(digest, v, r, s);
    return signatory;
  }
}
