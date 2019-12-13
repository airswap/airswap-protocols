pragma solidity 0.5.12;

import "./interfaces/ITransferHandler.sol";
import "./interfaces/IERC1155TransferHandler.sol";

contract ERC1155TransferHandler is ITransferHandler {
  function transferTokens(
    address from,
    address to,
    uint256 param,
    address token
  ) external returns (bool) {
    IERC1155TransferHandler(token).safeTransferFrom(
      from,
      to,
      0, // need to update once parameter is in
      param,
      ""
    );
    return true;
  }
}