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

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC721/IERC721.sol";
import "openzeppelin-solidity/contracts/introspection/ERC165Checker.sol";

/**
  * @title Transfers: Tools for Transferring Ether and Tokens Between Accounts
  */
library Transfers {
  using ERC165Checker for address;

  bytes4 internal constant INTERFACE_ERC721 = 0x80ac58cd;

  function send(
    address _receiver,
    uint256 _value
  ) external {
    // Cast the order maker as a payable address for ether transfer.
    address payable wallet = address(uint160(_receiver));

    // Transfer the taker side of the trade (ether) to the makerWallet.
    wallet.transfer(_value);
  }

  function transferAny(
      address _token,
      address _from,
      address _to,
      uint256 _param
  ) external {
    if (_token._supportsInterface(INTERFACE_ERC721)) {
      IERC721(_token)
        .safeTransferFrom(_from, _to, _param);
    } else {
      require(IERC20(_token)
        .transferFrom(_from, _to, _param));
    }
  }

  function safeTransferAny(
      bytes calldata _side,
      address _from,
      address _to,
      uint256 _param,
      address _token
  ) external {
    if (_token._supportsInterface(INTERFACE_ERC721)) {
      IERC721(_token).safeTransferFrom(_from, _to, _param);
    } else {
      require(_to != address(0), "INVALID_DESTINATION");
      require(IERC20(_token).transferFrom(_from, _to, _param));
    }
  }
}
