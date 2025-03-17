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
  error UnsupportedTokenType();

  enum TokenType {
    ERC721,
    ERC1155
  }

  struct NFTQuery {
    address contractAddress;
    TokenType tokenType;
    uint256 tokenId; // Used for both ERC721 and ERC1155
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
   * @notice Check NFT balance for a specific token ID
   * @param userAddress address The user to check balance for
   * @param query NFTQuery The NFT contract details
   * @return uint256 NFT balance (1 or 0 for ERC721, actual balance for ERC1155)
   */
  function getWalletNFTBalance(
    address userAddress,
    NFTQuery memory query
  ) public view returns (uint256) {
    if (!query.contractAddress.isContract()) return 0;

    if (query.tokenType == TokenType.ERC721) {
      IERC721 nft = IERC721(query.contractAddress);
      try nft.ownerOf(query.tokenId) returns (address owner) {
        return owner == userAddress ? 1 : 0;
      } catch {
        return 0;
      }
    } else if (query.tokenType == TokenType.ERC1155) {
      IERC1155 nft = IERC1155(query.contractAddress);
      try nft.balanceOf(userAddress, query.tokenId) returns (uint256 balance) {
        return balance;
      } catch {
        return 0;
      }
    }

    revert UnsupportedTokenType();
  }

  /**
   * @notice Check NFT allowance for a specific operator and token
   * @param userAddress address The user who granted the approval
   * @param operatorAddress address The operator to check approval for
   * @param query NFTQuery The NFT contract details
   * @return bool Whether the operator is approved
   */
  function getWalletNFTAllowance(
    address userAddress,
    address operatorAddress,
    NFTQuery memory query
  ) public view returns (bool) {
    if (!query.contractAddress.isContract()) return false;

    if (query.tokenType == TokenType.ERC721) {
      IERC721 nft = IERC721(query.contractAddress);
      try nft.isApprovedForAll(userAddress, operatorAddress) returns (
        bool isApproved
      ) {
        if (isApproved) return true;
        try nft.getApproved(query.tokenId) returns (address approved) {
          return approved == operatorAddress;
        } catch {
          return false;
        }
      } catch {
        return false;
      }
    } else if (query.tokenType == TokenType.ERC1155) {
      IERC1155 nft = IERC1155(query.contractAddress);
      try nft.isApprovedForAll(userAddress, operatorAddress) returns (
        bool approved
      ) {
        return approved;
      } catch {
        return false;
      }
    }

    revert UnsupportedTokenType();
  }

  /**
   * @notice Batch check NFT balances for multiple NFTs
   * @param userAddress address The user to check balances for
   * @param queries NFTQuery[] Array of NFT queries
   * @return uint256[] Array of balances corresponding to each query
   */
  function getWalletNFTBalances(
    address userAddress,
    NFTQuery[] calldata queries
  ) external view returns (uint256[] memory) {
    if (queries.length == 0) revert ArgumentInvalid();

    uint256[] memory balances = new uint256[](queries.length);

    for (uint256 i; i < queries.length; ) {
      balances[i] = getWalletNFTBalance(userAddress, queries[i]);
      unchecked {
        ++i;
      }
    }

    return balances;
  }

  /**
   * @notice Batch check NFT allowances for multiple NFTs
   * @param userAddress address The user who granted the approval
   * @param operatorAddress address The operator to check approval for
   * @param queries NFTQuery[] Array of NFT queries
   * @return bool[] Array of allowance states corresponding to each query
   */
  function getWalletNFTAllowances(
    address userAddress,
    address operatorAddress,
    NFTQuery[] calldata queries
  ) external view returns (bool[] memory) {
    if (queries.length == 0) revert ArgumentInvalid();

    bool[] memory allowances = new bool[](queries.length);

    for (uint256 i; i < queries.length; ) {
      allowances[i] = getWalletNFTAllowance(
        userAddress,
        operatorAddress,
        queries[i]
      );
      unchecked {
        ++i;
      }
    }

    return allowances;
  }
}
