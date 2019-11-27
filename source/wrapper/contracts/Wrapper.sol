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
  constructor(
    address wrapperSwapContract,
    address wrapperWethContract
  ) public {
    swapContract = ISwap(wrapperSwapContract);
    wethContract = IWETH(wrapperWethContract);
  }

  /**
    * @notice Required when withdrawing from WETH
    * @dev During unwraps, WETH.withdraw transfers ether to msg.sender (this contract)
    */
  function() external payable {
    // Ensure the message sender is the WETH contract.
    if(msg.sender != address(wethContract)) {
      revert("DO_NOT_SEND_ETHER");
    }
  }

  /**
    * @notice Send an Order
    * @dev Sender must authorize this contract on the swapContract
    * @dev Sender must approve this contract on the wethContract
    * @param order Types.Order The Order
    */
  function swap(
    Types.Order calldata order
  ) external payable {

    // Ensure msg.sender is sender wallet.
    require(order.sender.wallet == msg.sender,
      "MSG_SENDER_MUST_BE_ORDER_SENDER");

    // Ensure that the signature is present.
    // It will be explicitly checked in Swap.
    require(order.signature.v != 0,
      "SIGNATURE_MUST_BE_SENT");

    // Check if sender is sending ether that must be wrapped.
    _wrapEther(order.sender);

    // Perform the swap.
    swapContract.swap(order);

    // Check if sender is receiving ether that must be unwrapped.
    _unwrapEther(order.sender.wallet, order.signer.token, order.signer.param);
  }

  function provideDelegateOrder(
    Types.Order calldata order,
    IDelegate delegate
  ) external payable {
    // Delegate trade wallet must be order sender - checked in Delegate
    // Signature must be sent - checked in Delegate

    // Check if signer is sending ether that must be wrapped.
    _wrapEther(order.signer);

    // Provide the order to the Delegate.
    delegate.provideOrder(order);

    // Check if signer is receiving ether that must be unwrapped.
    _unwrapEther(order.signer.wallet, order.sender.token, order.sender.param);
  }

  function _wrapEther(Types.Party memory party) internal {
    // Check whether ether needs wrapping
    if (party.token == address(wethContract)) {
      // Ensure message value is param.
      require(party.param == msg.value,
        "VALUE_MUST_BE_SENT");

      // Wrap (deposit) the ether.
      wethContract.deposit.value(msg.value)();

      // Transfer the WETH from the wrapper to party.
      wethContract.transfer(party.wallet, party.param);

    } else {
      // Ensure no unexpected ether is sent.
      require(msg.value == 0,
        "VALUE_MUST_BE_ZERO");
    }
  }

  function _unwrapEther(address recipientWallet, address receivingToken, uint256 amount) internal {
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
