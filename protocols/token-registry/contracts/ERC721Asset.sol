pragma solidity 0.5.10;

import "./interfaces/IAsset.sol";
import "openzeppelin-solidity/contracts/token/ERC721/IERC721.sol";

contract ERC721Asset is IAsset {

  function transferTokens(address _from, address _to, uint256 _param, address _token) external returns (bool) {
    IERC721(_token).safeTransferFrom(_from, _to, _param);
    return true;
  }
}