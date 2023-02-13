// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract ERC721Royalty is ERC2981, ERC721, Ownable {
  using Counters for Counters.Counter;
  Counters.Counter private _tokenIds;

  constructor() ERC721("Test Token", "TT") {
    _setDefaultRoyalty(msg.sender, 100);
  }

  function supportsInterface(bytes4 interfaceId)
    public
    view
    virtual
    override(ERC721, ERC2981)
    returns (bool)
  {
    return super.supportsInterface(interfaceId);
  }

  function _burn(uint256 tokenId) internal virtual override {
    super._burn(tokenId);
    _resetTokenRoyalty(tokenId);
  }

  function burn(uint256 tokenId) public onlyOwner {
    _burn(tokenId);
  }

  function mint(address recipient) public onlyOwner returns (uint256) {
    _tokenIds.increment();

    uint256 newItemId = _tokenIds.current();
    _safeMint(recipient, newItemId);

    return newItemId;
  }

  function mintWithRoyalty(
    address recipient,
    address royaltyReceiver,
    uint96 feeNumerator
  ) public onlyOwner {
    uint256 tokenId = mint(recipient);
    _setTokenRoyalty(tokenId, royaltyReceiver, feeNumerator);
  }
}
