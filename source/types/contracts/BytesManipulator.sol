
pragma solidity 0.5.16;

library BytesManipulator {

  // this function uses 44500 gas lol
  function get32Bytes(bytes memory data, uint256 offset) internal returns (bytes32 result) {
    for (uint i = 0; i < 32; i++) {
      result |= bytes32(data[offset + i]) >> (i * 8);
    }
  }

  function getFirst32Bytes(bytes memory data) internal returns (bytes32 result) {
    assembly {
        result := mload(add(data, 32))
    }
  }

}