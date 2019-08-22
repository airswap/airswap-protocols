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

  // ERC-20 (fungible token) interface identifier (ERC-165)
  bytes4 constant internal ERC20_INTERFACE_ID = 0x277f8169;
  /*
    bytes4(keccak256('transfer(address,uint256)')) ^
    bytes4(keccak256('transferFrom(address,address,uint256)')) ^
    bytes4(keccak256('balanceOf(address)')) ^
    bytes4(keccak256('allowance(address,address)'));
  */

  // ERC-721 (non-fungible token) interface identifier (ERC-165)
  bytes4 constant internal ERC721_INTERFACE_ID = 0x80ac58cd;
  /*
    bytes4(keccak256('balanceOf(address)')) ^
    bytes4(keccak256('ownerOf(uint256)')) ^
    bytes4(keccak256('approve(address,uint256)')) ^
    bytes4(keccak256('getApproved(uint256)')) ^
    bytes4(keccak256('setApprovalForAll(address,bool)')) ^
    bytes4(keccak256('isApprovedForAll(address,address)')) ^
    bytes4(keccak256('transferFrom(address,address,uint256)')) ^
    bytes4(keccak256('safeTransferFrom(address,address,uint256)')) ^
    bytes4(keccak256('safeTransferFrom(address,address,uint256,bytes)'));
  */

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
    require(_order.expiry > block.timestamp,
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
    transferToken(
      finalTakerWallet,
      _order.maker.wallet,
      _order.taker.param,
      _order.taker.token,
      _order.taker.kind
    );

    // Transfer token from maker to taker.
    transferToken(
      _order.maker.wallet,
      finalTakerWallet,
      _order.maker.param,
      _order.maker.token,
      _order.maker.kind
    );

    // Transfer token from maker to affiliate if specified.
    if (_order.affiliate.wallet != address(0)) {
      transferToken(
        _order.maker.wallet,
        _order.affiliate.wallet,
        _order.affiliate.param,
        _order.affiliate.token,
        _order.affiliate.kind
      );
    }

    emit Swap(_order.nonce, block.timestamp,
      _order.maker.wallet, _order.maker.param, _order.maker.token,
      finalTakerWallet, _order.taker.param, _order.taker.token,
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
      if (makerOrderStatus[msg.sender][_nonces[i]] == OPEN) {
        makerOrderStatus[msg.sender][_nonces[i]] = CANCELED;
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
    makerMinimumNonce[msg.sender] = _minimumNonce;
    emit Invalidate(_minimumNonce, msg.sender);
  }

  /**
    * @notice Authorize a delegate
    * @dev Emits an Authorize event
    * @param _delegate address
    * @param _expiry uint256
    */
  function authorize(
    address _delegate,
    uint256 _expiry
  ) external {
    require(msg.sender != _delegate, "INVALID_AUTH_DELEGATE");
    require(_expiry > block.timestamp, "INVALID_AUTH_EXPIRY");
    delegateApprovals[msg.sender][_delegate] = _expiry;
    emit Authorize(msg.sender, _delegate, _expiry);
  }

  /**
    * @notice Revoke an authorization
    * @dev Emits a Revoke event
    * @param _delegate address
    */
  function revoke(
    address _delegate
  ) external {
    delete delegateApprovals[msg.sender][_delegate];
    emit Revoke(msg.sender, _delegate);
  }

  /**
    * @notice Determine whether a delegate is authorized
    * @param _approver address
    * @param _delegate address
    * @return bool returns whether a delegate is authorized
    */
  function isAuthorized(
    address _approver,
    address _delegate
  ) internal view returns (bool) {
    if (_approver == _delegate) return true;
    return (delegateApprovals[_approver][_delegate] > block.timestamp);
  }

  /**
    * @notice Validate signature using an EIP-712 typed data hash
    * @param _order Order
    * @param _signature Signature
    * @return bool returns whether the signature + order is valid
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
    if (_kind == ERC721_INTERFACE_ID) {
      // Attempt to transfer an ERC-721 token.
      IERC721(_token).safeTransferFrom(_from, _to, _param);
    } else {
      // Attempt to transfer an ERC-20 token.
      require(IERC20(_token).transferFrom(_from, _to, _param));
    }
  }
}