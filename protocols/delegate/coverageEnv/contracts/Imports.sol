pragma solidity 0.5.10;

import "@airswap/swap/contracts/Swap.sol";
import "@airswap/tokens/contracts/FungibleToken.sol";
import "@gnosis.pm/mock-contract/contracts/MockContract.sol";

contract Imports {event __CoverageImports(string fileName, uint256 lineNumber);
event __FunctionCoverageImports(string fileName, uint256 fnId);
event __StatementCoverageImports(string fileName, uint256 statementId);
event __BranchCoverageImports(string fileName, uint256 branchId, uint256 locationIdx);
event __AssertPreCoverageImports(string fileName, uint256 branchId);
event __AssertPostCoverageImports(string fileName, uint256 branchId);
}