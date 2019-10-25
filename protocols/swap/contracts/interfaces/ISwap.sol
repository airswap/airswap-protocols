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

import "@airswap/types/contracts/Types.sol";

interface ISwap {

  event Swap(
    uint256 indexed nonce,
    uint256 timestamp,
    address indexed signerWallet,
    uint256 signerParam,
    address signerToken,
    address indexed senderWallet,
    uint256 senderParam,
    address senderToken,
    address affiliateWallet,
    uint256 affiliateParam,
    address affiliateToken
  );

  event Cancel(
    uint256 indexed nonce,
    address indexed signerWallet
  );

  event Invalidate(
    uint256 indexed nonce,
    address indexed signerWallet
  );

  event AuthorizeSender(
    address indexed authorizerAddress,
    address indexed authorizedSender,
    uint256 expiry
  );

  event AuthorizeSigner(
    address indexed authorizerAddress,
    address indexed authorizedSigner,
    uint256 expiry
  );

  event RevokeSender(
    address indexed authorizerAddress,
    address indexed revokedSender
  );

  event RevokeSigner(
    address indexed authorizerAddress,
    address indexed revokedSigner
  );

  function senderAuthorizations(address, address) external returns (uint256);
  function signerAuthorizations(address, address) external returns (uint256);

  function signerNonceStatus(address, uint256) external returns (byte);
  function signerMinimumNonce(address) external returns (uint256);

  /**
    * @notice Atomic Token Swap
    * @param order Types.Order
    */
  function swap(
    Types.Order calldata order
  ) external;

  /**
    * @notice Cancel one or more open orders by nonce
    * @param nonces uint256[]
    */
  function cancel(
    uint256[] calldata nonces
  ) external;

  /**
    * @notice Invalidate all orders below a nonce value
    * @param minimumNonce uint256
    */
  function invalidate(
    uint256 minimumNonce
  ) external;

  /**
    * @notice Authorize a delegated sender
    * @param authorizedSender address
    * @param expiry uint256
    */
  function authorizeSender(
    address authorizedSender,
    uint256 expiry
  ) external;

  /**
    * @notice Authorize a delegated signer
    * @param authorizedSigner address
    * @param expiry uint256
    */
  function authorizeSigner(
    address authorizedSigner,
    uint256 expiry
  ) external;


  /**
    * @notice Revoke an authorization
    * @param authorizedSender address
    */
  function revokeSender(
    address authorizedSender
  ) external;

  /**
    * @notice Revoke an authorization
    * @param authorizedSigner address
    */
  function revokeSigner(
    address authorizedSigner
  ) external;

}
