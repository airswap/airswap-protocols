pragma solidity 0.5.10;

interface IAsset {

    function transferToken(address _from, address _to, uint256 _param, address _token, bytes4 _kind) external returns bool;
}