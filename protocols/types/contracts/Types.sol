
/*
  Copyright 2019 Swap Holdings Ltd.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

pragma solidity 0.5.12;
pragma experimental ABIEncoderV2;

/**
  * @title Types: Library of Swap Protocol Types and Hashes
  */
library Types {

  bytes constant internal EIP191_HEADER = "\x19\x01";

  struct Rule {
    uint256 maxSenderAmount;
    uint256 priceCoef;
    uint256 priceExp;
  }

  struct Order {
    uint256 nonce;        // Unique per order and should be sequential
    uint256 expiry;       // Expiry in seconds since 1 January 1970
    Party signer;          // Party to the trade that sets terms
    Party sender;          // Party to the trade that accepts terms
    Party affiliate;      // Party compensated for facilitating (optional)
    Signature signature;  // Signature of the order
  }

  struct Party {
    bytes4 kind;          // Interface ID of the token
    address wallet;       // Wallet address of the party
    address token;        // Contract address of the token
    uint256 param;        // Value (ERC-20) or ID (ERC-721)
  }

  struct Signature {
    address signatory;    // Address of the wallet used to sign
    bytes1 version;       // EIP-191 signature version
    uint8 v;              // `v` value of an ECDSA signature
    bytes32 r;            // `r` value of an ECDSA signature
    bytes32 s;            // `s` value of an ECDSA signature
  }

  bytes32 constant DOMAIN_TYPEHASH = keccak256(abi.encodePacked(
    "EIP712Domain(",
    "string name,",
    "string version,",
    "address verifyingContract",
    ")"
  ));

  bytes32 constant ORDER_TYPEHASH = keccak256(abi.encodePacked(
    "Order(",
    "uint256 nonce,",
    "uint256 expiry,",
    "Party signer,",
    "Party sender,",
    "Party affiliate",
    ")",
    "Party(",
    "bytes4 kind,",
    "address wallet,",
    "address token,",
    "uint256 param",
    ")"
  ));

  bytes32 constant PARTY_TYPEHASH = keccak256(abi.encodePacked(
    "Party(",
    "bytes4 kind,",
    "address wallet,",
    "address token,",
    "uint256 param",

    ")"
  ));

  /**
    * @notice Hash an order into bytes32
    * @dev EIP-191 header and domain separator included
    * @param _order Order
    * @param _domainSeparator bytes32
    * @return bytes32 returns a keccak256 abi.encodePacked value
    */
  function hashOrder(
    Order calldata _order,
    bytes32 _domainSeparator
  ) external pure returns (bytes32) {
    return keccak256(abi.encodePacked(
      EIP191_HEADER,
      _domainSeparator,
      keccak256(abi.encode(
        ORDER_TYPEHASH,
        _order.nonce,
        _order.expiry,
        keccak256(abi.encode(
          PARTY_TYPEHASH,
          _order.signer.kind,
          _order.signer.wallet,
          _order.signer.token,
          _order.signer.param
        )),
        keccak256(abi.encode(
          PARTY_TYPEHASH,
          _order.sender.kind,
          _order.sender.wallet,
          _order.sender.token,
          _order.sender.param
        )),
        keccak256(abi.encode(
          PARTY_TYPEHASH,
          _order.affiliate.kind,
          _order.affiliate.wallet,
          _order.affiliate.token,
          _order.affiliate.param
        ))
      ))
    ));
  }

  /**
    * @notice Hash domain parameters into bytes32
    * @dev Used for signature validation (EIP-712)
    * @param _name bytes
    * @param _version bytes
    * @param _verifyingContract address
    * @return bytes32 returns a keccak256 abi.encodePacked value
    */
  function hashDomain(
    bytes calldata _name,
    bytes calldata _version,
    address _verifyingContract
  ) external pure returns (bytes32) {
    return keccak256(abi.encode(
      DOMAIN_TYPEHASH,
      keccak256(_name),
      keccak256(_version),
      _verifyingContract
    ));
  }

}
