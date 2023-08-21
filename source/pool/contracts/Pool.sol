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

  uint256 internal constant MAX_PERCENTAGE = 100;
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
   * @param _scale uint256 scale param for calculating claim amount
   * @param _max uint256 max param for calculating claim amount
   */
  constructor(uint256 _scale, uint256 _max) {
    if (_max > MAX_PERCENTAGE) revert MaxTooHigh(_max);
    if (_scale > MAX_SCALE) revert ScaleTooHigh(_scale);
    scale = _scale;
    max = _max;
  }

  /**
   * @dev Revert if called by account other than admin.
   */
  modifier multiAdmin() {
    if (!admins[msg.sender]) revert Unauthorized();
    _;
  }

  /**
   * @notice Set scale
   * @dev Only owner
   * @param _scale uint256 scale param for calculating claim amount
   */
  function setScale(uint256 _scale) external override onlyOwner {
    if (_scale > MAX_SCALE) revert ScaleTooHigh(_scale);
    scale = _scale;
    emit SetScale(scale);
  }

  /**
   * @notice Set max
   * @dev Only owner
   * @param _max uint256 max param for calculating claim amount
   */
  function setMax(uint256 _max) external override onlyOwner {
    if (_max > MAX_PERCENTAGE) revert MaxTooHigh(_max);
    max = _max;
    emit SetMax(max);
  }

  /**
   * @notice Add admin address
   * @dev Only owner
   * @param _admin address to add
   */
  function addAdmin(address _admin) external override onlyOwner {
    if (_admin == address(0)) revert AddressInvalid(_admin);
    admins[_admin] = true;
    emit AddAdmin(_admin);
  }

  /**
   * @notice Remove admin address
   * @dev Only owner
   * @param _admin address to remove
   */
  function removeAdmin(address _admin) external override onlyOwner {
    if (admins[_admin] != true) revert AdminNotSet(_admin);
    admins[_admin] = false;
    emit RemoveAdmin(_admin);
  }

  /**
   * @notice Enables claims for a merkle tree by setting the root
   * @param _tree bytes32 a tree identifier
   * @param _root bytes32 a tree root
   */
  function enable(bytes32 _tree, bytes32 _root) external override multiAdmin {
    rootsByTree[_tree] = _root;
    emit Enable(_tree, _root);
  }

  /**
   * @notice Get claim status for a set of trees for an account
   * @param _account address The address to check.
   * @param _trees bytes32[] An array of tree identifiers.
   * @return statuses bool[] An array of claim statuses.
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

  /**
   * @notice Transfer out token balances for migrations
   * @dev Only owner
   * @param _tokens address[] token balances to transfer
   * @param _dest address destination
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
   * @notice Withdraw from the pool using one or more claims
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
  ) public override returns (uint256 amount) {
    (uint256 _amount, bytes32[] memory _treeList) = _withdrawCheck(
      _claims,
      _token,
      _minimum
    );
    IERC20(_token).safeTransfer(_recipient, _amount);
    emit Withdraw(_treeList, msg.sender, _token, _amount);
    return _amount;
  }

  /**
   * @notice Verify a set of claims and calculate the
   *         total amount of that can be withdrawn with them.
   * @param _claims Claim[] a set of claims
   * @param _token address of the token to withdraw
   * @param _minimum uint256 minimum expected amount
   */
  function _withdrawCheck(
    Claim[] memory _claims,
    address _token,
    uint256 _minimum
  ) internal returns (uint256, bytes32[] memory) {
    if (_claims.length <= 0) revert ClaimsNotProvided();

    uint256 _totalValue = 0;
    bytes32[] memory _treeList = new bytes32[](_claims.length);

    Claim memory _claim;
    bytes32 _root;

    for (uint256 i = 0; i < _claims.length; i++) {
      _claim = _claims[i];
      _root = rootsByTree[_claim.tree];

      if (_root == 0) revert TreeDisabled(_claim.tree);
      if (claimed[_claim.tree][msg.sender]) revert AlreadyClaimed();
      if (!verify(msg.sender, _root, _claim.value, _claim.proof))
        revert ProofInvalid(_root);

      _totalValue = _totalValue + _claim.value;
      claimed[_claim.tree][msg.sender] = true;
      _treeList[i] = _claim.tree;
    }

    uint256 _amount = calculate(_totalValue, _token);
    if (_amount < _minimum) revert AmountInsufficient(_amount);

    return (_amount, _treeList);
  }

  /**
   * @notice Calculate output amount for a given input amount and token
   * @param _value uint256 input amount
   * @param _token address token address to withdraw from the pool
   * @return amount uint256 amount withdrawable based on balance, scale, and max
   */
  function calculate(
    uint256 _value,
    address _token
  ) public view override returns (uint256 amount) {
    uint256 _balance = IERC20(_token).balanceOf(address(this));
    uint256 _divisor = (uint256(10) ** scale) + _value;
    return (max * _value * _balance) / _divisor / 100;
  }

  /**
   * @notice Verify a claim's merkle proof
   * @param _participant address The address of the claimant
   * @param _root bytes32 The merkle root
   * @param _value uint256 The value of the claim
   * @param _proof bytes32[] The provided merkle proof
   */
  function verify(
    address _participant,
    bytes32 _root,
    uint256 _value,
    bytes32[] memory _proof
  ) public pure override returns (bool valid) {
    bytes32 _leaf = keccak256(abi.encodePacked(_participant, _value));
    return MerkleProof.verify(_proof, _root, _leaf);
  }
}
