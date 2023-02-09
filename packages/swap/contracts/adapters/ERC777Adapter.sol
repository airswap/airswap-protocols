// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "../interfaces/IAdapter.sol";
import "@openzeppelin/contracts/token/ERC777/IERC777.sol";

contract ERC777Adapter is IAdapter {
  /**
   * @notice Indicates the ERC165 interfaceID supported by this adapter
   */
  bytes4 public constant interfaceID = 0xe58e113c;

  /**
   * @notice Function to indicate whether the party token implements EIP-2981
   * @param token Contract address from which royalties need to be considered
   */
  function implementsEIP2981(address token) external view returns (bool) {
    return false;
  }

  /**
   * @notice Function to query EIP-2981 implementation and provide royalties information
   * @param token Contract address from which royalties need to be considered
   */
  function getRoyaltyInfo(
    address token,
    uint256 tokenId,
    uint256 salePrice
  ) external view returns (address, uint256) {
    return (address(0), 0);
  }

  /**
   * @notice Function to wrap token transfer for different token types
   * @param party Party from whom swap would be made
   */
  function hasAllowance(Party calldata party) external view returns (bool) {
    return IERC777(party.token).isOperatorFor(address(this), party.wallet);
  }

  /**
   * @notice Function to wrap token transfer for different token types
   * @param party Party from whom swap would be made
   */
  function hasBalance(Party calldata party) external view returns (bool) {
    return IERC777(party.token).balanceOf(party.wallet) >= party.amount;
  }

  /**
   * @notice Function to wrap safeTransferFrom for ERC777
   * @param from address Wallet address to transfer from
   * @param to address Wallet address to transfer to
   * @param amount uint256 Amount for ERC777
   * @param id uint256 ID, must be 0 for this contract
   * @param token address Contract address of token
   */
  function transferTokens(
    address from,
    address to,
    uint256 amount,
    uint256 id,
    address token
  ) external {
    if (id != 0) revert InvalidArgument("id");
    IERC777(token).operatorSend(from, to, amount, "0x0", "0x0");
  }
}
