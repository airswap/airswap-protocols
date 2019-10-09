pragma solidity 0.5.10;

interface IAsset {

  function transferTokens(
    address _from,
    address _to,
    uint256 _param,
    address _token
  ) external returns(bool);
}