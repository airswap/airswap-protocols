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

import "@airswap/lib/contracts/Signatures.sol";
import "@airswap/lib/contracts/Transfers.sol";
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

  // Mapping of makers to orders by nonce as TAKEN (0x01) or CANCELED (0x02)
  mapping (address => mapping (uint256 => byte)) public makerOrderStatus;

  // Mapping of peer address to delegate address and expiry.
  mapping (address => mapping (address => uint256)) public approvals;

  // Mapping of makers to an optionally set minimum valid nonce
  mapping (address => uint256) public makerMinimumNonce;

  /**
    * @notice Contract Events
    * @dev Emitted with successful state changes
    */

  event Swap(
    uint256 indexed nonce,
    uint256 timestamp,
    address indexed makerWallet,
    uint256 makerParam,
    address makerToken,
    address indexed takerWallet,
    uint256 takerParam,
    address takerToken,
    address affiliateWallet,
    uint256 affiliateParam,
    address affiliateToken
  );

  event Cancel(
    uint256 indexed nonce,
    address indexed makerWallet
  );

  event Invalidate(
    uint256 indexed nonce,
    address indexed makerWallet
  );

  event Authorize(
    address indexed approverAddress,
    address indexed delegateAddress,
    uint256 expiry
  );

  event Revoke(
    address indexed approverAddress,
    address indexed delegateAddress
  );

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
    * @param order Types.Order
    * @param signature Types.Signature
    */
  function swap(
    Types.Order calldata order,
    Types.Signature calldata signature
  )
    external payable
  {

    // Ensure the order is not expired.
    require(order.expiry >= block.timestamp,
      "ORDER_EXPIRED");

    // Ensure the order is not already taken.
    require(makerOrderStatus[order.maker.wallet][order.nonce] != TAKEN,
      "ORDER_ALREADY_TAKEN");

    // Ensure the order is not already canceled.
    require(makerOrderStatus[order.maker.wallet][order.nonce] != CANCELED,
      "ORDER_ALREADY_CANCELED");

    // Ensure the order nonce is above the minimum.
    require(order.nonce >= makerMinimumNonce[order.maker.wallet],
      "NONCE_TOO_LOW");

    // Mark the order TAKEN (0x01).
    makerOrderStatus[order.maker.wallet][order.nonce] = TAKEN;

    // Validate the taker side of the trade.
    address finalTakerWallet;

    if (order.taker.wallet == address(0)) {
      /**
        * Taker is not specified. The sender of the transaction becomes
        * the taker of the order.
        */
      finalTakerWallet = msg.sender;

    } else {
      /**
        * Taker is specified. If the sender is not the specified taker,
        * determine whether the sender has been authorized by the taker.
        */
      if (msg.sender != order.taker.wallet) {
        require(isAuthorized(order.taker.wallet, msg.sender),
          "SENDER_UNAUTHORIZED");
      }
      // The specified taker is all clear.
      finalTakerWallet = order.taker.wallet;

    }

    // Validate the maker side of the trade.
    if (signature.v == 0) {
      /**
        * Signature is not provided. The maker may have authorized the sender
        * to swap on its behalf, which does not require a signature.
        */
      require(isAuthorized(order.maker.wallet, msg.sender),
        "SIGNER_UNAUTHORIZED");

    } else {
      /**
        * The signature is provided. Determine whether the signer is
        * authorized by the maker and if so validate the signature itself.
        */
      require(isAuthorized(order.maker.wallet, signature.signer),
        "SIGNER_UNAUTHORIZED");

      // Ensure the signature is valid.
      require(Signatures.isValid(order, signature, domainSeparator),
        "SIGNATURE_INVALID");

    }

    // Validate the message ether value.
    if (order.taker.token == address(0)) {
      /**
        * An ether value is expected. Ensure the ether sent matches the taker
        * param and send it to the maker wallet.
        */
      require(msg.value == order.taker.param,
        "VALUE_MUST_BE_SENT");

      // Transfer ether from taker to maker
      Transfers.send(order.maker.wallet, msg.value);

    } else {
      /**
        * An ether value is not expected. Ensure the value sent is zero and
        * perform a token transfer to the taker wallet.
        */
      require(msg.value == 0,
        "VALUE_MUST_BE_ZERO");

      // Transfer token from taker to maker.
      Transfers.safeTransferAny(
        "TAKER",
        finalTakerWallet,
        order.maker.wallet,
        order.taker.param,
        order.taker.token
      );

    }

    // Transfer token from maker to taker.
    Transfers.safeTransferAny(
      "MAKER",
      order.maker.wallet,
      finalTakerWallet,
      order.maker.param,
      order.maker.token
    );

    // Transfer token from maker to affiliate if specified.
    if (order.affiliate.wallet != address(0)) {
      Transfers.safeTransferAny(
        "MAKER",
        order.maker.wallet,
        order.affiliate.wallet,
        order.affiliate.param,
        order.affiliate.token
      );
    }

    emit Swap(order.nonce, block.timestamp,
      order.maker.wallet, order.maker.param, order.maker.token,
      finalTakerWallet, order.taker.param, order.taker.token,
      order.affiliate.wallet, order.affiliate.param, order.affiliate.token
    );
  }

  /**
    * @notice Atomic Token Swap (Simple)
    * @dev Determines type (ERC-20 or ERC-721) with ERC-165
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
    */
  function swapSimple(
    uint256 nonce,
    uint256 expiry,
    address makerWallet,
    uint256 makerParam,
    address makerToken,
    address takerWallet,
    uint256 takerParam,
    address takerToken,
    uint8 v,
    bytes32 r,
    bytes32 s
  )
      external payable
  {

    // Ensure the order is not expired.
    require(expiry >= block.timestamp,
      "ORDER_EXPIRED");

    // Ensure the order has not already been taken or canceled.
    require(makerOrderStatus[makerWallet][nonce] == OPEN,
      "ORDER_UNAVAILABLE");

    require(nonce >= makerMinimumNonce[makerWallet],
      "NONCE_TOO_LOW");

    // Validate the taker side of the trade.
    address finalTakerWallet;

    if (takerWallet == address(0)) {

      // Set a null taker to be the order sender.
      finalTakerWallet = msg.sender;

    } else {

      // Ensure the order sender is authorized.
      if (msg.sender != takerWallet) {
        require(isAuthorized(takerWallet, msg.sender),
          "SENDER_UNAUTHORIZED");
      }

      finalTakerWallet = takerWallet;

    }

    // Validate the maker side of the trade.
    if (v == 0) {
      /**
        * Signature is not provided. The maker may have authorized the sender
        * to swap on its behalf, which does not require a signature.
        */
      require(isAuthorized(makerWallet, msg.sender),
        "SIGNER_UNAUTHORIZED");

    } else {

      // Signature is provided. Ensure that it is valid.
      require(Signatures.isValidSimple(
        nonce,
        expiry,
        makerWallet,
        makerParam,
        makerToken,
        takerWallet,
        takerParam,
        takerToken,
        v, r, s,
        address(this)
      ), "SIGNATURE_INVALID");
    }

    // Mark the order TAKEN (0x01).
    makerOrderStatus[makerWallet][nonce] = TAKEN;

    // A null taker token is an order for ether.
    if (takerToken == address(0)) {

      // Ensure the ether sent matches the taker param.
      require(msg.value == takerParam,
        "VALUE_MUST_BE_SENT");

      // Transfer ether from taker to maker.
      Transfers.send(makerWallet, msg.value);

    } else {

      // Ensure the value sent is zero.
      require(msg.value == 0,
        "VALUE_MUST_BE_ZERO");

      // Transfer token from taker to maker.
      Transfers.transferAny(takerToken, finalTakerWallet, makerWallet, takerParam);

    }

    // Transfer token from maker to taker.
    Transfers.transferAny(makerToken, makerWallet, finalTakerWallet, makerParam);

    emit Swap(nonce, block.timestamp,
      makerWallet, makerParam, makerToken,
      finalTakerWallet, takerParam, takerToken,
      address(0), 0, address(0)
    );

  }

  /**
    * @notice Cancel One or More Orders by Nonce
    * @dev Canceled orders are marked CANCELED (0x02)
    * @param nonces uint256[]
    */
  function cancel(
    uint256[] calldata nonces
  ) external {
    for (uint256 i = 0; i < nonces.length; i++) {
      if (makerOrderStatus[msg.sender][nonces[i]] == OPEN) {
        makerOrderStatus[msg.sender][nonces[i]] = CANCELED;
        emit Cancel(nonces[i], msg.sender);
      }
    }
  }

  /**
    * @notice Invalidate All Orders Below a Nonce Value
    * @param minimumNonce uint256
    */
  function invalidate(
    uint256 minimumNonce
  ) external {
    makerMinimumNonce[msg.sender] = minimumNonce;
    emit Invalidate(minimumNonce, msg.sender);
  }

  /**
    * @notice Authorize a Delegate
    * @dev Expiry value is inclusive
    * @param delegate address
    * @param expiry uint256
    */
  function authorize(
    address delegate,
    uint256 expiry
  ) external {
    require(msg.sender != delegate, "INVALID_AUTH_DELEGATE");
    require(expiry >= block.timestamp, "INVALID_AUTH_EXPIRY");
    approvals[msg.sender][delegate] = expiry;
    emit Authorize(msg.sender, delegate, expiry);
  }

  /**
    * @notice Revoke an Authorization
    * @param delegate address
    */
  function revoke(
    address delegate
  ) external {
    delete approvals[msg.sender][delegate];
    emit Revoke(msg.sender, delegate);
  }

  /**
    * @notice Determine Whether a Delegate is Authorized
    * @dev Expiry value is inclusive
    * @param approver address
    * @param delegate address
    */
  function isAuthorized(
    address approver,
    address delegate
  ) internal view returns (bool) {
    if (approver == delegate) return true;
    return (approvals[approver][delegate] >= block.timestamp);
  }

}
