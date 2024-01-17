// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@airswap/swap/contracts/interfaces/ISwap.sol";
import "@airswap/swap-erc20/contracts/interfaces/ISwapERC20.sol";

/**
 * @title BatchCall: Batch balance, allowance, order validity checks
 */
contract BatchCall {
  using SafeERC20 for IERC20;
  using Address for address;

  /**
   * @notice Check the token balance of a wallet in a token contract
   * @dev return 0 on returns 0 on invalid spender contract or non-contract address
   * @param userAddress address
   * @param tokenAddress address
   * @return uint256 token balance if possible
   */
  function tokenBalance(
    address userAddress,
    address tokenAddress
  ) public view returns (uint256) {
    if (tokenAddress.isContract()) {
      IERC20 token = IERC20(tokenAddress);
      //  Check if balanceOf succeeds.
      (bool success, ) = address(token).staticcall(
        abi.encodeWithSelector(token.balanceOf.selector, userAddress)
      );
      if (success) {
        return token.balanceOf(userAddress);
      }
      return 0;
    }
    return 0;
  }

  /**
   * @notice Check the token balances of a wallet for multiple tokens
   * @dev return array and will fail if large token arrays are inputted
   * @dev Returns array of token balances in base units
   * @param userAddress address
   * @param tokenAddresses address[]
   * @return uint256[] token balance array if possible
   */
  function walletBalances(
    address userAddress,
    address[] calldata tokenAddresses
  ) external view returns (uint256[] memory) {
    require(tokenAddresses.length > 0);
    uint256[] memory balances = new uint256[](tokenAddresses.length);

    for (uint256 i; i < tokenAddresses.length; ) {
      if (tokenAddresses[i] != address(0x0)) {
        balances[i] = tokenBalance(userAddress, tokenAddresses[i]);
      } else {
        balances[i] = userAddress.balance;
      }
      unchecked {
        ++i;
      }
    }
    return balances;
  }

  /**
   * @notice Check the token balances of multiple wallets for multiple tokens
   * @dev return array and will fail if large arrays are inputted
   * @dev Returns array of token balances in base units
   * @param userAddresses address[]
   * @param tokenAddresses address[]
   * @return uint256[] token allowances array if possible
   */
  function allBalancesForManyAccounts(
    address[] calldata userAddresses,
    address[] calldata tokenAddresses
  ) external view returns (uint256[] memory) {
    uint256[] memory balances = new uint256[](
      tokenAddresses.length * userAddresses.length
    );
    for (uint256 i; i < userAddresses.length; ) {
      for (uint256 j; j < tokenAddresses.length; ) {
        if (tokenAddresses[j] != address(0x0)) {
          // ETH address in Etherdelta config
          balances[(i * tokenAddresses.length) + j] = tokenBalance(
            userAddresses[i],
            tokenAddresses[j]
          );
        } else {
          balances[(i * tokenAddresses.length) + j] = userAddresses[i].balance;
        }
        unchecked {
          ++j;
        }
      }
      unchecked {
        ++i;
      }
    }
    return balances;
  }

  /**
   * @notice Check the token allowance of a wallet in a token contract
   * @dev return 0 on returns 0 on invalid spender contract or non-contract address
   * @param userAddress address
   * @param spenderAddress address Specified address to spend
   * @param tokenAddress address
   * @return uint256 token allowance if possible
   */
  function tokenAllowance(
    address userAddress,
    address spenderAddress,
    address tokenAddress
  ) public view returns (uint256) {
    if (tokenAddress.isContract()) {
      IERC20 token = IERC20(tokenAddress);
      // Check if allowance succeeds as a call else returns 0.
      (bool success, ) = address(token).staticcall(
        abi.encodeWithSelector(
          token.allowance.selector,
          userAddress,
          spenderAddress
        )
      );
      if (success) {
        return token.allowance(userAddress, spenderAddress);
      }
      return 0;
    }
    return 0;
  }

  /**
   * @notice Check the token allowances of a wallet for multiple tokens
   * @dev return array and will fail if large token arrays are inputted
   * @dev Returns array of token allowances in base units
   * @param userAddress address
   * @param spenderAddress address
   * @param tokenAddresses address[]
   * @return uint256[] token allowances array if possible
   */
  function walletAllowances(
    address userAddress,
    address spenderAddress,
    address[] calldata tokenAddresses
  ) external view returns (uint256[] memory) {
    require(tokenAddresses.length > 0);
    uint256[] memory allowances = new uint256[](tokenAddresses.length);

    for (uint256 i; i < tokenAddresses.length; ) {
      allowances[i] = tokenAllowance(
        userAddress,
        spenderAddress,
        tokenAddresses[i]
      );
      unchecked {
        ++i;
      }
    }
    return allowances;
  }

  /**
   * @notice Check the token allowances of multiple wallets for multiple tokens
   * @dev return array and will fail if large arrays are inputted
   * @dev Returns array of token allowances in base units
   * @param userAddresses address[]
   * @param spenderAddress address
   * @param tokenAddresses address[]
   * @return uint256[] token allowances array if possible
   */
  function allAllowancesForManyAccounts(
    address[] calldata userAddresses,
    address spenderAddress,
    address[] calldata tokenAddresses
  ) external view returns (uint256[] memory) {
    uint256[] memory allowances = new uint256[](
      tokenAddresses.length * userAddresses.length
    );

    for (uint256 i; i < userAddresses.length; ) {
      for (uint256 j; j < tokenAddresses.length; ) {
        allowances[(i * tokenAddresses.length) + j] = tokenAllowance(
          userAddresses[i],
          spenderAddress,
          tokenAddresses[j]
        );
        unchecked {
          ++j;
        }
      }
      unchecked {
        ++i;
      }
    }
    return allowances;
  }

  /**
   * @notice Check validity of an array of Orders
   * @param senderWallet address wallet that would send the order
   * @param orders ISwap.Order[] list of orders to be checked
   * @param swapContract ISwap swap contract to call
   * @return bool[] validity of each order
   */
  function getOrdersValid(
    address senderWallet,
    ISwap.Order[] calldata orders,
    ISwap swapContract
  ) external view returns (bool[] memory) {
    require(orders.length > 0);
    bool[] memory orderValidity = new bool[](orders.length);

    for (uint256 i; i < orders.length; ) {
      (, uint256 errorCount) = swapContract.check(senderWallet, orders[i]);
      orderValidity[i] = errorCount == 0 ? true : false;
      unchecked {
        ++i;
      }
    }
    return orderValidity;
  }

  /**
   * @notice Check validity of an array of OrderERC20s
   * @param senderWallet address wallet that would send the order
   * @param orders ISwapERC20.OrderERC20[] list of orders to be checked
   * @param swapERC20Contract ISwapERC20 swap contract to call
   * @return bool[] validity of each order
   */
  function getOrdersValidERC20(
    address senderWallet,
    ISwapERC20.OrderERC20[] calldata orders,
    ISwapERC20 swapERC20Contract
  ) external view returns (bool[] memory) {
    require(orders.length > 0);
    bool[] memory orderValidity = new bool[](orders.length);

    for (uint256 i; i < orders.length; ) {
      ISwapERC20.OrderERC20 memory order = orders[i];
      (uint256 errorCount, ) = swapERC20Contract.check(
        senderWallet,
        order.nonce,
        order.expiry,
        order.signerWallet,
        order.signerToken,
        order.signerAmount,
        order.senderToken,
        order.senderAmount,
        order.v,
        order.r,
        order.s
      );
      orderValidity[i] = errorCount == 0 ? true : false;
      unchecked {
        ++i;
      }
    }
    return orderValidity;
  }

  /**
   * @notice Check whether nonces in an array have been used
   * @dev Swap and SwapERC20 nonceUsed function have same signature
   * @param signerWallets address[] list of signers for each nonce
   * @param nonces uint256[] list of nonces to be checked
   * @param swapContract ISwap[] Swap or SwapERC20 contract to call
   * @return bool[] nonce validity
   */
  function getNoncesUsed(
    address[] calldata signerWallets,
    uint256[] calldata nonces,
    ISwap swapContract
  ) external view returns (bool[] memory) {
    require(signerWallets.length > 0);
    require(signerWallets.length == nonces.length);
    bool[] memory nonceUsed = new bool[](signerWallets.length);

    for (uint256 i; i < signerWallets.length; ) {
      nonceUsed[i] = swapContract.nonceUsed(signerWallets[i], nonces[i]);
      unchecked {
        ++i;
      }
    }
    return nonceUsed;
  }
}
