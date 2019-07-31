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

import "./ISwap.sol";
import "./IWETH.sol";
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
    * @param _nonce uint256
    * @param _expiry uint256
    * @param _makerWallet address
    * @param _makerParam uint256
    * @param _makerToken address
    * @param _takerWallet address
    * @param _takerParam uint256
    * @param _takerToken address
    * @param _v uint8
    * @param _r bytes32
    * @param _s bytes32
    */
  function swapSimple(
    uint256 _nonce,
    uint256 _expiry,
    address _makerWallet,
    uint256 _makerParam,
    address _makerToken,
    address _takerWallet,
    uint256 _takerParam,
    address _takerToken,
    uint8 _v,
    bytes32 _r,
    bytes32 _s
  ) public payable {

    // The taker is sending ether.
    if (_takerToken == address(wethContract)) {

      // Ensure the takerWallet is unset.
      require(_takerWallet == address(0),
        "TAKER_ADDRESS_MUST_BE_UNSET");

      // Ensure the _takerToken is wrapped ether.
      require(_takerToken == address(wethContract),
        "TAKER_PARAM_MUST_BE_WETH");

      // Ensure the _takerParam matches the ether sent.
      require(_takerParam == msg.value,
        "VALUE_MUST_BE_SENT");

      // Wrap (deposit) the ether.
      wethContract.deposit.value(msg.value)();

      // Approve Swap to trade it.
      wethContract.approve(address(swapContract), msg.value);

    } else {

      // Ensure no unexpected ether sent.
      require(msg.value == 0,
        "VALUE_MUST_BE_ZERO");

    }

    // Perform the swap.
    swapContract.swapSimple(
      _nonce,
      _expiry,
      _makerWallet,
      _makerParam,
      _makerToken,
      _takerWallet,
      _takerParam,
      _takerToken,
      _v, _r, _s
    );

    // The taker is receiving ether.
    if (_makerToken == address(wethContract)) {

      // Transfer from the taker to the wrapper.
      wethContract.transferFrom(_takerWallet, address(this), _makerParam);

      // Unwrap (withdraw) the ether.
      wethContract.withdraw(_makerParam);

      // Transfer ether to the user.
      msg.sender.transfer(_makerParam);

    }

    // Ensure no WETH balance remains.
    require(wethContract.balanceOf(address(this)) == 0,
      "WETH_BALANCE_REMAINING");

    // Ensure no ether balance remains.
    require(address(this).balance == 0,
      "ETH_BALANCE_REMAINING");
  }
}
