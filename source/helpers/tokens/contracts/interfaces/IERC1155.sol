pragma solidity ^0.5.0;

/**
 *
 * Copied from OpenZeppelin ERC1155 feature branch from (20642cca30fa18fb167df6db1889b558742d189a)
 * https://github.com/OpenZeppelin/openzeppelin-contracts/blob/feature-erc1155/contracts/token/ERC1155/ERC1155.sol
 */

import "openzeppelin-solidity/contracts/introspection/IERC165.sol";

/**
    @title ERC-1155 Multi Token Standard basic interface
    @dev See https://eips.ethereum.org/EIPS/eip-1155
 */
contract IERC1155 is IERC165 {
  event TransferSingle(
    address indexed operator,
    address indexed from,
    address indexed to,
    uint256 id,
    uint256 value
  );

  event TransferBatch(
    address indexed operator,
    address indexed from,
    address indexed to,
    uint256[] ids,
    uint256[] values
  );

  event ApprovalForAll(
    address indexed account,
    address indexed operator,
    bool approved
  );

  event URI(string value, uint256 indexed id);

  function balanceOf(address account, uint256 id) public view returns (uint256);

  function balanceOfBatch(address[] memory accounts, uint256[] memory ids)
    public
    view
    returns (uint256[] memory);

  function setApprovalForAll(address operator, bool approved) external;

  function isApprovedForAll(address account, address operator)
    external
    view
    returns (bool);

  function safeTransferFrom(
    address from,
    address to,
    uint256 id,
    uint256 value,
    bytes calldata data
  ) external;

  function safeBatchTransferFrom(
    address from,
    address to,
    uint256[] calldata ids,
    uint256[] calldata values,
    bytes calldata data
  ) external;
}
