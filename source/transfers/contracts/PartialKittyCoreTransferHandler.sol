pragma solidity 0.5.12;

import "./interfaces/ITransferHandler.sol";
import "./interfaces/IPartialKittyCoreTransferHandler.sol";

contract PartialKittyCoreTransferHandler is ITransferHandler {

  function transferTokens(
    address from,
    address to,
    uint256 amount,
    uint256 id,
    address token
  ) external returns (bool) {
    require(amount == 0, "NO_AMOUNT_FIELD_IN_ERC721");
    IPartialKittyCoreTransferHandler(token).transferFrom(from, to, id);
    return true;
  }
}