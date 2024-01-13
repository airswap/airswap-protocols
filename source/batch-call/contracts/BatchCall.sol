// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@airswap/swap/contracts/interfaces/ISwap.sol";
import "@airswap/swap-erc20/contracts/interfaces/ISwapERC20.sol";

/**
 * @title BatchCalling: Batch balance, allowance, order validity checks
 */
contract BatchCall {
  using SafeERC20 for IERC20;
  using Address for address;

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

    for (uint256 i = 0; i < tokenAddresses.length; i++) {
      if (tokenAddresses[i] != address(0x0)) {
        balances[i] = tokenBalance(userAddress, tokenAddresses[i]);
      } else {
        balances[i] = userAddress.balance;
      }
    }
    return balances;
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

    for (uint256 i = 0; i < tokenAddresses.length; i++) {
      allowances[i] = tokenAllowance(
        userAddress,
        spenderAddress,
        tokenAddresses[i]
      );
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

    for (uint256 user = 0; user < userAddresses.length; user++) {
      for (uint256 token = 0; token < tokenAddresses.length; token++) {
        allowances[(user * tokenAddresses.length) + token] = tokenAllowance(
          userAddresses[user],
          spenderAddress,
          tokenAddresses[token]
        );
      }
    }
    return allowances;
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
    for (uint256 user = 0; user < userAddresses.length; user++) {
      for (uint256 token = 0; token < tokenAddresses.length; token++) {
        if (tokenAddresses[token] != address(0x0)) {
          // ETH address in Etherdelta config
          balances[(user * tokenAddresses.length) + token] = tokenBalance(
            userAddresses[user],
            tokenAddresses[token]
          );
        } else {
          balances[(user * tokenAddresses.length) + token] = userAddresses[user]
            .balance;
        }
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
   * @notice Check if the validity of an array of Orders
   * @dev return array and will fail if large token arrays are inputted
   * @dev Returns an array of bool
   * @param orders[] list of orders to be checked
   * @return bool[] order validity
   */

  function checkOrders(
    address senderWallet,
    ISwap.Order[] calldata orders,
    ISwap swapContract
  ) external view returns (bool[] memory) {
    require(orders.length > 0);
    bool[] memory orderValidity = new bool[](orders.length);

    for (uint256 i = 0; i < orders.length; i++) {
      (, uint256 errorCount) = swapContract.check(senderWallet, orders[i]);
      orderValidity[i] = errorCount == 0 ? true : false;
    }
    return orderValidity;
  }

  function checkOrdersERC20(
    address senderWallet,
    ISwapERC20.OrderERC20[] calldata ordersERC20,
    ISwapERC20 swapERC20Contract
  ) external view returns (bool[] memory) {
    require(ordersERC20.length > 0);
    bool[] memory orderValidity = new bool[](ordersERC20.length);

    for (uint256 i = 0; i < ordersERC20.length; i++) {
      ISwapERC20.OrderERC20 memory order = ordersERC20[i];
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
    }
    return orderValidity;
  }

  /**
   * @notice Check if the nonce for an array of order has been already used or not
   * @dev Swap and SwapERC20 nonceUsed function have a similar signature
   * @dev The same function can be used for both contract calls
   * @dev Returns an array of bool
   * @dev return array and will fail if large nonce arrays are inputted
   * @param signerWallets[] list of wallets associated with the nonces to be checked
   * @param nonces[] list of nonces to be checked
   * @param swapContract[] swap or swapERC contract to check nonces forom
   * @return bool[] nonce validity
   */

  function getNonceUsed(
    address[] calldata signerWallets,
    uint256[] calldata nonces,
    ISwap swapContract
  ) external view returns (bool[] memory) {
    require(signerWallets.length > 0);
    require(signerWallets.length == nonces.length);
    bool[] memory nonceUsed = new bool[](signerWallets.length);

    for (uint256 i = 0; i < signerWallets.length; i++) {
      nonceUsed[i] = swapContract.nonceUsed(signerWallets[i], nonces[i]);
    }
    return nonceUsed;
  }
}
