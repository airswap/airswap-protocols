pragma solidity ^0.8.23;

import "../interfaces/ISwap.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract ERC1271 {
  using SafeERC20 for IERC20;

  constructor() payable {}

  function approve(address token, address swap, uint256 amount) public {
    IERC20(token).approve(swap, amount);
  }

  function isValidSignature(
    bytes32 _hash,
    bytes memory _signature
  ) public view returns (bytes4) {
    return 0x1626ba7e;
  }

  function testSwap(
    ISwap swapContract,
    address recipient,
    uint256 maxRoyalty,
    ISwap.Order calldata order
  ) external {
    swapContract.swap(recipient, maxRoyalty, order);
  }

  // function testSwapAnySender(
  //     ISwap swapContract,
  //     address recipient,
  //     uint256 nonce,
  //     uint256 expiry,
  //     address signerWallet,
  //     address signerToken,
  //     uint256 signerAmount,
  //     address senderToken,
  //     uint256 senderAmount,
  //     uint8 v,
  //     bytes32 r,
  //     bytes32 s
  // ) external {
  //     swapContract.swapAnySender(
  //         address(this),
  //         nonce,
  //         expiry,
  //         signerWallet,
  //         signerToken,
  //         signerAmount,
  //         senderToken,
  //         senderAmount,
  //         v,
  //         r,
  //         s
  //     );
  // }
}
