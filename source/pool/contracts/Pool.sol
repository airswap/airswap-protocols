// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import "@airswap/staking/contracts/interfaces/IStaking.sol";
import "./interfaces/IPool.sol";

/**
 * @title AirSwap Pool: Claim Tokens
 * @notice https://www.airswap.io/
 */
contract Pool is IPool, Ownable {
  using SafeERC20 for IERC20;
  using SafeMath for uint256;

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

  // Mapping of signed hash to boolean to mark as claimed
  mapping(bytes32 => bool) public hashClaimed;

  // Staking contract address
  address public stakingContract;

  // Staking token address
  address public stakingToken;

  /**
   * @notice Constructor
   * @param _scale uint256
   * @param _max uint256
   * @param _stakingContract address
   * @param _stakingToken address
   */
  constructor(
    uint256 _scale,
    uint256 _max,
    address _stakingContract,
    address _stakingToken
  ) {
    require(_max <= MAX_PERCENTAGE, "MAX_TOO_HIGH");
    require(_scale <= MAX_SCALE, "SCALE_TOO_HIGH");
    scale = _scale;
    max = _max;
    stakingContract = _stakingContract;
    stakingToken = _stakingToken;
    admins[msg.sender] = true;
    IERC20(stakingToken).approve(stakingContract, 2**256 - 1);
  }

  /**
   * @dev Throws if called by any account other than the admin.
   */
  modifier multiAdmin() {
    require(admins[msg.sender] == true, "NOT_ADMIN");
    _;
  }

  /**
   * @notice Set scale
   * @dev Only owner
   * @param _scale uint256
   */
  function setScale(uint256 _scale) external override onlyOwner {
    require(_scale <= MAX_SCALE, "SCALE_TOO_HIGH");
    scale = _scale;
    emit SetScale(scale);
  }

  /**
   * @notice Set max
   * @dev Only owner
   * @param _max uint256
   */
  function setMax(uint256 _max) external override onlyOwner {
    require(_max <= MAX_PERCENTAGE, "MAX_TOO_HIGH");
    max = _max;
    emit SetMax(max);
  }

  /**
   * @notice Add admin address
   * @dev Only owner
   * @param _admin address
   */
  function addAdmin(address _admin) external override onlyOwner {
    require(_admin != address(0), "INVALID_ADDRESS");
    admins[_admin] = true;
  }

  /**
   * @notice Remove admin address
   * @dev Only owner
   * @param _admin address
   */
  function removeAdmin(address _admin) external override onlyOwner {
    require(admins[_admin] == true, "ADMIN_NOT_SET");
    admins[_admin] = false;
  }

  /**
   * @notice Set staking contract address
   * @dev Only owner
   * @param _stakingContract address
   */
  function setStakingContract(address _stakingContract)
    external
    override
    onlyOwner
  {
    require(_stakingContract != address(0), "INVALID_ADDRESS");
    stakingContract = _stakingContract;
    IERC20(stakingToken).approve(stakingContract, 2**256 - 1);
  }

  /**
   * @notice Set staking token address
   * @dev Only owner
   * @param _stakingToken address
   */
  function setStakingToken(address _stakingToken) external override onlyOwner {
    require(_stakingToken != address(0), "INVALID_ADDRESS");
    stakingToken = _stakingToken;
    IERC20(stakingToken).approve(stakingContract, 2**256 - 1);
  }

  /**
   * @notice Set claims from previous pool contract
   * @dev Only owner
   * @param root bytes32
   * @param accounts address[]
   */
  function setClaimed(bytes32 root, address[] memory accounts)
    external
    override
    multiAdmin
  {
    if (roots[root] == false) {
      roots[root] = true;
    }
    for (uint256 i = 0; i < accounts.length; i++) {
      address account = accounts[i];
      require(!claimed[root][account], "CLAIM_ALREADY_MADE");
      claimed[root][account] = true;
    }
    emit Enable(root);
  }

  /**
   * @notice Enables claims for a merkle tree of a set of scores
   * @param root bytes32
   */
  function enable(bytes32 root) external override multiAdmin {
    require(roots[root] == false, "ROOT_EXISTS");
    roots[root] = true;
    emit Enable(root);
  }

  /**
   * @notice Admin function to migrate funds
   * @dev Only owner
   * @param tokens address[]
   * @param dest address
   */
  function drainTo(address[] calldata tokens, address dest)
    external
    override
    onlyOwner
  {
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
   * @notice Withdraw tokens from the pool using claims and stake
   * @param claims Claim[]
   * @param token address
   */
  function withdrawAndStake(
    Claim[] memory claims,
    address token,
    uint256 minimumAmount
  ) external override {
    require(token == address(stakingToken), "INVALID_TOKEN");
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
    require(token == address(stakingToken), "INVALID_TOKEN");
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
    require(claims.length > 0, "CLAIMS_MUST_BE_PROVIDED");
    uint256 totalScore = 0;
    bytes32[] memory rootList = new bytes32[](claims.length);
    Claim memory claim;
    for (uint256 i = 0; i < claims.length; i++) {
      claim = claims[i];
      require(roots[claim.root], "ROOT_NOT_ENABLED");
      require(!claimed[claim.root][msg.sender], "CLAIM_ALREADY_MADE");
      require(
        verify(msg.sender, claim.root, claim.score, claim.proof),
        "PROOF_INVALID"
      );
      totalScore = totalScore.add(claim.score);
      claimed[claim.root][msg.sender] = true;
      rootList[i] = claim.root;
    }
    uint256 amount = calculate(totalScore, token);
    require(amount >= minimumAmount, "INSUFFICIENT_AMOUNT");
    return (amount, rootList);
  }

  /**
   * @notice Calculate output amount for an input score
   * @param score uint256
   * @param token address
   */
  function calculate(uint256 score, address token)
    public
    view
    override
    returns (uint256 amount)
  {
    uint256 balance = IERC20(token).balanceOf(address(this));
    uint256 divisor = (uint256(10)**scale).add(score);
    return max.mul(score).mul(balance).div(divisor).div(100);
  }

  /**
   * @notice Calculate output amount for an input score
   * @param score uint256
   * @param tokens address[]
   */
  function calculateMultiple(uint256 score, address[] calldata tokens)
    public
    view
    override
    returns (uint256[] memory outputAmounts)
  {
    outputAmounts = new uint256[](tokens.length);
    for (uint256 i = 0; i < tokens.length; i++) {
      uint256 output = calculate(score, tokens[i]);
      outputAmounts[i] = output;
    }
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

/** @notice withdraw function that uses signature instead of claim
  * @param ethSignedMessageHash is a hash of signer's signature, token address, minimumAmount and recipient
  * @param token address
  * @param minimumAmount uint256
  * @param recipient address
  */
  function withdrawWithSignature(
    bytes32 ethSignedMessageHash,
    address token,
    uint256 minimumAmount,
    address recipient
  ) external returns (bool) {
    // verify address
    require(admins[msg.sender], "NOT_ADMIN");
    // verify signed hash has not been claimed
    require(!hashClaimed[ethSignedMessageHash], "CLAIM_ALREADY_MADE");
    // to verify hash
    require(
      ethSignedMessageHash == getEthSignedMessageHash
    (
      token, 
      amount, 
      recipient
    ), "SIGNED_HASH_NOT_VERIFIED");
    
    IERC20(token).safeTransfer(recipient, amount);
    // mark signed hash as claimed
    hashClaimed[ethSignedMessageHash] = true;
    emit WithdrawWithSignature(msg.sender, token, amount, recipient);
    return true;
  }

/** @notice return signed message hash using Openzeppelin's ECDSA library
  * @param token address
  * @param minimumAmount uint256
  * @param recipient address
  */
  function getEthSignedMessageHash(
    address token,
    uint256 amount,
    address recipient
  ) internal pure returns (bytes32) {
    bytes32 messageHash = keccak256(abi.encodePacked(token, amount, recipient));
    return ECDSA.toEthSignedMessageHash(messageHash);
  }