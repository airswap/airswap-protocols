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

  /**
    * @notice Contract Constructor
    *
    * @param _swapContract address
    * @param _wethContract address
    */
  constructor(
    address _swapContract,
    address _wethContract
  ) public {
    swapContract = ISwap(_swapContract);
    wethContract = IWETH(_wethContract);
  }

  /**
    * @notice Required to recieve ether from IWETH
    */
  function() external payable { }

  /**
    * @notice Send an Order (Simple)
    *
    * @param nonce uint256
    * @param expiry uint256
    * @param makerWallet address
    * @param makerParam uint256
    * @param makerToken address
    * @param takerWallet address
    * @param takerParam uint256
    * @param takerToken address
    * @param v uint8
    * @param r bytes32
    * @param s bytes32
    */
  function swapSimple(
    uint256 nonce,
    uint256 expiry,
    address makerWallet,
    uint256 makerParam,
    address makerToken,
    address takerWallet,
    uint256 takerParam,
    address takerToken,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) public payable {

    // The taker is sending ether.
    if (takerToken == address(wethContract)) {

      // Ensure the takerWallet is unset.
      require(takerWallet == address(0),
        "TAKER_ADDRESS_MUST_BE_UNSET");

      // Ensure the takerToken is wrapped ether.
      require(takerToken == address(wethContract),
        "TAKER_PARAM_MUST_BE_WETH");

      // Ensure the takerParam matches the ether sent.
      require(takerParam == msg.value,
        "VALUE_MUST_BE_SENT");

      // Wrap (deposit) the ether.
      wethContract.deposit.value(msg.value)();

      // Approve the Swap contract to trade it.
      wethContract.approve(address(swapContract), msg.value);

    } else {

      // Ensure no unexpected ether sent.
      require(msg.value == 0,
        "VALUE_MUST_BE_ZERO");

    }

    // Perform the swap.
    swapContract.swapSimple(nonce, expiry,
      makerWallet, makerParam, makerToken,
      takerWallet, takerParam, takerToken,
      v, r, s
    );

    // The taker is receiving ether.
    if (makerToken == address(wethContract)) {

      // Transfer from the taker to the wrapper.
      wethContract.transferFrom(takerWallet, address(this), makerParam);

      // Unwrap (withdraw) the ether.
      wethContract.withdraw(makerParam);

      // Transfer ether to the user.
      msg.sender.transfer(makerParam);

    }

    // Ensure no WETH balance remains.
    require(wethContract.balanceOf(address(this)) == 0,
      "WETH_BALANCE_REMAINING");

    // Ensure no ether balance remains.
    require(address(this).balance == 0,
      "ETH_BALANCE_REMAINING");
  }
}