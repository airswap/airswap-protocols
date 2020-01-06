pragma solidity 0.5.12;

import "../interfaces/ITransferHandler.sol";
import "../interfaces/IKittyCoreTokenTransfer.sol";

contract KittyCoreTransferHandler is ITransferHandler {

 /**
  * @notice Function to wrap transferFrom for CKitty
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
    IKittyCoreTokenTransfer(token).transferFrom(from, to, id);
    return true;
  }
}