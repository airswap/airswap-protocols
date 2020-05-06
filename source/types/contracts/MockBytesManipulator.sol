pragma solidity 0.5.16;
pragma experimental ABIEncoderV2;

import "./BytesManipulator.sol";


/**
 * @notice Contract is a wrapper for Types library
 * for use with testing only
 *
 */
contract MockBytesManipulator {
  function get32Bytes(bytes calldata data, uint256 offset) external returns (bytes32) {
    return BytesManipulator.get32Bytes(data, offset);
  }

  function getFirst32Bytes(bytes calldata data) external returns (bytes32) {
    return BytesManipulator.getFirst32Bytes(data);
  }
}
