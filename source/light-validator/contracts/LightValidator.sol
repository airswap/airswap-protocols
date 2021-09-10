// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title LightValidator: Helper contract to Light protocol
 * @notice contains helper method that checks whether
 * a Light Order is well-formed and counterparty criteria is met
 */

contract LightValidator {
  bytes internal constant DOM_VERSION = "3";
  bytes internal constant DOM_NAME = "SWAP_LIGHT";

  function checkSwap(
    uint256 nonce,
    uint256 expiry,
    address signerWallet,
    IERC20 signerToken,
    uint256 signerAmont,
    IERC20 senderToken,
    uint256 senderAmount,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) public {}
}
