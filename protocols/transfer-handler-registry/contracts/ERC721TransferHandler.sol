pragma solidity 0.5.10;

import "./interfaces/ITransferHandler.sol";
import "openzeppelin-solidity/contracts/token/ERC721/IERC721.sol";

contract ERC721TransferHandler is ITransferHandler {

  function transferTokens(address _from, address _to, uint256 _param, address _token) external returns (bool) {
    IERC721(_token).safeTransferFrom(_from, _to, _param);
    return true;
  }
}