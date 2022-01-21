// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./TokenPaymentSplitter.sol";

interface IUniswapV2Router02 {
  function swapExactTokensForTokensSupportingFeeOnTransferTokens(
    uint256 amountIn,
    uint256 amountOutMin,
    address[] calldata path,
    address to,
    uint256 deadline
  ) external;
}

/**
 * @title AirSwap Converter: Convert Fee Tokens
 * @notice https://www.airswap.io/
 */
contract Converter is Ownable, ReentrancyGuard, TokenPaymentSplitter {
  using SafeERC20 for IERC20;

  address public wETH;

  address public swapToToken;

  address public immutable uniRouter;

  uint256 public triggerFee;

  mapping(address => address[]) private tokenPathMapping;

  event ConvertAndTransfer(
    address triggerAccount,
    address swapFromToken,
    address swapToToken,
    uint256 amountTokenFrom,
    uint256 amountTokenTo,
    address[] recievedAddresses
  );

  event DrainTo(address[] tokens, address dest);

  constructor(
    address _wETH,
    address _swapToToken,
    address _uniRouter,
    uint256 _triggerFee,
    address[] memory _payees,
    uint256[] memory _shares
  ) TokenPaymentSplitter(_payees, _shares) {
    wETH = _wETH;
    swapToToken = _swapToToken;
    uniRouter = _uniRouter;
    setTriggerFee(_triggerFee);
  }

  /**
   * @dev Set a new address for WETH.
   **/
  function setWETH(address _swapWETH) public onlyOwner {
    require(_swapWETH != address(0), "MUST_BE_VALID_ADDRESS");
    wETH = _swapWETH;
  }

  /**
   * @dev Set a new token to swap to (e.g., stabletoken).
   **/
  function setSwapToToken(address _swapToToken) public onlyOwner {
    require(_swapToToken != address(0), "MUST_BE_VALID_ADDRESS");
    swapToToken = _swapToToken;
  }

  /**
   * @dev Set a new fee (perentage 0 - 100) for calling the ConvertAndTransfer function.
   */
  function setTriggerFee(uint256 _triggerFee) public onlyOwner {
    require(_triggerFee <= 100, "FEE_TOO_HIGH");
    triggerFee = _triggerFee;
  }

  /**
   * @dev Set a new Uniswap router path for a token.
   */
  function setTokenPath(address _token, address[] memory _tokenPath)
    public
    onlyOwner
  {
    uint256 pathLength = _tokenPath.length;
    for (uint256 i = 0; i < pathLength; i++) {
      tokenPathMapping[_token].push(_tokenPath[i]);
    }
  }

  /**
   * @dev Converts an token in the contract to the SwapToToken and transfers to payees.
   * @param _swapFromToken The token to be swapped from.
   * @param _amountOutMin The amount to be swapped and distributed.
   */
  function convertAndTransfer(address _swapFromToken, uint256 _amountOutMin)
    public
    onlyOwner
    nonReentrant
  {
    // Checks that at least 1 payee is set to recieve converted token.
    require(_payees.length >= 1, "PAYEES_MUST_BE_SET");
    // Checks that _amountOutMin is at least 1
    require(_amountOutMin > 0, "INVALID_AMOUNT_OUT");
    // Calls the balanceOf function from the to be converted token.
    uint256 tokenBalance = _balanceOfErc20(_swapFromToken);
    // Checks that the converted token is currently present in the contract.
    require(tokenBalance > 0, "NO_BALANCE_TO_CONVERT");
    // Read or set the path for AMM.
    if (_swapFromToken != swapToToken) {
      address[] memory path;
      if (tokenPathMapping[_swapFromToken].length > 0) {
        path = getTokenPath(_swapFromToken);
      } else {
        tokenPathMapping[_swapFromToken].push(_swapFromToken);
        tokenPathMapping[_swapFromToken].push(wETH);
        if (swapToToken != wETH) {
          tokenPathMapping[_swapFromToken].push(swapToToken);
        }
        path = getTokenPath(_swapFromToken);
      }
      // Approve token for AMM usage.
      _approveErc20(_swapFromToken, tokenBalance);
      // Calls the swap function from the on-chain AMM to swap token from fee pool into reward token.
      IUniswapV2Router02(uniRouter)
        .swapExactTokensForTokensSupportingFeeOnTransferTokens(
          tokenBalance,
          _amountOutMin,
          path,
          address(this),
          block.timestamp
        );
    }
    // Calls the balanceOf function from the reward token to get the new balance post-swap.
    uint256 totalPayeeAmount = _balanceOfErc20(swapToToken);
    // Calculates trigger reward amount and transfers to msg.sender.
    if (triggerFee > 0) {
      uint256 triggerFeeAmount = (totalPayeeAmount * triggerFee) / 100;
      _transferErc20(msg.sender, swapToToken, triggerFeeAmount);
      totalPayeeAmount = totalPayeeAmount - triggerFeeAmount;
    }
    // Transfers remaining amount to reward payee address(es).
    for (uint256 i = 0; i < _payees.length; i++) {
      uint256 payeeAmount = (totalPayeeAmount * _shares[_payees[i]]) /
        _totalShares;
      _transferErc20(_payees[i], swapToToken, payeeAmount);
    }
    emit ConvertAndTransfer(
      msg.sender,
      _swapFromToken,
      swapToToken,
      tokenBalance,
      totalPayeeAmount,
      _payees
    );
  }

  /**
   * @dev Drains funds from provided list of tokens
   * @param _transferTo Address of the recipient.
   * @param _tokens List of tokens to transfer from the contract
   */
  function drainTo(address _transferTo, address[] calldata _tokens)
    public
    onlyOwner
  {
    for (uint256 i = 0; i < _tokens.length; i++) {
      uint256 balance = _balanceOfErc20(_tokens[i]);
      if (balance > 0) {
        _transferErc20(_transferTo, _tokens[i], balance);
      }
    }
    emit DrainTo(_tokens, _transferTo);
  }

  /**
   * @dev Add a recipient to receive payouts from the consolidateFeeToken function.
   * @param _account Address of the recipient.
   * @param _shares Amount of shares to determine th proportion of payout received.
   */
  function addPayee(address _account, uint256 _shares) public onlyOwner {
    _addPayee(_account, _shares);
  }

  /**
   * @dev Remove a recipient from receiving payouts from the consolidateFeeToken function.
   * @param _account Address of the recipient.
   * @param _index Index number of the recipient in the array of recipients.
   */
  function removePayee(address _account, uint256 _index) public onlyOwner {
    _removePayee(_account, _index);
  }

  /**
   * @dev View Uniswap router path for a token.
   */
  function getTokenPath(address _token)
    public
    view
    onlyOwner
    returns (address[] memory)
  {
    return tokenPathMapping[_token];
  }

  /**
   * @dev Internal function to approve ERC20 for AMM calls.
   * @param _tokenToApprove Address of ERC20 to approve.
   * @param _amount Amount of ERC20  to be approved.
   *
   * */
  function _approveErc20(address _tokenToApprove, uint256 _amount) internal {
    require(
      IERC20(_tokenToApprove).approve(address(uniRouter), _amount),
      "APPROVE_FAILED"
    );
  }

  /**
   * @dev Internal function to transfer ERC20 held in the contract.
   * @param _recipient Address to receive ERC20.
   * @param _tokenContract Address of the ERC20.
   * @param _transferAmount Amount or ERC20 to be transferred.
   *
   * */
  function _transferErc20(
    address _recipient,
    address _tokenContract,
    uint256 _transferAmount
  ) internal {
    IERC20(_tokenContract).safeTransfer(_recipient, _transferAmount);
  }

  /**
   * @dev Internal function to call balanceOf on ERC20.
   * @param _tokenToBalanceOf Address of ERC20 to call.
   *
   * */
  function _balanceOfErc20(address _tokenToBalanceOf)
    internal
    view
    returns (uint256)
  {
    IERC20 erc;
    erc = IERC20(_tokenToBalanceOf);
    uint256 tokenBalance = erc.balanceOf(address(this));
    return tokenBalance;
  }
}