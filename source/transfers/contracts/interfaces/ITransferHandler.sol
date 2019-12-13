pragma solidity 0.5.12;

interface ITransferHandler {

  function transferTokens(
    address from,
    address to,
    uint256 param,
    address token
  ) external returns(bool);
}