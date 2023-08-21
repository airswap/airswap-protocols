// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./interfaces/IPool.sol";

/**
 * @title AirSwap: Rewards Pool
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

  // Mapping of address to boolean to enable admin accounts
  mapping(address => bool) public admins;

  // Mapping of tree -> account -> has claimed
  mapping(bytes32 => mapping(address => bool)) public claimed;

  // Mapping of tree -> root
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
   * @dev Reverts if called by any account other than an admin.
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
   * @notice Enables claims for a merkle tree of a set of values by setting the
   *         merkle root
   * @param _tree bytes32 The merkle tree unique identifier.
   * @param _root bytes32 The merkle root.
   */
  function enable(bytes32 _tree, bytes32 _root) external override multiAdmin {
    rootsByTree[_tree] = _root;
    emit Enable(_tree, _root);
  }

  /**
   * @notice Returns the claim status of a set of roots for a given address
   * @param _account address The address to check.
   * @param _trees bytes32[] An array of tree identifiers.
   * @return claimList bool[] An array of claim statuses.
   */
  function getClaimStatusForTrees(
    address _account,
    bytes32[] calldata _trees
  ) external view returns (bool[] memory) {
    bool[] memory claimList = new bool[](_trees.length);
    for (uint256 i = 0; i < _trees.length; i++) {
      claimList[i] = claimed[_trees[i]][_account];
    }
    return claimList;
  }

  /**
   * @notice Admin function to migrate funds
   * @dev Only owner
   * @param _tokens address[] addresses of tokens to migrate
   * @param _dest address destination address
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
   * @notice Withdraw tokens from the pool using one or more claims, sending
   *         the tokens to the passed recipient address.
   * @param _claims Claim[] A set of claims each consisting of a tree id, a
   *        points earned, and a merkle proof.
   * @param _token address The address of the token to withdraw.
   * @param _minimumAmount uint256 The minimum amount to withdraw - this acts
   *        as slippage / frontrunning protection.
   * @param _recipient address The address to send the tokens to.
   */
  function withdraw(
    Claim[] memory _claims,
    address _token,
    uint256 _minimumAmount,
    address _recipient
  ) public override returns (uint256 _amount) {
    if (_claims.length <= 0) revert ClaimsNotProvided();

    Claim memory _claim;
    bytes32 _root;
    bytes32[] memory _treeList = new bytes32[](_claims.length);
    uint256 _totalValue = 0;

    for (uint256 i = 0; i < _claims.length; i++) {
      _claim = _claims[i];
      _root = rootsByTree[_claim.tree];

      if (_root == 0) revert TreeDisabled(_claim.tree);
      if (claimed[_claim.tree][msg.sender]) revert AlreadyClaimed();
      if (!verify(msg.sender, _root, _claim.value, _claim.proof))
        revert ProofInvalid(_claim.tree, _root);

      _totalValue = _totalValue + _claim.value;
      claimed[_claim.tree][msg.sender] = true;
      _treeList[i] = _claim.tree;
    }

    _amount = calculate(_totalValue, _token);
    if (_amount < _minimumAmount) revert AmountInsufficient(_amount);

    IERC20(_token).safeTransfer(_recipient, _amount);
    emit Withdraw(_treeList, msg.sender, _token, _amount);
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
