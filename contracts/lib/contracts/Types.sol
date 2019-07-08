pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;

/**
  * @title Types: Library of Swap Protocol Types and Hashes
  */
library Types {

  bytes constant internal EIP191_HEADER = "\x19\x01";

  struct Party {
    address wallet;
    address token;
    uint256 param;
  }

  struct Order {
    uint256 nonce;
    uint256 expiry;
    Party maker;
    Party taker;
    Party affiliate;
  }

  struct Signature {
    address signer;
    uint8 v;
    bytes32 r;
    bytes32 s;
    bytes1 version;
  }

  bytes32 internal constant DOMAIN_TYPEHASH = keccak256(abi.encodePacked(
    "EIP712Domain(",
    "string name,",
    "string version,",
    "address verifyingContract",
    ")"
  ));

  bytes32 internal constant ORDER_TYPEHASH = keccak256(abi.encodePacked(
    "Order(",
    "uint256 nonce,",
    "uint256 expiry,",
    "Party maker,",
    "Party taker,",
    "Party affiliate",
    ")",
    "Party(",
    "address wallet,",
    "address token,",
    "uint256 param",
    ")"
  ));

  bytes32 internal constant PARTY_TYPEHASH = keccak256(abi.encodePacked(
    "Party(",
    "address wallet,",
    "address token,",
    "uint256 param",
    ")"
  ));

  function hashParty(Party memory party) internal pure returns (bytes32) {
    return keccak256(abi.encode(
      PARTY_TYPEHASH,
      party.wallet,
      party.token,
      party.param
    ));
  }

  function hashOrder(Order memory order, bytes32 domainSeparator) internal pure returns (bytes32) {
    return keccak256(abi.encodePacked(
      EIP191_HEADER,
      domainSeparator,
      keccak256(abi.encode(
        ORDER_TYPEHASH,
        order.nonce,
        order.expiry,
        hashParty(order.maker),
        hashParty(order.taker),
        hashParty(order.affiliate)
      ))
    ));
  }

  function hashDomain(
    bytes memory name,
    bytes memory version,
    address verifyingContract
  ) public pure returns (bytes32) {
    return keccak256(abi.encode(
      DOMAIN_TYPEHASH,
      keccak256(name),
      keccak256(version),
      verifyingContract
    ));
  }

}
