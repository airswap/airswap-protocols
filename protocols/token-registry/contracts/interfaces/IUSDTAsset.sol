pragma solidity 0.5.10;

/**
 * @title IUSDTAsset
 * @dev transferFrom function in non-standard ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/20
 */
contract IUSDTAsset {
  function transferFrom(address from, address to, uint value) external;
}