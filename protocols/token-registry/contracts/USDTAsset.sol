pragma solidity 0.5.10;

import "./interfaces/IAsset.sol";
import "./interfaces/IUSDTAsset.sol";

contract USDTAsset is IAsset {

  function transferTokens(address _from, address _to, uint256 _param, address _token) external returns (bool) {
    IUSDTAsset(_token).transferFrom(_from, _to, _param);
    return true;
  }
}