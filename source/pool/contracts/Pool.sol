// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@airswap/staking/contracts/interfaces/IStaking.sol";
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

  // Max percentage for a claim with infinite score
  uint256 public max;

  // Mapping of tree root to boolean to enable claims
  mapping(bytes32 => bool) public roots;

  // Mapping of address to boolean to enable admin accounts
  mapping(address => bool) public admins;

  // Mapping of tree root to account to mark as claimed
  mapping(bytes32 => mapping(address => bool)) public claimed;

  // Staking contract address
  address public stakingContract;

  // Staking token address
  address public stakingToken;

  /**
   * @notice Constructor
   * @param _scale uint256
   * @param _max uint256
   */
  constructor(uint256 _scale, uint256 _max) {
    if (_max > MAX_PERCENTAGE) revert MaxTooHigh(_max);
    if (_scale > MAX_SCALE) revert ScaleTooHigh(_scale);
    scale = _scale;
    max = _max;
  }

  /**
   * @dev Throws if called by any account other than the admin.
   */
  modifier multiAdmin() {
    if (!admins[msg.sender]) revert Unauthorized();
    _;
  }

  /**
   * @notice Set scale
   * @dev Only owner
   * @param _scale uint256
   */
  function setScale(uint256 _scale) external override onlyOwner {
    if (_scale > MAX_SCALE) revert ScaleTooHigh(_scale);
    scale = _scale;
    emit SetScale(scale);
  }

  /**
   * @notice Set max
   * @dev Only owner
   * @param _max uint256
   */
  function setMax(uint256 _max) external override onlyOwner {
    if (_max > MAX_PERCENTAGE) revert MaxTooHigh(_max);
    max = _max;
    emit SetMax(max);
  }

  /**
   * @notice Add admin address
   * @dev Only owner
   * @param _admin address
   */
  function addAdmin(address _admin) external override onlyOwner {
    if (_admin == address(0)) revert AddressInvalid(_admin);
    admins[_admin] = true;
    emit AddAdmin(_admin);
  }

  /**
   * @notice Remove admin address
   * @dev Only owner
   * @param _admin address
   */
  function removeAdmin(address _admin) external override onlyOwner {
    if (admins[_admin] != true) revert AdminNotSet(_admin);
    admins[_admin] = false;
    emit RemoveAdmin(_admin);
  }

  /**
   * @notice Set staking contract address
   * @dev Only owner
   * @param _stakingContract address
   */
  function setStaking(
    address _stakingToken,
    address _stakingContract
  ) external override onlyOwner {
    if (_stakingContract == address(0)) revert AddressInvalid(_stakingContract);
    if (_stakingToken == address(0)) revert AddressInvalid(_stakingToken);
    if (stakingToken != address(0) && stakingContract != address(0)) {
      // set allowance on old staking token to zero
      IERC20(stakingToken).safeApprove(stakingContract, 0);
    }
    stakingContract = _stakingContract;
    stakingToken = _stakingToken;
    IERC20(stakingToken).safeApprove(stakingContract, 2 ** 256 - 1);
  }

  /**
   * @notice Set claims from previous pool contract
   * @dev Only owner
   * @param root bytes32
   * @param accounts address[]
   */
  function setClaimed(
    bytes32 root,
    address[] memory accounts
  ) external override multiAdmin {
    if (roots[root] == false) {
      roots[root] = true;
    }
    for (uint256 i = 0; i < accounts.length; i++) {
      address account = accounts[i];
      if (claimed[root][account]) revert AlreadyClaimed();
      claimed[root][account] = true;
    }
    emit Enable(root);
  }

  /**
   * @notice Enables claims for a merkle tree of a set of scores
   * @param root bytes32
   */
  function enable(bytes32 root) external override multiAdmin {
    if (roots[root]) revert RootExists(root);
    roots[root] = true;
    emit Enable(root);
  }

  /**
   * @notice Admin function to migrate funds
   * @dev Only owner
   * @param tokens address[]
   * @param dest address
   */
  function drainTo(
    address[] calldata tokens,
    address dest
  ) external override onlyOwner {
    for (uint256 i = 0; i < tokens.length; i++) {
      uint256 bal = IERC20(tokens[i]).balanceOf(address(this));
      IERC20(tokens[i]).safeTransfer(dest, bal);
    }
    emit DrainTo(tokens, dest);
  }

  /**
   * @notice Withdraw tokens from the pool using claims
   * @param claims Claim[]
   * @param token address
   */
  function withdraw(Claim[] memory claims, address token) external override {
    withdrawProtected(claims, token, 0, msg.sender);
  }

  /**
   * @notice Withdraw tokens from the pool using claims and stake
   * @param claims Claim[]
   * @param token address
   */
  function withdrawAndStake(
    Claim[] memory claims,
    address token,
    uint256 minimumAmount
  ) external override {
    if (token != address(stakingToken)) revert TokenInvalid(token);
    (uint256 amount, bytes32[] memory rootList) = _withdrawCheck(
      claims,
      token,
      minimumAmount
    );
    IStaking(stakingContract).stakeFor(msg.sender, amount);
    emit Withdraw(rootList, msg.sender, token, amount);
  }

  /**
   * @notice Withdraw tokens from the pool using claims and stake for another account
   * @param claims Claim[]
   * @param token address
   * @param account address
   */
  function withdrawAndStakeFor(
    Claim[] memory claims,
    address token,
    uint256 minimumAmount,
    address account
  ) external override {
    if (token != address(stakingToken)) revert TokenInvalid(token);
    (uint256 amount, bytes32[] memory rootList) = _withdrawCheck(
      claims,
      token,
      minimumAmount
    );
    IERC20(stakingToken).approve(stakingContract, amount);
    IStaking(stakingContract).stakeFor(account, amount);
    emit Withdraw(rootList, msg.sender, token, amount);
  }

  /**
   * @notice Withdraw tokens from the pool using claims and send to recipient
   * @param claims Claim[]
   * @param token address
   * @param recipient address
   */
  function withdrawWithRecipient(
    Claim[] memory claims,
    address token,
    uint256 minimumAmount,
    address recipient
  ) external override {
    withdrawProtected(claims, token, minimumAmount, recipient);
  }

  /**
   * @notice Withdraw tokens from the pool using claims
   * @param claims Claim[]
   * @param token address
   * @param minimumAmount uint256
   */
  function _withdrawCheck(
    Claim[] memory claims,
    address token,
    uint256 minimumAmount
  ) internal returns (uint256, bytes32[] memory) {
    if (claims.length <= 0) revert ClaimsNotProvided();
    uint256 totalScore = 0;
    bytes32[] memory rootList = new bytes32[](claims.length);
    Claim memory claim;
    for (uint256 i = 0; i < claims.length; i++) {
      claim = claims[i];
      if (!roots[claim.root]) revert RootDisabled(claim.root);
      if (claimed[claim.root][msg.sender]) revert AlreadyClaimed();
      if (!verify(msg.sender, claim.root, claim.score, claim.proof))
        revert ProofInvalid(claim.proof);
      totalScore = totalScore + claim.score;
      claimed[claim.root][msg.sender] = true;
      rootList[i] = claim.root;
    }
    uint256 amount = calculate(totalScore, token);
    if (amount < minimumAmount) revert AmountInsufficient(amount);
    return (amount, rootList);
  }

  /**
   * @notice Calculate output amount for an input score
   * @param score uint256
   * @param token address
   * @return amount uint256 amount to claim based on balance, scale, and max
   */
  function calculate(
    uint256 score,
    address token
  ) public view override returns (uint256 amount) {
    uint256 balance = IERC20(token).balanceOf(address(this));
    uint256 divisor = (uint256(10) ** scale) + score;
    return (max * score * balance) / divisor / 100;
  }

  /**
   * @notice Withdraw tokens from the pool using claims
   * @param claims Claim[]
   * @param token address
   * @param minimumAmount uint256
   * @param recipient address
   */
  function withdrawProtected(
    Claim[] memory claims,
    address token,
    uint256 minimumAmount,
    address recipient
  ) public override returns (uint256) {
    (uint256 amount, bytes32[] memory rootList) = _withdrawCheck(
      claims,
      token,
      minimumAmount
    );
    IERC20(token).safeTransfer(recipient, amount);
    emit Withdraw(rootList, msg.sender, token, amount);
    return amount;
  }

  /**
   * @notice Verify a claim proof
   * @param participant address
   * @param root bytes32
   * @param score uint256
   * @param proof bytes32[]
   */
  function verify(
    address participant,
    bytes32 root,
    uint256 score,
    bytes32[] memory proof
  ) public pure override returns (bool valid) {
    bytes32 leaf = keccak256(abi.encodePacked(participant, score));
    return MerkleProof.verify(proof, root, leaf);
  }
}
