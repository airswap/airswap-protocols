pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC721/IERC721Receiver.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/utils/Address.sol";
import "openzeppelin-solidity/contracts/drafts/Counters.sol";
import "openzeppelin-solidity/contracts/introspection/ERC165.sol";

/**
 * @title Interface for the AdaptedKittyERC721 contract
 *
 */

interface IAdaptedKittyERC721 {

  function balanceOf(address owner) public view returns (uint256);
  function ownerOf(uint256 tokenId) public view returns (address);
  function approve(address to, uint256 tokenId) public;
  function kittyIndexToApproved(uint256 tokenId) public view returns (address);
  function transferFrom(address from, address to, uint256 tokenId) public;
  function mint(address to, uint256 tokenId) public returns (bool);

}