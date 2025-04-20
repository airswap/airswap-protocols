// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import { ERC20 } from "solady/src/tokens/ERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@airswap/swap/contracts/interfaces/ISwap.sol";
import "@airswap/swap-erc20/contracts/interfaces/ISwapERC20.sol";
import "@airswap/registry/contracts/interfaces/IRegistry.sol";

/**
 * @title BatchCall: Batch balance, allowance, order validity checks, nonce usage check
 */
contract BatchCall {
  using Address for address;

  error ArgumentInvalid();

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
      ERC20 token = ERC20(tokenAddress);
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
    if (tokenAddresses.length <= 0) revert ArgumentInvalid();
    uint256[] memory balances = new uint256[](tokenAddresses.length);

    for (uint256 i; i < tokenAddresses.length; ) {
      if (tokenAddresses[i] != address(0)) {
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
        if (tokenAddresses[j] != address(0)) {
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
      ERC20 token = ERC20(tokenAddress);
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
    if (tokenAddresses.length <= 0) revert ArgumentInvalid();
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
   * @param senderWallet address Wallet that would send the order
   * @param orders ISwap.Order[] Array of orders to be checked
   * @param swapContract ISwap Swap contract to call
   * @return bool[] True indicates the order is valid
   */
  function getOrdersValid(
    address senderWallet,
    ISwap.Order[] calldata orders,
    ISwap swapContract
  ) external view returns (bool[] memory) {
    if (orders.length <= 0) revert ArgumentInvalid();
    bool[] memory orderValidity = new bool[](orders.length);

    for (uint256 i; i < orders.length; ) {
      bytes32[] memory errors = swapContract.check(senderWallet, orders[i]);
      orderValidity[i] = errors.length == 0 ? true : false;
      unchecked {
        ++i;
      }
    }
    return orderValidity;
  }

  /**
   * @notice Check validity of an array of OrderERC20s
   * @param senderWallet address Wallet that would send the order
   * @param orders ISwapERC20.OrderERC20[] Array of orders to be checked
   * @param swapERC20Contract ISwapERC20 Swap contract to call
   * @return bool[] True indicates the order is valid
   */
  function getOrdersValidERC20(
    address senderWallet,
    ISwapERC20.OrderERC20[] calldata orders,
    ISwapERC20 swapERC20Contract
  ) external view returns (bool[] memory) {
    if (orders.length <= 0) revert ArgumentInvalid();
    bool[] memory orderValidity = new bool[](orders.length);

    for (uint256 i; i < orders.length; ) {
      ISwapERC20.OrderERC20 memory order = orders[i];
      bytes32[] memory errors = swapERC20Contract.check(
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
      orderValidity[i] = errors.length == 0 ? true : false;
      unchecked {
        ++i;
      }
    }
    return orderValidity;
  }

  /**
   * @notice Checks usage of an array of nonces
   * @dev Swap and SwapERC20 nonceUsed function have the same signature
   * @param signerWallets address[] list of signers for each nonce
   * @param nonces uint256[] list of nonces to be checked
   * @param swapContract ISwap[] Swap or SwapERC20 contract to call
   * @return bool[] true indicates the nonce is used
   */
  function getNoncesUsed(
    address[] calldata signerWallets,
    uint256[] calldata nonces,
    ISwap swapContract
  ) external view returns (bool[] memory) {
    if (signerWallets.length == 0) revert ArgumentInvalid();
    if (signerWallets.length != nonces.length) revert ArgumentInvalid();
    bool[] memory nonceUsed = new bool[](signerWallets.length);

    for (uint256 i; i < signerWallets.length; ) {
      nonceUsed[i] = swapContract.nonceUsed(signerWallets[i], nonces[i]);
      unchecked {
        ++i;
      }
    }
    return nonceUsed;
  }

  /**
   * @notice provides the tokens supported by multiple Stakers
   * @param stakers address[] list of stakers to be checked
   * @param registryContract IRegistry Registry contract to call
   * @return bool[] true indicates the nonce is used
   */
  function getTokensForStakers(
    address[] calldata stakers,
    IRegistry registryContract
  ) external view returns (address[][] memory) {
    if (stakers.length == 0) revert ArgumentInvalid();
    address[][] memory tokensSupported = new address[][](stakers.length);

    for (uint256 i; i < stakers.length; ) {
      tokensSupported[i] = registryContract.getTokensForStaker(stakers[i]);
      unchecked {
        ++i;
      }
    }
    return tokensSupported;
  }

  /**
   * @notice Batch check ERC721 balances for multiple NFTs
   * @param userAddress address The user to check balances for
   * @param contractAddresses address[] Array of ERC721 contract addresses
   * @param tokenIds uint256[] Array of token IDs
   * @return uint256[] Array of balances (1 or 0) corresponding to each NFT
   */
  function walletBalancesERC721(
    address userAddress,
    address[] calldata contractAddresses,
    uint256[] calldata tokenIds
  ) external view returns (uint256[] memory) {
    if (
      contractAddresses.length == 0 ||
      contractAddresses.length != tokenIds.length
    ) revert ArgumentInvalid();

    uint256[] memory balances = new uint256[](contractAddresses.length);

    for (uint256 i; i < contractAddresses.length; ) {
      if (contractAddresses[i].isContract()) {
        IERC721 nft = IERC721(contractAddresses[i]);
        try nft.ownerOf(tokenIds[i]) returns (address owner) {
          balances[i] = owner == userAddress ? 1 : 0;
        } catch {
          balances[i] = 0;
        }
      } else {
        balances[i] = 0;
      }
      unchecked {
        ++i;
      }
    }

    return balances;
  }

  /**
   * @notice Batch check ERC1155 balances for multiple NFTs
   * @param userAddress address The user to check balances for
   * @param contractAddresses address[] Array of ERC1155 contract addresses
   * @param tokenIds uint256[] Array of token IDs
   * @return uint256[] Array of balances corresponding to each NFT
   */
  function walletBalancesERC1155(
    address userAddress,
    address[] calldata contractAddresses,
    uint256[] calldata tokenIds
  ) external view returns (uint256[] memory) {
    if (
      contractAddresses.length == 0 ||
      contractAddresses.length != tokenIds.length
    ) revert ArgumentInvalid();

    uint256[] memory balances = new uint256[](contractAddresses.length);

    for (uint256 i; i < contractAddresses.length; ) {
      if (contractAddresses[i].isContract()) {
        IERC1155 nft = IERC1155(contractAddresses[i]);
        try nft.balanceOf(userAddress, tokenIds[i]) returns (uint256 balance) {
          balances[i] = balance;
        } catch {
          balances[i] = 0;
        }
      } else {
        balances[i] = 0;
      }
      unchecked {
        ++i;
      }
    }

    return balances;
  }

  /**
   * @notice Batch check ERC721 allowances for multiple NFTs
   * @param userAddress address The user who granted the approval
   * @param operatorAddress address The operator to check approval for
   * @param contractAddresses address[] Array of ERC721 contract addresses
   * @param tokenIds uint256[] Array of token IDs
   * @return bool[] Array of allowance states corresponding to each NFT
   */
  function walletAllowancesERC721(
    address userAddress,
    address operatorAddress,
    address[] calldata contractAddresses,
    uint256[] calldata tokenIds
  ) external view returns (bool[] memory) {
    if (
      contractAddresses.length == 0 ||
      contractAddresses.length != tokenIds.length
    ) revert ArgumentInvalid();

    bool[] memory allowances = new bool[](contractAddresses.length);

    for (uint256 i; i < contractAddresses.length; ) {
      if (contractAddresses[i].isContract()) {
        IERC721 nft = IERC721(contractAddresses[i]);
        try nft.isApprovedForAll(userAddress, operatorAddress) returns (
          bool isApproved
        ) {
          if (isApproved) {
            allowances[i] = true;
          } else {
            try nft.getApproved(tokenIds[i]) returns (address approved) {
              allowances[i] = approved == operatorAddress;
            } catch {
              allowances[i] = false;
            }
          }
        } catch {
          allowances[i] = false;
        }
      } else {
        allowances[i] = false;
      }
      unchecked {
        ++i;
      }
    }

    return allowances;
  }

  /**
   * @notice Batch check ERC1155 allowances for multiple NFTs
   * @param userAddress address The user who granted the approval
   * @param operatorAddress address The operator to check approval for
   * @param contractAddresses address[] Array of ERC1155 contract addresses
   * @return bool[] Array of allowance states corresponding to each NFT
   */
  function walletAllowancesERC1155(
    address userAddress,
    address operatorAddress,
    address[] calldata contractAddresses
  ) external view returns (bool[] memory) {
    if (contractAddresses.length == 0) revert ArgumentInvalid();

    bool[] memory allowances = new bool[](contractAddresses.length);

    for (uint256 i; i < contractAddresses.length; ) {
      if (contractAddresses[i].isContract()) {
        IERC1155 nft = IERC1155(contractAddresses[i]);
        try nft.isApprovedForAll(userAddress, operatorAddress) returns (
          bool approved
        ) {
          allowances[i] = approved;
        } catch {
          allowances[i] = false;
        }
      } else {
        allowances[i] = false;
      }
      unchecked {
        ++i;
      }
    }

    return allowances;
  }
}
