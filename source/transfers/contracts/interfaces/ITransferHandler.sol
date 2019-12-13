pragma solidity 0.5.12;

interface ITransferHandler {

  function transferTokens(
    address _from,
    address _to,
    uint256 _param,
    address _token
  ) external returns(bool);
}