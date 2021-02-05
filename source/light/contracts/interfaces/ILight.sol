/*
  Copyright 2020 Swap Holdings Ltd.

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

pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ILight {
  event Swap(
    uint256 indexed nonce,
    uint256 timestamp,
    address indexed signerWallet,
    address indexed senderWallet,
    IERC20 signerToken,
    IERC20 senderToken,
    uint256 signerAmount,
    uint256 senderAmount
  );

  event Cancel(uint256 indexed nonce, address indexed signerWallet);

  event CancelUpTo(uint256 indexed nonce, address indexed signerWallet);

  event Authorized(address indexed signer, address indexed signerWallet);

  event Revoked(address indexed revokedSigner, address indexed signerWallet);

  /**
   * @notice Atomic Token Swap
   * @param nonce Unique per order and should be sequential
   * @param expiry Expiry in seconds since 1 January 1970
   * @param signerToken Contract address of the ERC20 token that will be transferred from the signer
   * @param signerAmount Amount for signerToken
   * @param senderToken Contract address of the ERC20 token that will be transferred from the sender
   * @param senderAmount Amount for senderToken
   */
  function swap(
    uint256 nonce,
    uint256 expiry,
    address signerWallet,
    IERC20 signerToken,
    uint256 signerAmount,
    IERC20 senderToken,
    uint256 senderAmount,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external;

  function authorize(address sender) external;

  function revoke() external;

  /**
   * @notice Cancel one or more open orders by nonce
   * @param nonces uint256[]
   */
  function cancel(uint256[] calldata nonces) external;

  /**
   * @notice Cancels all orders below a nonce value
   * @dev These orders can be made active by reducing the minimum nonce
   * @param minimumNonce uint256
   */
  function cancelUpTo(uint256 minimumNonce) external;

  function nonceUsed(address, uint256) external view returns (bool);

  function signerMinimumNonce(address) external view returns (uint256);

  function authorized(address) external view returns (address);
}
