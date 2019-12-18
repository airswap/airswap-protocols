pragma solidity 0.5.12;

interface ITransferHandler {

  function transferTokens(
    address from,
    address to,
    uint256 amount,
    uint256 id,
    address token
  ) external returns (bool);
}