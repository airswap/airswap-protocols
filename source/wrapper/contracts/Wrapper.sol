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
pragma experimental ABIEncoderV2;

import "@airswap/swap/contracts/interfaces/ISwap.sol";
import "@airswap/delegate/contracts/interfaces/IDelegate.sol";
import "@airswap/tokens/contracts/interfaces/IWETH.sol";

/**
 * @title Wrapper: Send and receive ether for WETH trades
 */
contract Wrapper {
  // The Swap contract to settle trades
  ISwap public swapContract;

  // The WETH contract to wrap ether
  IWETH public wethContract;

  /**
   * @notice Contract Constructor
   * @param wrapperSwapContract address
   * @param wrapperWethContract address
   */
  constructor(address wrapperSwapContract, address wrapperWethContract) public {
    swapContract = ISwap(wrapperSwapContract);
    wethContract = IWETH(wrapperWethContract);
  }

  /**
   * @notice Required when withdrawing from WETH
   * @dev During unwraps, WETH.withdraw transfers ether to msg.sender (this contract)
   */
  function() external payable {
    // Ensure the message sender is the WETH contract.
    if (msg.sender != address(wethContract)) {
      revert("DO_NOT_SEND_ETHER");
    }
  }

  /**
   * @notice Send an Order to be forwarded to Swap
   * @dev Sender must authorize this contract on the swapContract
   * @dev Sender must approve this contract on the wethContract
   * @param order Types.Order The Order
   */
  function swap(Types.Order calldata order) external payable {
    // Ensure msg.sender is sender wallet.
    require(
      order.sender.wallet == msg.sender,
      "MSG_SENDER_MUST_BE_ORDER_SENDER"
    );

    // Ensure that the signature is present.
    // The signature will be explicitly checked in Swap.
    require(order.signature.v != 0, "SIGNATURE_MUST_BE_SENT");

    // Wraps ETH to WETH when the sender provides ETH and the order is WETH
    _wrapEther(order.sender);

    // Perform the swap.
    swapContract.swap(order);

    // Unwraps WETH to ETH when the sender receives WETH
    _unwrapEther(order.sender.wallet, order.signer.token, order.signer.amount);
  }

  /**
   * @notice Send an Order to be forwarded to a Delegate
   * @dev Sender must authorize the Delegate contract on the swapContract
   * @dev Sender must approve this contract on the wethContract
   * @dev Delegate's tradeWallet must be order.sender - checked in Delegate
   * @param order Types.Order The Order
   * @param delegate IDelegate The Delegate to provide the order to
   */
  function provideDelegateOrder(Types.Order calldata order, IDelegate delegate)
    external
    payable
  {
    // Ensure that the signature is present.
    // The signature will be explicitly checked in Swap.
    require(order.signature.v != 0, "SIGNATURE_MUST_BE_SENT");

    // Wraps ETH to WETH when the signer provides ETH and the order is WETH
    _wrapEther(order.signer);

    // Provide the order to the Delegate.
    delegate.provideOrder(order);

    // Unwraps WETH to ETH when the signer receives WETH
    _unwrapEther(order.signer.wallet, order.sender.token, order.sender.amount);
  }

  /**
   * @notice Wraps ETH to WETH when a trade requires it
   * @param party Types.Party The side of the trade that may need wrapping
   */
  function _wrapEther(Types.Party memory party) internal {
    // Check whether ether needs wrapping
    if (party.token == address(wethContract)) {
      // Ensure message value is param.
      require(party.amount == msg.value, "VALUE_MUST_BE_SENT");

      // Wrap (deposit) the ether.
      wethContract.deposit.value(msg.value)();

      // Transfer the WETH from the wrapper to party.
      // Return value not checked - WETH throws on error and does not return false
      wethContract.transfer(party.wallet, party.amount);
    } else {
      // Ensure no unexpected ether is sent.
      require(msg.value == 0, "VALUE_MUST_BE_ZERO");
    }
  }

  /**
   * @notice Unwraps WETH to ETH when a trade requires it
   * @dev The unwrapping only succeeds if recipientWallet has approved transferFrom
   * @param recipientWallet address The trade recipient, who may have received WETH
   * @param receivingToken address The token address the recipient received
   * @param amount uint256 The amount of token the recipient received
   */
  function _unwrapEther(
    address recipientWallet,
    address receivingToken,
    uint256 amount
  ) internal {
    // Check whether ether needs unwrapping
    if (receivingToken == address(wethContract)) {
      // Transfer weth from the recipient to the wrapper.
      wethContract.transferFrom(recipientWallet, address(this), amount);

      // Unwrap (withdraw) the ether.
      wethContract.withdraw(amount);

      // Transfer ether to the recipient.
      // solium-disable-next-line security/no-call-value
      (bool success, ) = recipientWallet.call.value(amount)("");

      require(success, "ETH_RETURN_FAILED");
    }
  }
}
