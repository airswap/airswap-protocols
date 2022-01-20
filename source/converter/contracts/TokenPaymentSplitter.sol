// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Context.sol";

/**
 * @title TokenPaymentSplitter
 * @dev Modified version of OpenZeppelin's PaymentSplitter contract. This contract allows to split Token payments
 * among a group of accounts. The sender does not need to be aware that the Token will be split in this way, since
 * it is handled transparently by the contract.
 *
 * The split can be in equal parts or in any other arbitrary proportion. The way this is specified is by assigning each
 * account to a number of shares.
 *
 * The actual transfer is triggered as a separate function.
 */
abstract contract TokenPaymentSplitter is Context {
  uint256 internal _totalShares;

  mapping(address => uint256) internal _shares;
  address[] internal _payees;

  event PayeeAdded(address account, uint256 shares);
  event PayeeRemoved(address account);

  /**
   * @dev Creates an instance of `TokenPaymentSplitter` where each account in `payees` is assigned the number
   * of shares at the matching position in the `shares` array.
   *
   * All addresses in `payees` must be non-zero. Both arrays must have the same non-zero length, and there must be no
   * duplicates in `payees`.
   */
  constructor(address[] memory payees, uint256[] memory shares_) payable {
    require(
      payees.length == shares_.length,
      "TokenPaymentSplitter: payees and shares length mismatch"
    );
    require(payees.length > 0, "TokenPaymentSplitter: no payees");

    for (uint256 i = 0; i < payees.length; i++) {
      _addPayee(payees[i], shares_[i]);
    }
  }

  /**
   * @dev Getter for the total shares held by payees.
   */
  function totalShares() public view returns (uint256) {
    return _totalShares;
  }

  /**
   * @dev Getter for the amount of shares held by an account.
   */
  function shares(address account) public view returns (uint256) {
    return _shares[account];
  }

  /**
   * @dev Getter for the address of the payee number `index`.
   */
  function payee(uint256 index) public view returns (address) {
    require(_payees.length >= 1, "TokenPaymentSplitter: There are no payees");
    return _payees[index];
  }

  /**
   * @dev Add a new payee to the contract.
   * @param account The address of the payee to add.
   * @param shares_ The number of shares owned by the payee.
   */
  function _addPayee(address account, uint256 shares_) internal {
    require(
      account != address(0),
      "TokenPaymentSplitter: account is the zero address"
    );
    require(shares_ > 0, "TokenPaymentSplitter: shares are 0");
    require(
      _shares[account] == 0,
      "TokenPaymentSplitter: account already has shares"
    );

    _payees.push(account);
    _shares[account] = shares_;
    _totalShares = _totalShares + shares_;
    emit PayeeAdded(account, shares_);
  }

  /**
   * @dev Remove an existing payee from the contract.
   * @param account The address of the payee to remove.
   * @param index The position of the payee in the _payees array.
   */
  function _removePayee(address account, uint256 index) internal {
    require(
      index < _payees.length,
      "TokenPaymentSplitter: index not in payee array"
    );
    require(
      account == _payees[index],
      "TokenPaymentSplitter: account does not match payee array index"
    );

    _totalShares = _totalShares - _shares[account];
    _shares[account] = 0;
    _payees[index] = _payees[_payees.length - 1];
    _payees.pop();
    emit PayeeRemoved(account);
  }
}
