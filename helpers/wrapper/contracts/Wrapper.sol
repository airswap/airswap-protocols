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

pragma solidity ^0.5.10;
pragma experimental ABIEncoderV2;

import "@airswap/swap/interfaces/ISwap.sol";
import "@airswap/tokens/interfaces/IWETH.sol";
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
    * @notice Required to receive ether from IWETH
    */
  function() external payable { }

  /**
    * @notice Send an Order
    * @param _order Types.Order
    * @param _signature Types.Signature
    */
  function swap(
    Types.Order calldata _order,
    Types.Signature calldata _signature
  ) external payable {

    // The taker is sending ether.
    if (_order.taker.token == address(wethContract)) {

      require(_order.taker.wallet == address(0),
        "TAKER_WALLET_MUST_BE_UNSET");

      require(_order.taker.param == msg.value,
        "VALUE_MUST_BE_SENT");

      // Wrap (deposit) the ether.
      wethContract.deposit.value(msg.value)();

    } else {

      // Ensure no unexpected ether sent during WETH transaction.
      require(msg.value == 0,
        "VALUE_MUST_BE_ZERO");

      // Ensure msg sender matches the takerWallet.
      require(msg.sender == _order.taker.wallet,
        "SENDER_MUST_BE_TAKER");
    }

    // Perform the simple swap.
    swapContract.swap(
      _order,
      _signature
    );

    // The taker is receiving ether.
    if (_order.maker.token == address(wethContract)) {

      // Transfer from the taker to the wrapper.
      wethContract.transferFrom(_order.taker.wallet, address(this), _order.maker.param);

      // Unwrap (withdraw) the ether.
      wethContract.withdraw(_order.maker.param);

      // Transfer ether to the user.
      msg.sender.transfer(_order.maker.param);

      /* The taker wallet was not defined and thus the swapped
       * makerTokens were distributed to the wrapper contract
       * and now the wrapper contract forwards them to msg.sender.
       */
    } else if ((_order.maker.token != address(0)) && (_order.taker.wallet == address(0))) {

      // Forwarding the _makerAmount of type _makerToken to the msg.sender.
      require(IERC20(_order.maker.token).transfer(msg.sender, _order.maker.param));
    }
    // Falls here if it was a non-WETH ERC20 - non-WETH ERC20 trade and the
    // transaction did not require any wrapper functionality.
  }
}
