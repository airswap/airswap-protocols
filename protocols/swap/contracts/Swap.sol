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

import "@airswap/transfer-handler-registry/contracts/interfaces/ITransferHandler.sol";
import "@airswap/transfer-handler-registry/contracts/TransferHandlerRegistry.sol";
import "@airswap/swap/contracts/interfaces/ISwap.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC721/IERC721.sol";

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

  // Mapping of sender address to a delegated sender address and expiry.
  mapping (address => mapping (address => uint256)) public senderAuthorizations;

  // Mapping of signer address to a delegated signer and expiry.
  mapping (address => mapping (address => uint256)) public signerAuthorizations;

  // Mapping of signers to orders by nonce as TAKEN (0x01) or CANCELED (0x02)
  mapping (address => mapping (uint256 => byte)) public signerOrderStatus;

  // Mapping of signer addresses to an optionally set minimum valid nonce
  mapping (address => uint256) public signerMinimumNonce;

  // contains registry of kind to asset types
  TransferHandlerRegistry public registry;

  /**
    * @notice Contract Constructor
    * @dev Sets domain for signature validation (EIP-712)
    * @param _registry TokenRegistry contract
    */
  constructor(TransferHandlerRegistry _registry) public {
    domainSeparator = Types.hashDomain(
      DOMAIN_NAME,
      DOMAIN_VERSION,
      address(this)
    );
    registry = _registry;
  }

  /**
    * @notice Atomic Token Swap
    * @param _order Types.Order
    */
  function swap(
    Types.Order calldata _order
  ) external {

    // Ensure the order is not expired.
    require(_order.expiry > block.timestamp,
      "ORDER_EXPIRED");

    // Ensure the order is not already taken.
    require(signerOrderStatus[_order.signer.wallet][_order.nonce] != TAKEN,
      "ORDER_ALREADY_TAKEN");

    // Ensure the order is not already canceled.
    require(signerOrderStatus[_order.signer.wallet][_order.nonce] != CANCELED,
      "ORDER_ALREADY_CANCELED");

    // Ensure the order nonce is above the minimum.
    require(_order.nonce >= signerMinimumNonce[_order.signer.wallet],
      "NONCE_TOO_LOW");

    // Mark the order TAKEN (0x01).
    signerOrderStatus[_order.signer.wallet][_order.nonce] = TAKEN;

    // Validate the sender side of the trade.
    address finalSenderWallet;

    if (_order.sender.wallet == address(0)) {
      /**
        * Sender is not specified. The msg.sender of the transaction becomes
        * the sender of the _order.
        */
      finalSenderWallet = msg.sender;

    } else {
      /**
        * Sender is specified. If the msg.sender is not the specified sender,
        * thus determines whether the msg.sender is an authorized sender.
        */
      require(isSenderAuthorized(_order.sender.wallet, msg.sender),
          "SENDER_UNAUTHORIZED");
      // The specified sender is all clear.
      finalSenderWallet = _order.sender.wallet;

    }

    // Validate the signer side of the trade.
    if (_order.signature.v == 0) {
      /**
        * Signature is not provided. The signer may have authorized the
        * msg.sender to swap on its behalf, which does not require a signature.
        */
      require(isSignerAuthorized(_order.signer.wallet, msg.sender),
        "SIGNER_UNAUTHORIZED");

    } else {
      /**
        * The signature is provided. Determine whether the signer is
        * authorized and if so validate the signature itself.
        */
      require(isSignerAuthorized(_order.signer.wallet, _order.signature.signatory),
        "SIGNER_UNAUTHORIZED");

      // Ensure the signature is valid.
      require(isValid(_order, domainSeparator),
        "SIGNATURE_INVALID");

    }
    // Transfer token from sender to signer.
    transferToken(
      finalSenderWallet,
      _order.signer.wallet,
      _order.sender.param,
      _order.sender.token,
      _order.sender.kind
    );

    // Transfer token from signer to sender.
    transferToken(
      _order.signer.wallet,
      finalSenderWallet,
      _order.signer.param,
      _order.signer.token,
      _order.signer.kind
    );

    // Transfer token from signer to affiliate if specified.
    if (_order.affiliate.wallet != address(0)) {
      transferToken(
        _order.signer.wallet,
        _order.affiliate.wallet,
        _order.affiliate.param,
        _order.affiliate.token,
        _order.affiliate.kind
      );
    }

    emit Swap(_order.nonce, block.timestamp,
      _order.signer.wallet, _order.signer.param, _order.signer.token,
      finalSenderWallet, _order.sender.param, _order.sender.token,
      _order.affiliate.wallet, _order.affiliate.param, _order.affiliate.token
    );
  }

  /**
    * @notice Cancel one or more open orders by nonce
    * @dev Canceled orders are marked CANCELED (0x02)
    * @dev Emits a Cancel event
    * @param _nonces uint256[]
    */
  function cancel(
    uint256[] calldata _nonces
  ) external {
    for (uint256 i = 0; i < _nonces.length; i++) {
      if (signerOrderStatus[msg.sender][_nonces[i]] == OPEN) {
        signerOrderStatus[msg.sender][_nonces[i]] = CANCELED;
        emit Cancel(_nonces[i], msg.sender);
      }
    }
  }

  /**
    * @notice Invalidate all orders below a nonce value
    * @dev Emits an Invalidate event
    * @param _minimumNonce uint256
    */
  function invalidate(
    uint256 _minimumNonce
  ) external {
    signerMinimumNonce[msg.sender] = _minimumNonce;
    emit Invalidate(_minimumNonce, msg.sender);
  }

  /**
    * @notice Authorize a delegated sender
    * @dev Emits an AuthorizeSender event
    * @param _authorizedSender address to authorize
    * @param _expiry uint256
    */
  function authorizeSender(
    address _authorizedSender,
    uint256 _expiry
  ) external {
    require(msg.sender != _authorizedSender, "INVALID_AUTH_SENDER");
    require(_expiry > block.timestamp, "INVALID_AUTH_EXPIRY");
    senderAuthorizations[msg.sender][_authorizedSender] = _expiry;
    emit AuthorizeSender(msg.sender, _authorizedSender, _expiry);
  }

  /**
    * @notice Authorize a delegated signer
    * @dev Emits an AuthorizeSigner event
    * @param _authorizedSigner address to authorize
    * @param _expiry uint256
    */
  function authorizeSigner(
    address _authorizedSigner,
    uint256 _expiry
  ) external {
    require(msg.sender != _authorizedSigner, "INVALID_AUTH_SIGNER");
    require(_expiry > block.timestamp, "INVALID_AUTH_EXPIRY");
    signerAuthorizations[msg.sender][_authorizedSigner] = _expiry;
    emit AuthorizeSigner(msg.sender, _authorizedSigner, _expiry);
  }

  /**
    * @notice Revoke an authorized sender
    * @dev Emits a RevokeSender event
    * @param _authorizedSender address
    */
  function revokeSender(
    address _authorizedSender
  ) external {
    delete senderAuthorizations[msg.sender][_authorizedSender];
    emit RevokeSender(msg.sender, _authorizedSender);
  }

  /**
    * @notice Revoke an authorized signer
    * @dev Emits a RevokeSigner event
    * @param _authorizedSigner address
    */
  function revokeSigner(
    address _authorizedSigner
  ) external {
    delete signerAuthorizations[msg.sender][_authorizedSigner];
    emit RevokeSigner(msg.sender, _authorizedSigner);
  }

  /**
    * @notice Determine whether a sender delegate is authorized
    * @param _approver address
    * @param _delegate address
    * @return bool returns whether a delegate is sender authorized
    */
  function isSenderAuthorized(
    address _approver,
    address _delegate
  ) internal view returns (bool) {
    return ((_approver == _delegate) ||
      senderAuthorizations[_approver][_delegate] > block.timestamp);
  }

  /**
    * @notice Determine whether a signer delegate is authorized
    * @param _approver address
    * @param _delegate address
    * @return bool returns whether a delegate is signer authorized
    */
  function isSignerAuthorized(
    address _approver,
    address _delegate
  ) internal view returns (bool) {
    return ((_approver == _delegate) ||
      (signerAuthorizations[_approver][_delegate] > block.timestamp));
  }

  /**
    * @notice Validate signature using an EIP-712 typed data hash
    * @param _order Order
    * @return bool returns whether the signature + order is valid
    */
  function isValid(
    Types.Order memory _order,
    bytes32 _domainSeparator
  ) internal pure returns (bool) {
    if (_order.signature.version == byte(0x01)) {
      return _order.signature.signatory == ecrecover(
        Types.hashOrder(
          _order,
          _domainSeparator),
          _order.signature.v,
          _order.signature.r,
          _order.signature.s
      );
    }
    if (_order.signature.version == byte(0x45)) {
      return _order.signature.signatory == ecrecover(
        keccak256(
          abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            Types.hashOrder(_order, _domainSeparator)
          )
        ),
        _order.signature.v,
        _order.signature.r,
        _order.signature.s
      );
    }
    return false;
  }

  /**
    * @notice Perform an ERC-20 or ERC-721 token transfer
    * @dev Transfer type specified by the bytes4 _kind param
    * @param _from address wallet address to send from
    * @param _to address wallet address to send to
    * @param _param uint256 amount for ERC-20 or token ID for ERC-721
    * @param _token address contract address of token
    * @param _kind bytes4 EIP-165 interface ID of the token
    */
  function transferToken(
      address _from,
      address _to,
      uint256 _param,
      address _token,
      bytes4 _kind
  ) internal {
    ITransferHandler transferHandler = registry.getTransferHandler(_kind);
    (bool success, bytes memory data) = address(transferHandler).
      delegatecall(abi.encodeWithSignature(
        "transferTokens(address,address,uint256,address)",
        _from,
        _to,
        _param,
        _token
    ));
    require(success && abi.decode(data, (bool)));
  }
}