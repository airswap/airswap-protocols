pragma solidity 0.5.12;

import "./interfaces/ITransferHandler.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";

contract ERC20TransferHandler is ITransferHandler {
  using SafeERC20 for IERC20;

 /**
  * @notice Function to wrap safeTransferFrom for ERC20
  * @param from address Wallet address to transfer from
  * @param to address Wallet address to transfer to
  * @param amount uint256 Amount for ERC-20
  * @param id uint256 ID, must be 0 for this contract
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
    require(id == 0, "NO_ID_FIELD_IN_ERC20");
    IERC20(token).safeTransferFrom(from, to, amount);
    return true;
  }
}