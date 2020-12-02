pragma solidity 0.5.16;

import "openzeppelin-solidity/contracts/access/roles/MinterRole.sol";
import "./ERC1155.sol";

contract MintableERC1155Token is ERC1155, MinterRole {
  /**
   * @dev Function to mint tokens.
   * @param to The address that will receive the minted tokens.
   * @param id The token id to mint.
   * @param value The amount of token id to mint.
   * @return A boolean that indicates if the operation was successful.
   */
  function mint(
    address to,
    uint256 id,
    uint256 value
  ) public onlyMinter returns (bool) {
    _mint(to, id, value, "");
    return true;
  }
}
