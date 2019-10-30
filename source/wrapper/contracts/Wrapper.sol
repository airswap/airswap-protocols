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
import "@airswap/tokens/contracts/interfaces/IWETH.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

/**
  * @title Wrapper: Send and receive ether for WETH trades
  */
contract Wrapper is Ownable {

  // The Swap contract to settle trades
  ISwap public swapContract;

  // The WETH contract to wrap ether
  IWETH public wethContract;

  // Boolean marking when the contract is paused - users cannot call functions when true
  // defaults to false
  bool public contractPaused;

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
  * @notice Modifier to prevent function calling unless the contract is not paused
  */
  modifier notPaused() {
    require(!contractPaused, "CONTRACT_IS_PAUSED");
    _;
  }

  /**
    * @notice Modifier to prevent function calling unless the contract is paused
    */
  modifier paused() {
    require(contractPaused, "CONTRACT_NOT_PAUSED");
    _;
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
    * @notice Set whether the contract is paused
    * @dev Only callable by owner
    * @param newStatus bool New status of contractPaused
    */
  function setPausedStatus(bool newStatus) external onlyOwner {
    contractPaused = newStatus;
  }

  /**
    * @notice Destroy the Contract
    * @dev Only callable by owner and when contractPaused
    * @param recipient address Recipient of any ETH in the contract
    */
  function killContract(address payable recipient) external onlyOwner paused {
    selfdestruct(recipient);
  }

  /**
    * @notice Send an Order
    * @dev Sender must authorize this contract on the swapContract
    * @dev Sender must approve this contract on the wethContract
    * @param order Types.Order The Order
    */
  function swap(
    Types.Order calldata order
  ) external payable notPaused {

    // Ensure msg.sender is sender wallet.
    require(order.sender.wallet == msg.sender,
      "MSG_SENDER_MUST_BE_ORDER_SENDER");

    // Ensure that the signature is present.
    // It will be explicitly checked in Swap.
    require(order.signature.v != 0,
      "SIGNATURE_MUST_BE_SENT");

    // The sender is sending ether that must be wrapped.
    if (order.sender.token == address(wethContract)) {

      // Ensure message value is sender param.
      require(order.sender.param == msg.value,
        "VALUE_MUST_BE_SENT");

      // Wrap (deposit) the ether.
      wethContract.deposit.value(msg.value)();

      // Transfer the WETH from the wrapper to sender.
      wethContract.transfer(order.sender.wallet, order.sender.param);

    } else {

      // Ensure no unexpected ether is sent.
      require(msg.value == 0,
        "VALUE_MUST_BE_ZERO");

    }

    // Perform the swap.
    swapContract.swap(order);

    // The sender is receiving ether that must be unwrapped.
    if (order.signer.token == address(wethContract)) {

      // Transfer from the sender to the wrapper.
      wethContract.transferFrom(order.sender.wallet, address(this), order.signer.param);

      // Unwrap (withdraw) the ether.
      wethContract.withdraw(order.signer.param);

      // Transfer ether to the user.
      // solium-disable-next-line security/no-call-value
      msg.sender.call.value(order.signer.param)("");
    }
  }
}
