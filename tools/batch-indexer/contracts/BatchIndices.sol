pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

import "./IIndexer.sol";

contract BatchIndices {
  function createIndices(
    IIndexer indexer,
    address[] memory tokens1,
    address[] memory tokens2,
    bytes2 protocol
  ) public {
    for (uint256 i = 0; i < tokens1.length; i++) {
      indexer.createIndex(tokens1[i], tokens2[i], protocol);
      indexer.createIndex(tokens2[i], tokens1[i], protocol);
    }
  }
}
