pragma solidity 0.5.16;
pragma experimental ABIEncoderV2;

import "@airswap/indexer/contracts/interfaces/IIndexer.sol";

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
