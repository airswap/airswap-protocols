pragma solidity 0.5.10;

import "./interfaces/ITransferHandler.sol";
import "./interfaces/IPartialKittyCoreTransferHandler.sol";

contract PartialKittyCoreTransferHandler is ITransferHandler {

  function transferTokens(
  	address _from,
  	address _to,
  	uint256 _param,
  	address _token
  ) external returns (bool) {
    IPartialKittyCoreTransferHandler(_token).transferFrom(_from, _to, _param);
    return true;
  }
}