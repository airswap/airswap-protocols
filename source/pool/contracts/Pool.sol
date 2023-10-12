// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./interfaces/IPool.sol";

/**
 * @title AirSwap: Withdrawable Token Pool
 * @notice https://www.airswap.io/
 */
contract Pool is IPool, Ownable2Step {
  using SafeERC20 for IERC20;

  uint256 internal constant MAX_MAX = 100;
  uint256 internal constant MAX_SCALE = 77;

  // Larger the scale, lower the output for a claim
  uint256 public scale;

  // Max percentage for a claim with infinite value
  uint256 public max;

  // Mapping of address to boolean for admin accounts
  mapping(address => bool) public admins;

  // Mapping of tree to account to claim status
  mapping(bytes32 => mapping(address => bool)) public claimed;

  // Mapping of tree to root
  mapping(bytes32 => bytes32) public rootsByTree;

  /**
   * @notice Constructor
   * @param _scale uint256 scale to calculate withdrawal amount
   * @param _max uint256 max to calculate withdrawal amount
   */
  constructor(uint256 _scale, uint256 _max) {
    if (_max > MAX_MAX) revert MaxTooHigh(_max);
    if (_scale > MAX_SCALE) revert ScaleTooHigh(_scale);
    max = _max;
    scale = _scale;
  }

  /**
   * @dev Revert if called by non admin account
   */
  modifier multiAdmin() {
    if (!admins[msg.sender]) revert Unauthorized();
    _;
  }

  /**
   * @notice Transfer out token balances for migrations
   * @param _tokens address[] token balances to transfer
   * @param _dest address destination
   * @dev Only owner
   */
  function drainTo(
    address[] calldata _tokens,
    address _dest
  ) external override onlyOwner {
    for (uint256 i = 0; i < _tokens.length; i++) {
      uint256 _bal = IERC20(_tokens[i]).balanceOf(address(this));
      IERC20(_tokens[i]).safeTransfer(_dest, _bal);
    }
    emit DrainTo(_tokens, _dest);
  }

  /**
   * @notice Set withdrawal scale
   * @param _scale uint256 scale to calculate withdrawal amount
   * @dev Only owner
   */
  function setScale(uint256 _scale) external override onlyOwner {
    if (_scale > MAX_SCALE) revert ScaleTooHigh(_scale);
    scale = _scale;
    emit SetScale(scale);
  }

  /**
   * @notice Set withdrawal max
   * @param _max uint256 max to calculate withdrawal amount
   * @dev Only owner
   */
  function setMax(uint256 _max) external override onlyOwner {
    if (_max > MAX_MAX) revert MaxTooHigh(_max);
    max = _max;
    emit SetMax(max);
  }

  /**
   * @notice Set an admin
   * @param _admin address to set as admin
   * @dev Only owner
   */
  function setAdmin(address _admin) external override onlyOwner {
    if (_admin == address(0)) revert AddressInvalid(_admin);
    admins[_admin] = true;
    emit SetAdmin(_admin);
  }

  /**
   * @notice Unset an admin
   * @param _admin address to unset as admin
   * @dev Only owner
   */
  function unsetAdmin(address _admin) external override onlyOwner {
    if (admins[_admin] != true) revert AdminNotSet(_admin);
    admins[_admin] = false;
    emit UnsetAdmin(_admin);
  }

  /**
   * @notice Enable claims for a merkle tree
   * @param _tree bytes32 a tree identifier
   * @param _root bytes32 a tree root
   */
  function enable(bytes32 _tree, bytes32 _root) external override multiAdmin {
    rootsByTree[_tree] = _root;
    emit Enable(_tree, _root);
  }

  /**
   * @notice Set previous claims for migrations
   * @param _tree bytes32
   * @param _root bytes32
   * @param _accounts address[]
   * @dev Only owner
   */
  function enableAndSetClaimed(
    bytes32 _tree,
    bytes32 _root,
    address[] memory _accounts
  ) external override multiAdmin {
    // Enable the tree if not yet enabled
    if (rootsByTree[_tree] == 0) {
      rootsByTree[_tree] = _root;
      emit Enable(_tree, _root);
    }
    // Iterate and set as claimed if not yet claimed
    for (uint256 i = 0; i < _accounts.length; i++) {
      if (claimed[_tree][_accounts[i]] == false) {
        claimed[_tree][_accounts[i]] = true;
        emit UseClaim(_accounts[i], _tree);
      }
    }
  }

  /**
   * @notice Withdraw tokens using claims
   * @param _claims Claim[] a set of claims
   * @param _token address of a token to withdraw
   * @param _minimum uint256 minimum expected amount
   * @param _recipient address to receive withdrawal
   */
  function withdraw(
    Claim[] memory _claims,
    address _token,
    uint256 _minimum,
    address _recipient
  ) public override returns (uint256 _amount) {
    if (_claims.length <= 0) revert ClaimsNotProvided();

    Claim memory _claim;
    bytes32 _root;
    uint256 _totalValue = 0;

    // Iterate through claims to determine total value
    for (uint256 i = 0; i < _claims.length; i++) {
      _claim = _claims[i];
      _root = rootsByTree[_claim.tree];

      if (_root == 0) revert TreeNotEnabled(_claim.tree);
      if (claimed[_claim.tree][msg.sender]) revert ClaimAlreadyUsed();
      if (!verify(msg.sender, _root, _claim.value, _claim.proof))
        revert ProofInvalid(_claim.tree, _root);

      _totalValue = _totalValue + _claim.value;
      claimed[_claim.tree][msg.sender] = true;
      emit UseClaim(msg.sender, _claim.tree);
    }

    // Determine withdrawable amount given total value
    _amount = calculate(_totalValue, _token);
    if (_amount < _minimum) revert AmountInsufficient(_amount);

    // Transfer withdrawable amount to recipient
    IERC20(_token).safeTransfer(_recipient, _amount);
    emit Withdraw(msg.sender, _recipient, _token, _totalValue, _amount);
  }

  /**
   * @notice Calculate amount for a value and token
   * @param _value uint256 claim value
   * @param _token address claim token
   * @return uint256 amount withdrawable
   */
  function calculate(
    uint256 _value,
    address _token
  ) public view override returns (uint256) {
    uint256 _balance = IERC20(_token).balanceOf(address(this));
    uint256 _divisor = (uint256(10) ** scale) + _value;
    return (max * _value * _balance) / _divisor / MAX_MAX;
  }

  /**
   * @notice Verify a merkle proof
   * @param _claimant address of the claimant
   * @param _root bytes32 merkle root
   * @param _value uint256 merkle value
   * @param _proof bytes32[] merkle proof
   * @return bool whether verified
   */
  function verify(
    address _claimant,
    bytes32 _root,
    uint256 _value,
    bytes32[] memory _proof
  ) public pure override returns (bool) {
    bytes32 _leaf = keccak256(abi.encodePacked(_claimant, _value));
    return MerkleProof.verify(_proof, _root, _leaf);
  }

  /**
   * @notice Get claim status for an account and set of trees
   * @param _account address to check
   * @param _trees bytes32[] an array of tree identifiers
   * @return statuses bool[] an array of claim statuses
   */
  function getStatus(
    address _account,
    bytes32[] calldata _trees
  ) external view returns (bool[] memory) {
    bool[] memory statuses = new bool[](_trees.length);
    for (uint256 i = 0; i < _trees.length; i++) {
      statuses[i] = claimed[_trees[i]][_account];
    }
    return statuses;
  }
}
