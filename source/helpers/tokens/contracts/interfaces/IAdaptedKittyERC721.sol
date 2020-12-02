pragma solidity ^0.5.0;

/**
 * @title Interface for the AdaptedKittyERC721 contract
 * @dev This matches the interface for KittyCore
 */

interface IAdaptedKittyERC721 {
  function balanceOf(address owner) external view returns (uint256);

  function ownerOf(uint256 tokenId) external view returns (address);

  function approve(address to, uint256 tokenId) external;

  function kittyIndexToApproved(uint256 tokenId)
    external
    view
    returns (address);

  function transferFrom(
    address from,
    address to,
    uint256 tokenId
  ) external;
}
