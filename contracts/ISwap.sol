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

  function swap(
    Types.Order calldata order,
    Types.Signature calldata signature
  ) external payable;

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
  ) external payable;

  function cancel(
    uint256[] calldata _nonces
  ) external;

  function invalidate(
    uint256 _minimumNonce
  ) external;

  function authorize(
    address _delegate,
    uint256 _expiry
  ) external;

  function revoke(
    address _delegate
  ) external;

}
