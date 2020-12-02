pragma solidity 0.5.16;
pragma experimental ABIEncoderV2;

import "./BytesManipulator.sol";

/**
 * @notice Contract is a wrapper for Types library
 * for use with testing only
 *
 */
contract MockBytesManipulator {
  function getBytes32(bytes calldata data, uint256 start)
    external
    returns (bytes32)
  {
    return BytesManipulator.getBytes32(data, start);
  }

  function getUint256(bytes calldata data, uint256 start)
    external
    returns (uint256)
  {
    return BytesManipulator.getUint256(data, start);
  }

  function getBytesAssembly(
    bytes calldata data,
    uint256 start,
    uint256 count
  ) external returns (bytes memory) {
    return BytesManipulator.slice(data, start, count);
  }
}
