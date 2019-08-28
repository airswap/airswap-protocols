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

  function delegateApprovals(address, address) external returns (uint256);
  function makerOrderStatus(address, uint256) external returns (byte);
  function makerMinimumNonce(address) external returns (uint256);

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
    * @notice Authorize a delegate
    * @param _delegate address
    * @param _expiry uint256
    */
  function authorize(
    address _delegate,
    uint256 _expiry
  ) external;

  /**
    * @notice Revoke an authorization
    * @param _delegate address
    */
  function revoke(
    address _delegate
  ) external;

}
