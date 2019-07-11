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

  function hashParty(
    Party memory _party
  ) internal pure returns (
    bytes32
  ) {
    return keccak256(abi.encode(
      PARTY_TYPEHASH,
      _party.wallet,
      _party.token,
      _party.param
    ));
  }

  function hashOrder(
    Order memory _order,
    bytes32 _domainSeparator
  ) internal pure returns (bytes32) {
    return keccak256(abi.encodePacked(
      EIP191_HEADER,
      _domainSeparator,
      keccak256(abi.encode(
        ORDER_TYPEHASH,
        _order.nonce,
        _order.expiry,
        hashParty(_order.maker),
        hashParty(_order.taker),
        hashParty(_order.affiliate)
      ))
    ));
  }

  function hashDomain(
    bytes memory _name,
    bytes memory _version,
    address _verifyingContract
  ) public pure returns (bytes32) {
    return keccak256(abi.encode(
      DOMAIN_TYPEHASH,
      keccak256(_name),
      keccak256(_version),
      _verifyingContract
    ));
  }

}
