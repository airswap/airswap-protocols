pragma solidity 0.5.10;

import "./interfaces/ITransferHandler.sol";
import "./interfaces/IUSDTTransferHandler.sol";

contract USDTTransferHandler is ITransferHandler {

  function transferTokens(
  	address _from,
  	address _to,
  	uint256 _param,
  	address _token
  ) external returns (bool) {
    IUSDTTransferHandler(_token).transferFrom(_from, _to, _param);
    return true;
  }
}