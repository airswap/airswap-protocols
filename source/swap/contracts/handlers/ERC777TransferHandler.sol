// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "../interfaces/ITransferHandler.sol";
import "openzeppelin-solidity/contracts/token/ERC777/IERC777.sol";

contract ERC777TransferHandler is ITransferHandler {
  /**
   * @notice Function to wrap token transfer for different token types
   * @param party Party from whom swap would be made
   */
  function hasAllowance(Party calldata party) external view returns (bool) {
    return IERC777(party.token).isOperatorFor(party.wallet, msg.sender);
  }

  /**
   * @notice Function to wrap token transfer for different token types
   * @param party Party from whom swap would be made
   */
  function hasBalance(Party calldata party) external view returns (bool) {
    return IERC777(party.token).balanceOf(party.wallet) == party.amount;
  }

  /**
   * @notice Function to wrap safeTransferFrom for ERC721
   * @param from address Wallet address to transfer from
   * @param to address Wallet address to transfer to
   * @param amount uint256, must be 0 for this contract
   * @param id uint256 ID for ERC721
   * @param token address Contract address of token
   * @return bool on success of the token transfer
   */
  function transferTokens(
    address from,
    address to,
    uint256 amount,
    uint256 id,
    address token
  ) external returns (bool) {
    require(amount == 0, "AMOUNT_INVALID");
    IERC777(token).operatorSend(from, to, amount, '0x0', '0x0');
    return true;
  }

  /**
   * @notice Function to return whether the token transfered is fungible or not
   */
  function isFungible() external pure returns (bool) {
    return false;
  }
}
