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

pragma solidity 0.5.12;

import "./interfaces/ITransferHandler.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";


/**
 * @title TransferHandlerRegistry: holds registry of contract to
 * facilitate token transfers
 */
contract TransferHandlerRegistry is Ownable {
  event AddTransferHandler(bytes4 kind, address contractAddress);

  // Mapping of bytes4 to contract interface type
  mapping(bytes4 => ITransferHandler) public transferHandlers;

  /**
   * @notice Adds handler to mapping
   * @param kind bytes4 Key value that defines a token type
   * @param transferHandler ITransferHandler
   */
  function addTransferHandler(bytes4 kind, ITransferHandler transferHandler)
    external
    onlyOwner
  {
    require(
      address(transferHandlers[kind]) == address(0),
      "HANDLER_EXISTS_FOR_KIND"
    );
    transferHandlers[kind] = transferHandler;
    emit AddTransferHandler(kind, address(transferHandler));
  }
}
