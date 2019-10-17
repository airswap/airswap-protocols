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
    address indexed approverAddress,
    address indexed authorizedSender,
    uint256 expiry
  );

  event AuthorizeSigner(
    address indexed approverAddress,
    address indexed authorizedSigner,
    uint256 expiry
  );

  event RevokeSender(
    address indexed approverAddress,
    address indexed revokedSender
  );

  event RevokeSigner(
    address indexed approverAddress,
    address indexed revokedSigner
  );

  function senderAuthorizations(address, address) external returns (uint256);
  function signerAuthorizations(address, address) external returns (uint256);

  function signerOrderStatus(address, uint256) external returns (byte);
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
    * @param _nonces uint256[]
    */
  function cancel(
    uint256[] calldata _nonces
  ) external;

  /**
    * @notice Invalidate all orders below a nonce value
    * @param _minimumNonce uint256
    */
  function invalidate(
    uint256 _minimumNonce
  ) external;

  /**
    * @notice Authorize a delegated sender
    * @param _authorizedSender address
    * @param _expiry uint256
    */
  function authorizeSender(
    address _authorizedSender,
    uint256 _expiry
  ) external;

  /**
    * @notice Authorize a delegated signer
    * @param _authorizedSigner address
    * @param _expiry uint256
    */
  function authorizeSigner(
    address _authorizedSigner,
    uint256 _expiry
  ) external;


  /**
    * @notice Revoke an authorization
    * @param _authorizedSender address
    */
  function revokeSender(
    address _authorizedSender
  ) external;

  /**
    * @notice Revoke an authorization
    * @param _authorizedSigner address
    */
  function revokeSigner(
    address _authorizedSigner
  ) external;

}
