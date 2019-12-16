pragma solidity 0.5.12;

import "./interfaces/ITransferHandler.sol";
import "./interfaces/IERC1155TransferHandler.sol";

contract ERC1155TransferHandler is ITransferHandler {
  function transferTokens(
    address from,
    address to,
    uint256 amount,
    uint256 id,
    address token
  ) external returns (bool) {
    IERC1155TransferHandler(token).safeTransferFrom(
      from,
      to,
      id,
      amount,
      "" // bytes are empty
    );
    return true;
  }
}