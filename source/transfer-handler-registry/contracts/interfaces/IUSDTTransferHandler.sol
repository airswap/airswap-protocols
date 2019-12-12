pragma solidity 0.5.12;

/**
 * @title IUSDTTransferHandler
 * @dev transferFrom function in non-standard ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/20
 */
contract IUSDTTransferHandler {
  function transferFrom(address _from, address _to, uint _value) external;
}