/*
  Copyright 2021 Swap Holdings Ltd.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

  SPDX-License-Identifier: Apache-2.0
*/

pragma solidity ^0.8.7;
pragma experimental ABIEncoderV2;

import "./interfaces/ILight.sol";
import "./interfaces/IWETH.sol";

/**
 * @title LightWrapper: Send and receive ether for WETH trades
 */
contract LightWrapper {
  // The Swap contract to settle trades
  ILight public swapContract;

  // The WETH contract to wrap ether
  IWETH public wethContract;

  /**
   * @notice Contract Constructor
   * @param wrapperSwapContract address
   * @param wrapperWethContract address
   */
  constructor(address wrapperSwapContract, address wrapperWethContract) {
    swapContract = ILight(wrapperSwapContract);
    wethContract = IWETH(wrapperWethContract);
  }

  /**
   * @notice Required when withdrawing from WETH
   * @dev During unwraps, WETH.withdraw transfers ether to msg.sender (this contract)
   */
  receive() external payable {
    // Ensure the message sender is the WETH contract
    if (msg.sender != address(wethContract)) {
      revert("DO_NOT_SEND_ETHER");
    }
  }

  /**
   * @notice Wrap and unwrap ether for a swap
   * @param nonce uint256 Unique and should be sequential
   * @param expiry uint256 Expiry in seconds since 1 January 1970
   * @param signerWallet address Wallet of the signer
   * @param signerToken address ERC20 token transferred from the signer
   * @param signerAmount uint256 Amount transferred from the signer
   * @param senderToken address ERC20 token transferred from the sender
   * @param senderAmount uint256 Amount transferred from the sender
   * @param v uint8 "v" value of the ECDSA signature
   * @param r bytes32 "r" value of the ECDSA signature
   * @param s bytes32 "s" value of the ECDSA signature
   */
  function swap(
    uint256 nonce,
    uint256 expiry,
    address signerWallet,
    address signerToken,
    uint256 signerAmount,
    address senderToken,
    uint256 senderAmount,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external payable {
    // Check whether ether needs wrapping
    if (senderToken == address(wethContract)) {
      // Ensure message value is param
      require(senderAmount == msg.value, "VALUE_MUST_BE_SENT");
      // Wrap (deposit) the ether
      wethContract.deposit{value: msg.value}();
    }

    // Perform the swap
    swapContract.swap(
      nonce,
      expiry,
      signerWallet,
      signerToken,
      signerAmount,
      senderToken,
      senderAmount,
      v,
      r,
      s
    );

    if (signerToken == address(wethContract)) {
      // Unwrap (withdraw) the ether
      wethContract.withdraw(signerAmount);
      // Transfer ether to the recipient
      // solium-disable-next-line security/no-call-value
      (bool success, ) = msg.sender.call{value: signerAmount}("");
      require(success, "ETH_RETURN_FAILED");
    }
  }
}
