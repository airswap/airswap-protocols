pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;

import "./Types.sol";

/**
  * @title Signatures: Library to Validate Swap Order Signatures
  */
library Signatures {

  /**
    * @notice Validates signature using an EIP-712 typed data hash
    *
    * @param order Order
    * @param signature Signature
    */
  function isValid(
    Types.Order memory order,
    Types.Signature memory signature,
    bytes32 domainSeparator
  ) internal pure returns (bool) {
    if (signature.version == byte(0x01)) {
      return signature.signer == ecrecover(
        Types.hashOrder(order, domainSeparator),
        signature.v, signature.r, signature.s
      );
    }
    if (signature.version == byte(0x45)) {
      return signature.signer == ecrecover(
        keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", Types.hashOrder(order, domainSeparator))),
        signature.v, signature.r, signature.s
      );
    }
    return false;
  }

  /**
    * @notice Validates signature using a simple hash and verifyingContract
    *
    * @param nonce uint256
    * @param expiry uint256
    * @param makerWallet address
    * @param makerParam uint256
    * @param makerToken address
    * @param takerWallet address
    * @param takerParam uint256
    * @param takerToken address
    * @param v uint8
    * @param r bytes32
    * @param s bytes32
    @ @param verifyingContract address
    */
  function isValidSimple(uint256 nonce, uint256 expiry,
    address makerWallet, uint256 makerParam, address makerToken,
    address takerWallet, uint256 takerParam, address takerToken,
    uint8 v, bytes32 r, bytes32 s, address verifyingContract
  ) internal pure returns (bool) {
    return makerWallet == ecrecover(
      keccak256(abi.encodePacked(
        "\x19Ethereum Signed Message:\n32",
        keccak256(abi.encodePacked(
          byte(0),
          verifyingContract,
          nonce,
          expiry,
          makerWallet,
          makerParam,
          makerToken,
          takerWallet,
          takerParam,
          takerToken
        )))),
      v, r, s);
  }

}
