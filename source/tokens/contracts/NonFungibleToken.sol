pragma solidity 0.5.12;

import "openzeppelin-solidity/contracts/access/roles/MinterRole.sol";
import "./AdaptedERC721.sol";

// This contract definiition is the same as ERC721Mintable, however it uses an
// adapted ERC721 - with different event names
contract NonFungibleToken is AdaptedERC721, MinterRole {

  /**
    * @dev Function to mint tokens.
    * @param to The address that will receive the minted tokens.
    * @param tokenId The token id to mint.
    * @return A boolean that indicates if the operation was successful.
    */
  function mint(address to, uint256 tokenId) public onlyMinter returns (bool) {
    _mint(to, tokenId);
    return true;
  }

}
