pragma solidity 0.5.12;

import "./interfaces/ITransferHandler.sol";
import "openzeppelin-solidity/contracts/token/ERC721/IERC721.sol";

contract ERC721TransferHandler is ITransferHandler {

  function transferTokens(
    address from,
    address to,
    uint256 amount,
    uint256 id,
    address token)
  external returns (bool) {
    require(amount == 0, "NO_AMOUNT_FIELD_IN_ERC721");
    IERC721(token).safeTransferFrom(from, to, id);
    return true;
  }
}