/*
    Utility contract for checking balances and allowances for ERC20 tokens
    Some of these functions originated from (and then improved upon) DeltaBalances.github.io
    Check balances for multiple ERC20 tokens for multiple users in 1 batched call
    Contains an admin - owner to return any lost ether or tokens if necessary
*/

pragma solidity 0.5.16;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/utils/Address.sol";

/**
 * @title BalanceChecker: Contract for checking balances and allowances for ERC20 tokens
 * @notice Supports checks for fungible tokens (ERC-20)
 */
contract BalanceChecker is Ownable {
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
    uint256[] memory allowances =
      new uint256[](tokenAddresses.length * userAddresses.length);

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
    uint256[] memory balances =
      new uint256[](tokenAddresses.length * userAddresses.length);
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
   * @notice Self-destruct contract for clean-up
   */
  function destruct(address payable recipientAddress) public onlyOwner {
    selfdestruct(recipientAddress);
  }

  /**
   * @notice Allow owner to withdraw ether from contract
   */
  function withdraw() public onlyOwner {
    (bool success, ) = address(owner()).call.value(address(this).balance)("");
    require(success, "ETH_WITHDRAW_FAILED");
  }

  /**
   * @notice Allow owner to withdraw stuck tokens from contract
   * @param tokenAddress address
   * @param amount uint256
   */
  function withdrawToken(address tokenAddress, uint256 amount)
    public
    onlyOwner
  {
    require(tokenAddress != address(0x0)); //use withdraw for ETH
    IERC20(tokenAddress).safeTransfer(msg.sender, amount);
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
      (bool success, ) =
        address(token).staticcall(
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
  function tokenBalance(address userAddress, address tokenAddress)
    public
    view
    returns (uint256)
  {
    if (tokenAddress.isContract()) {
      IERC20 token = IERC20(tokenAddress);
      //  Check if balanceOf succeeds.
      (bool success, ) =
        address(token).staticcall(
          abi.encodeWithSelector(token.balanceOf.selector, userAddress)
        );
      if (success) {
        return token.balanceOf(userAddress);
      }
      return 0;
    }
    return 0;
  }
}
