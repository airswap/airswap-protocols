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

import "./Types.sol";

/**
  * @title Signatures: Library to Validate Swap Order Signatures
  */
library Signatures {

  /**
    * @notice Validates signature using an EIP-712 typed data hash
    *
    * @param _order Order
    * @param _signature Signature
    */
  function isValid(
    Types.Order memory _order,
    Types.Signature memory _signature,
    bytes32 _domainSeparator
  ) internal pure returns (bool) {
    if (_signature.version == byte(0x01)) {
      return _signature.signer == ecrecover(
        Types.hashOrder(
          _order,
          _domainSeparator),
          _signature.v,
          _signature.r,
          _signature.s
      );
    }
    if (_signature.version == byte(0x45)) {
      return _signature.signer == ecrecover(
        keccak256(
          abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            Types.hashOrder(_order, _domainSeparator)
          )
        ),
        _signature.v,
        _signature.r,
        _signature.s
      );
    }
    return false;
  }

  /**
    * @notice Validates signature using a simple hash and verifyingContract
    *
    @ @param _verifyingContract address
    * @param _nonce uint256
    * @param _expiry uint256
    * @param _makerWallet address
    * @param _makerParam uint256
    * @param _makerToken address
    * @param _takerWallet address
    * @param _takerParam uint256
    * @param _takerToken address
    * @param _v uint8
    * @param _r bytes32
    * @param _s bytes32
    */
  function isValidSimple(
    address _verifyingContract,
    uint256 _nonce,
    uint256 _expiry,
    address _makerWallet,
    uint256 _makerParam,
    address _makerToken,
    address _takerWallet,
    uint256 _takerParam,
    address _takerToken,
    uint8 _v,
    bytes32 _r,
    bytes32 _s
  ) internal pure returns (bool) {
    return _makerWallet == ecrecover(
      keccak256(abi.encodePacked(
        "\x19Ethereum Signed Message:\n32",
        keccak256(abi.encodePacked(
          byte(0),
          _verifyingContract,
          _nonce,
          _expiry,
          _makerWallet,
          _makerParam,
          _makerToken,
          _takerWallet,
          _takerParam,
          _takerToken
        )))),
      _v, _r, _s);
  }

}
