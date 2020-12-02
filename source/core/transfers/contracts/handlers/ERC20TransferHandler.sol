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

pragma solidity 0.5.16;

import "../interfaces/ITransferHandler.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "@airswap/types/contracts/BytesManipulator.sol";

contract ERC20TransferHandler is ITransferHandler {
  using SafeERC20 for IERC20;
  using BytesManipulator for bytes;

  /**
   * @notice Function to wrap safeTransferFrom for ERC20
   * @param from address Wallet address to transfer from
   * @param to address Wallet address to transfer to
   * @param token address Contract address of token
   * @param data bytes The ERC20 amount, encoded in 32 bytes
   * @return bool on success of the token transfer
   */
  function transferTokens(
    address from,
    address to,
    address token,
    bytes calldata data
  ) external returns (bool) {
    require(data.length == 32, "DATA_MUST_BE_32_BYTES");

    uint256 amount = data.getUint256(0);
    IERC20(token).safeTransferFrom(from, to, amount);
    return true;
  }
}
