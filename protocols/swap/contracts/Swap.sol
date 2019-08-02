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

import "@airswap/libraries/contracts/Transfers.sol";
import "@airswap/libraries/contracts/Types.sol";
import "@airswap/swap/interfaces/ISwap.sol";

/**
  * @title Swap: The Atomic Swap used by the Swap Protocol
  */
contract Swap is ISwap {

  // Domain and version for use in signatures (EIP-712)
  bytes constant internal DOMAIN_NAME = "SWAP";
  bytes constant internal DOMAIN_VERSION = "2";

  // Unique domain identifier for use in signatures (EIP-712)
  bytes32 private domainSeparator;

  // Possible order statuses
  byte constant private OPEN = 0x00;
  byte constant private TAKEN = 0x01;
  byte constant private CANCELED = 0x02;

  // Mapping of peer address to delegate address and expiry.
  mapping (address => mapping (address => uint256)) public delegateApprovals;

  // Mapping of makers to orders by nonce as TAKEN (0x01) or CANCELED (0x02)
  mapping (address => mapping (uint256 => byte)) public makerOrderStatus;

  // Mapping of makers to an optionally set minimum valid nonce
  mapping (address => uint256) public makerMinimumNonce;

  /**
    * @notice Contract Constructor
    * @dev Sets domain for signature validation (EIP-712)
    */
  constructor() public {
    domainSeparator = Types.hashDomain(
      DOMAIN_NAME,
      DOMAIN_VERSION,
      address(this)
    );
  }

  /**
    * @notice Atomic Token Swap
    * @dev Determines type (ERC-20 or ERC-721) with ERC-165
    *
    * @param _order Types.Order
    * @param _signature Types.Signature
    */
  function swap(
    Types.Order calldata _order,
    Types.Signature calldata _signature
  )
    external
  {

    // Ensure the order is not expired.
    require(_order.expiry >= block.timestamp,
      "ORDER_EXPIRED");

    // Ensure the order is not already taken.
    require(makerOrderStatus[_order.maker.wallet][_order.nonce] != TAKEN,
      "ORDER_ALREADY_TAKEN");

    // Ensure the order is not already canceled.
    require(makerOrderStatus[_order.maker.wallet][_order.nonce] != CANCELED,
      "ORDER_ALREADY_CANCELED");

    // Ensure the order nonce is above the minimum.
    require(_order.nonce >= makerMinimumNonce[_order.maker.wallet],
      "NONCE_TOO_LOW");

    // Mark the order TAKEN (0x01).
    makerOrderStatus[_order.maker.wallet][_order.nonce] = TAKEN;

    // Validate the taker side of the trade.
    address finalTakerWallet;

    if (_order.taker.wallet == address(0)) {
      /**
        * Taker is not specified. The sender of the transaction becomes
        * the taker of the _order.
        */
      finalTakerWallet = msg.sender;

    } else {
      /**
        * Taker is specified. If the sender is not the specified taker,
        * determine whether the sender has been authorized by the taker.
        */
      if (msg.sender != _order.taker.wallet) {
        require(isAuthorized(_order.taker.wallet, msg.sender),
          "SENDER_UNAUTHORIZED");
      }
      // The specified taker is all clear.
      finalTakerWallet = _order.taker.wallet;

    }

    // Validate the maker side of the trade.
    if (_signature.v == 0) {
      /**
        * Signature is not provided. The maker may have authorized the sender
        * to swap on its behalf, which does not require a _signature.
        */
      require(isAuthorized(_order.maker.wallet, msg.sender),
        "SIGNER_UNAUTHORIZED");

    } else {
      /**
        * The signature is provided. Determine whether the signer is
        * authorized by the maker and if so validate the signature itself.
        */
      require(isAuthorized(_order.maker.wallet, _signature.signer),
        "SIGNER_UNAUTHORIZED");

      // Ensure the signature is valid.
      require(isValid(_order, _signature, domainSeparator),
        "SIGNATURE_INVALID");

    }
    // Transfer token from taker to maker.
    Transfers.safeTransferAny(
      "TAKER",
      finalTakerWallet,
      _order.maker.wallet,
      _order.taker.param,
      _order.taker.token
    );

    // Transfer token from maker to taker.
    Transfers.safeTransferAny(
      "MAKER",
      _order.maker.wallet,
      finalTakerWallet,
      _order.maker.param,
      _order.maker.token
    );

    // Transfer token from maker to affiliate if specified.
    if (_order.affiliate.wallet != address(0)) {
      Transfers.safeTransferAny(
        "MAKER",
        _order.maker.wallet,
        _order.affiliate.wallet,
        _order.affiliate.param,
        _order.affiliate.token
      );
    }

    emit Swap(_order.nonce, block.timestamp,
      _order.maker.wallet, _order.maker.param, _order.maker.token,
      finalTakerWallet, _order.taker.param, _order.taker.token,
      _order.affiliate.wallet, _order.affiliate.param, _order.affiliate.token
    );
  }

  /**
    * @notice Atomic Token Swap (Simple)
    * @dev Determines type (ERC-20 or ERC-721) with ERC-165
    *
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
  function swapSimple(
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
  )
      external
  {

    // Ensure the order has not already been taken or canceled.
    require(makerOrderStatus[_makerWallet][_nonce] == OPEN,
      "ORDER_UNAVAILABLE");

    // Ensure the order is not expired.
    require(_expiry >= block.timestamp,
      "ORDER_EXPIRED");

    require(_nonce >= makerMinimumNonce[_makerWallet],
      "NONCE_TOO_LOW");

    // Validate the taker side of the trade.
    address finalTakerWallet;

    if (_takerWallet == address(0)) {

      // Set a null taker to be the order sender.
      finalTakerWallet = msg.sender;

    } else {

      // Ensure the order sender is authorized.
      if (msg.sender != _takerWallet) {
        require(isAuthorized(_takerWallet, msg.sender),
          "SENDER_UNAUTHORIZED");
      }

      finalTakerWallet = _takerWallet;

    }

    // Validate the maker side of the trade.
    if (_v == 0) {
      /**
        * Signature is not provided. The maker may have authorized the sender
        * to swap on its behalf, which does not require a signature.
        */
      require(isAuthorized(_makerWallet, msg.sender),
        "SIGNER_UNAUTHORIZED");

    } else {

      // Signature is provided. Ensure that it is valid.
      require(isValidSimple(
        address(this),
        _nonce,
        _expiry,
        _makerWallet,
        _makerParam,
        _makerToken,
        _takerWallet,
        _takerParam,
        _takerToken,
        _v, _r, _s
      ), "SIGNATURE_INVALID");
    }

    // Mark the order TAKEN (0x01).
    makerOrderStatus[_makerWallet][_nonce] = TAKEN;

    // Transfer token from taker to maker.
    Transfers.transferAny(_takerToken, finalTakerWallet, _makerWallet, _takerParam);

    // Transfer token from maker to taker.
    Transfers.transferAny(_makerToken, _makerWallet, finalTakerWallet, _makerParam);

    emit Swap(_nonce, block.timestamp,
      _makerWallet, _makerParam, _makerToken,
      finalTakerWallet, _takerParam, _takerToken,
      address(0), 0, address(0)
    );

  }

  /**
    * @notice Cancel One or More Orders by Nonce
    * @dev Canceled orders are marked CANCELED (0x02)
    * @param _nonces uint256[]
    */
  function cancel(
    uint256[] calldata _nonces
  ) external {
    for (uint256 i = 0; i < _nonces.length; i++) {
      if (makerOrderStatus[msg.sender][_nonces[i]] == OPEN) {
        makerOrderStatus[msg.sender][_nonces[i]] = CANCELED;
        emit Cancel(_nonces[i], msg.sender);
      }
    }
  }

  /**
    * @notice Invalidate All Orders Below a Nonce Value
    * @param _minimumNonce uint256
    */
  function invalidate(
    uint256 _minimumNonce
  ) external {
    makerMinimumNonce[msg.sender] = _minimumNonce;
    emit Invalidate(_minimumNonce, msg.sender);
  }

  /**
    * @notice Authorize a Delegate
    * @dev Expiry value is inclusive
    * @param _delegate address
    * @param _expiry uint256
    */
  function authorize(
    address _delegate,
    uint256 _expiry
  ) external {
    require(msg.sender != _delegate, "INVALID_AUTH_DELEGATE");
    require(_expiry >= block.timestamp, "INVALID_AUTH_EXPIRY");
    delegateApprovals[msg.sender][_delegate] = _expiry;
    emit Authorize(msg.sender, _delegate, _expiry);
  }

  /**
    * @notice Revoke an Authorization
    * @param _delegate address
    */
  function revoke(
    address _delegate
  ) external {
    delete delegateApprovals[msg.sender][_delegate];
    emit Revoke(msg.sender, _delegate);
  }

  /**
    * @notice Determine Whether a Delegate is Authorized
    * @dev Expiry value is inclusive
    * @param _approver address
    * @param _delegate address
    */
  function isAuthorized(
    address _approver,
    address _delegate
  ) internal view returns (bool) {
    if (_approver == _delegate) return true;
    return (delegateApprovals[_approver][_delegate] >= block.timestamp);
  }

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
