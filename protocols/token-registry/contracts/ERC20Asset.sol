pragma solidity 0.5.10;

import "./IAsset.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

contract ERC20Asset is IAsset {

    function transferTokens(address _from, address _to, uint256 _param, address _token, bytes4 _kind) return (bool) {
        require(IERC20(_token).transferFrom(_from, _to, _value));
        return true;
    }
}