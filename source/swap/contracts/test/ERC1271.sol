pragma solidity ^0.8.23;

import "../interfaces/ISwap.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract ERC1271 {
  using SafeERC20 for IERC20;

  function isValidSignature(
    bytes32 _hash,
    bytes memory _signature
  ) public view returns (bytes4) {
    return 0x1626ba7e;
  }
}
