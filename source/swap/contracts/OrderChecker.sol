// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./interfaces/ISwap.sol";

/**
 * @title BalanceChecker: Batch ERC-20 allowance and balance calls
 */
contract OrderChecker is Ownable {
  address public swapContractAddress;

  constructor(address _swapContractAddress) {
    swapContractAddress = _swapContractAddress;
  }

  /**
   * @notice Check if the nonce for an array of order has been already used or not
   * @dev return array and will fail if large token arrays are inputted
   * @dev Returns an array of bool
   * @param orders[] list of orders to be tested
   * @return bool[] nonce validity
   */

  function getNonceUsed(
    ISwap.Order[] calldata orders
  ) external view returns (bool[] memory) {
    require(orders.length > 0);
    bool[] memory nonceUsed = new bool[](orders.length);

    for (uint256 i = 0; i < orders.length; i++) {
      ISwap.Order memory order = orders[i];
      nonceUsed[i] = ISwap(swapContractAddress).nonceUsed(
        order.signer.wallet,
        order.nonce
      );
    }
    return nonceUsed;
  }
}
