pragma solidity 0.5.10;

import "./IAsset.sol";


/**
 * @title ISubKittyCore
 * @dev transferFrom function from KittyCore
 * @dev see https://github.com/ethereum/EIPs/issues/20
 */
contract ISubKittyCore {
    function transferFrom(address _from, address _to, uint256 _tokenId) external;
}


contract CryptoKittyAsset is IAsset {

    function transferTokens(address _from, address _to, uint256 _param, address _token, bytes4 _kind) return (bool) {
        require(ISubKittyCore(_token).transferFrom(_from, _to, _value));
        return true;
    }
}