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

  function preSwapWork(address _takerToken, address _takerWallet, uint256 _takerParam) public payable {
     // The taker is sending ether.
    if (_takerToken == address(wethContract)) {

      require(_takerWallet == address(0),
        "TAKER_WALLET_MUST_BE_UNSET");

      require(_takerParam == msg.value,
        "VALUE_MUST_BE_SENT");

      // Wrap (deposit) the ether.
      wethContract.deposit.value(msg.value)();

    } else {

      // Ensure no unexpected ether sent during WETH transaction.
      require(msg.value == 0,
        "VALUE_MUST_BE_ZERO");

      // Ensure msg sender matches the takerWallet.
      require(msg.sender == _takerWallet,
        "SENDER_MUST_BE_TAKER");
    }
  }

  function postSwapWork(address _makerToken, address _takerWallet, uint256 _makerParam, address _makerWallet, address payable _senderWallet) payable {

    // The taker is receiving ether.
    if (_makerToken == address(wethContract)) {

      // Transfer from the taker to the wrapper.
      wethContract.transferFrom(_takerWallet, address(this), _makerParam);

      // Unwrap (withdraw) the ether.
      wethContract.withdraw(_makerParam);

      // Transfer ether to the user.
      _senderWallet.transfer(_makerParam);

      /* The taker wallet was not defined and thus the swapped
       * makerTokens were distributed to the wrapper contract
       * and now the wrapper contract forwards them to msg.sender.
       */
    } else if ((_makerToken != address(0)) && (_makerWallet == address(0))) {

      // Forwarding the _makerAmount of type _makerToken to the msg.sender.
      require(IERC20(_makerToken).transfer(_senderWallet, _makerParam));
    }
  }

  /**
    * @notice Required to receive ether from IWETH
    */
  function() external payable { }

  function swap(
    Types.Order memory _order,
    Types.Signature memory _signature
  )
  public payable {

    preSwapWork(_order.taker.token, _order.taker.wallet, _order.taker.param);

    // Perform the simple swap.
    swapContract.swap(
      _order,
      _signature
    );

    postSwapWork(_order.maker.token, _order.taker.wallet,  _order.maker.param, _order.maker.wallet, msg.sender);
  }

 /**
    * @notice Send an Order (Simple)
    * @param _nonce uint256
    * @param _expiry uint256
    * @param _makerWallet address
    * @param _makerAmount uint256
    * @param _makerToken address
    * @param _takerWallet address
    * @param _takerAmount uint256
    * @param _takerToken address
    * @param _v uint8
    * @param _r bytes32
    * @param _s bytes32
    */
  function swapSimple(
    uint256 _nonce,
    uint256 _expiry,
    address _makerWallet,
    uint256 _makerAmount,
    address _makerToken,
    address _takerWallet,
    uint256 _takerAmount,
    address _takerToken,
    uint8 _v,
    bytes32 _r,
    bytes32 _s
  ) public payable {

    preSwapWork(_takerToken, _takerWallet, _takerAmount);

    // Perform the simple swap.
    swapContract.swapSimple(
      _nonce,
      _expiry,
      _makerWallet,
      _makerAmount,
      _makerToken,
      _takerWallet,
      _takerAmount,
      _takerToken,
      _v, _r, _s
    );

    postSwapWork(_makerToken, _takerWallet,  _makerAmount, _makerWallet, msg.sender);
  }
}
