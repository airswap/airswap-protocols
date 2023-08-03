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

  // Mapping of address to boolean to enable admin accounts
  mapping(address => bool) public admins;

  // Mapping of tree root to account to mark as claimed
  mapping(bytes32 => mapping(address => bool)) public claimed;

  // Mapping of groupId to root
  mapping(bytes32 => bytes32) public rootsByGroupId;

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
    emit SetStaking(_stakingToken, _stakingContract);
  }

  /**
   * @notice Set claims from previous pool contract
   * @dev Only owner
   * @param _groupId bytes32
   * @param _accounts address[]
   */
  function setClaimed(
    bytes32 _groupId,
    address[] memory _accounts
  ) external override multiAdmin {
    // if (roots[rootsByGroupId[_groupId]] == false) {
    //   roots[rootsByGroupId[_groupId]] = true;
    // }
    for (uint256 i = 0; i < _accounts.length; i++) {
      address account = _accounts[i];
      if (claimed[rootsByGroupId[_groupId]][account]) revert AlreadyClaimed();
      claimed[rootsByGroupId[_groupId]][account] = true;
    }
    emit Enable(rootsByGroupId[_groupId]);
  }

  /**
   * @notice Enables claims for a merkle tree of a set of scores
   * @param _root bytes32
   */
  function enable(
    bytes32 _groupId,
    bytes32 _root
  ) external override multiAdmin {
    if (rootsByGroupId[_groupId] != 0) revert GroupIdExists(_groupId);
    rootsByGroupId[_groupId] = _root;
    emit Enable(_root);
  }

  /**
   * @notice Returns the claim status of a root for a given address
   * @param _address address
   * @param _groupIds bytes32[]
   */
  function hasClaimedGroups(
    address _address,
    bytes32[] calldata _groupIds
  ) external view returns (bool[] memory) {
    bool[] memory claimList = new bool[](_groupIds.length);
    for (uint256 i = 0; i < _groupIds.length; i++) {
      claimList[i] = claimed[rootsByGroupId[_groupIds[i]]][_address];
    }
    return claimList;
  }

  /**
   * @notice Admin function to migrate funds
   * @dev Only owner
   * @param _tokens address[]
   * @param _dest address
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
   * @notice Withdraw tokens from the pool using claims
   * @param _claims Claim[]
   * @param _token address
   */
  function withdraw(Claim[] memory _claims, address _token) external override {
    withdrawProtected(_claims, _token, 0, msg.sender);
  }

  /**
   * @notice Withdraw tokens from the pool using claims and stake
   * @param _claims Claim[]
   * @param _token address
   */
  function withdrawAndStake(
    Claim[] memory _claims,
    address _token,
    uint256 _minimumAmount
  ) external override {
    if (_token != address(stakingToken)) revert TokenInvalid(_token);
    (uint256 amount, bytes32[] memory rootList) = _withdrawCheck(
      _claims,
      _token,
      _minimumAmount
    );
    IStaking(stakingContract).stakeFor(msg.sender, amount);
    emit Withdraw(rootList, msg.sender, _token, amount);
  }

  /**
   * @notice Withdraw tokens from the pool using claims and stake for another account
   * @param _claims Claim[]
   * @param _token address
   * @param _account address
   */
  function withdrawAndStakeFor(
    Claim[] memory _claims,
    address _token,
    uint256 _minimumAmount,
    address _account
  ) external override {
    if (_token != address(stakingToken)) revert TokenInvalid(_token);
    (uint256 amount, bytes32[] memory rootList) = _withdrawCheck(
      _claims,
      _token,
      _minimumAmount
    );
    IERC20(stakingToken).approve(stakingContract, amount);
    IStaking(stakingContract).stakeFor(_account, amount);
    emit Withdraw(rootList, msg.sender, _token, amount);
  }

  /**
   * @notice Withdraw tokens from the pool using claims and send to recipient
   * @param _claims Claim[]
   * @param _token address
   * @param _recipient address
   */
  function withdrawWithRecipient(
    Claim[] memory _claims,
    address _token,
    uint256 _minimumAmount,
    address _recipient
  ) external override {
    withdrawProtected(_claims, _token, _minimumAmount, _recipient);
  }

  /**
   * @notice Withdraw tokens from the pool using claims
   * @param _claims Claim[]
   * @param _token address
   * @param _minimumAmount uint256
   */
  function _withdrawCheck(
    Claim[] memory _claims,
    address _token,
    uint256 _minimumAmount
  ) internal returns (uint256, bytes32[] memory) {
    if (_claims.length <= 0) revert ClaimsNotProvided();
    uint256 _totalScore = 0;
    bytes32[] memory _rootList = new bytes32[](_claims.length);
    Claim memory _claim;
    for (uint256 i = 0; i < _claims.length; i++) {
      _claim = _claims[i];
      if (rootsByGroupId[_claim.groupId]==0)
        revert GroupDisabled(_claim.groupId);
      if (claimed[rootsByGroupId[_claim.groupId]][msg.sender])
        revert AlreadyClaimed();
      if (
        !verify(
          msg.sender,
          rootsByGroupId[_claim.groupId],
          _claim.score,
          _claim.proof
        )
      ) revert ProofInvalid(rootsByGroupId[_claim.groupId]);
      _totalScore = _totalScore + _claim.score;
      claimed[rootsByGroupId[_claim.groupId]][msg.sender] = true;
      _rootList[i] = rootsByGroupId[_claim.groupId];
    }
    uint256 _amount = calculate(_totalScore, _token);
    if (_amount < _minimumAmount) revert AmountInsufficient(_amount);
    return (_amount, _rootList);
  }

  /**
   * @notice Calculate output amount for an input score
   * @param _score uint256
   * @param _token address
   * @return amount uint256 amount to claim based on balance, scale, and max
   */
  function calculate(
    uint256 _score,
    address _token
  ) public view override returns (uint256 amount) {
    uint256 _balance = IERC20(_token).balanceOf(address(this));
    uint256 _divisor = (uint256(10) ** scale) + _score;
    return (max * _score * _balance) / _divisor / 100;
  }

  /**
   * @notice Withdraw tokens from the pool using claims
   * @param _claims Claim[]
   * @param _token address
   * @param _minimumAmount uint256
   * @param _recipient address
   */
  function withdrawProtected(
    Claim[] memory _claims,
    address _token,
    uint256 _minimumAmount,
    address _recipient
  ) public override returns (uint256) {
    (uint256 _amount, bytes32[] memory _rootList) = _withdrawCheck(
      _claims,
      _token,
      _minimumAmount
    );
    IERC20(_token).safeTransfer(_recipient, _amount);
    emit Withdraw(_rootList, msg.sender, _token, _amount);
    return _amount;
  }

  /**
   * @notice Verify a claim proof
   * @param _participant address
   * @param _root bytes32
   * @param _score uint256
   * @param _proof bytes32[]
   */
  function verify(
    address _participant,
    bytes32 _root,
    uint256 _score,
    bytes32[] memory _proof
  ) public pure override returns (bool valid) {
    bytes32 _leaf = keccak256(abi.encodePacked(_participant, _score));
    return MerkleProof.verify(_proof, _root, _leaf);
  }
}
