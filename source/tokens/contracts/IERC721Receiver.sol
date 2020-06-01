pragma solidity 0.5.16;

/**
 *
 * Copied from OpenZeppelin ERC1155 feature branch from (20642cca30fa18fb167df6db1889b558742d189a)
 * https://github.com/OpenZeppelin/openzeppelin-contracts/blob/feature-erc1155/contracts/token/ERC1155/ERC1155.sol
 */

contract IERC721Receiver {
  function onERC721Received(
    address operator,
    address from,
    uint256 tokenId,
    bytes memory data
  ) public returns (bytes4);
}
