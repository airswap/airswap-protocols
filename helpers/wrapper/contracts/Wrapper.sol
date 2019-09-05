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

import "@airswap/swap/contracts/interfaces/ISwap.sol";
import "@airswap/tokens/contracts/interfaces/IWETH.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

/**
  * @title Wrapper: Send and receive ether for WETH trades
  */
contract Wrapper {

  // Swap contract to settle trades
  ISwap public swapContract;

  // WETH contract to wrap ether
  IWETH public wethContract;

  uint256 constant MAX_INT = 2**256 - 1;
  /**
    * @notice Contract Constructor
    * @param _swapContract address
    * @param _wethContract address
    */
  constructor(
    address _swapContract,
    address _wethContract
  ) public {
    swapContract = ISwap(_swapContract);
    wethContract = IWETH(_wethContract);

    // Sets unlimited allowance for the Wrapper contract.
    wethContract.approve(_swapContract, MAX_INT);
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
    * @dev Taker must authorize this contract on the swapContract
    * @dev Taker must approve this contract on the wethContract
    * @param _order Types.Order
    */
  function swap(
    Types.Order calldata _order
  ) external payable {

    // Ensure message sender is taker wallet.
    require(_order.taker.wallet == msg.sender,
      "SENDER_MUST_BE_TAKER");

    // The taker is sending ether that must be wrapped.
    if (_order.taker.token == address(wethContract)) {

      // Ensure  message value is taker param.
      require(_order.taker.param == msg.value,
        "VALUE_MUST_BE_SENT");

      // Wrap (deposit) the ether.
      wethContract.deposit.value(msg.value)();

      // Transfer from wrapper to taker.
      wethContract.transfer(_order.taker.wallet, _order.taker.param);

    } else {

      // Ensure no unexpected ether is sent.
      require(msg.value == 0,
        "VALUE_MUST_BE_ZERO");

    }

    // Perform the swap.
    swapContract.swap(_order);

    // The taker is receiving ether that must be unwrapped.
    if (_order.maker.token == address(wethContract)) {

      // Transfer from the taker to the wrapper.
      wethContract.transferFrom(_order.taker.wallet, address(this), _order.maker.param);

      // Unwrap (withdraw) the ether.
      wethContract.withdraw(_order.maker.param);

      // Transfer ether to the user.
      msg.sender.transfer(_order.maker.param);

    }
  }
}
