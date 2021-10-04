// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title AirSwap Pool: Claim Tokens Based on an Output Function
 * @notice https://www.airswap.io/
 */
contract Pool is Ownable {
  using SafeERC20 for IERC20;
  using SafeMath for uint256;

  /**
   * @notice Structs
   */
  struct Claim {
    bytes32 root;
    uint256 score;
    bytes32[] proof;
  }

  uint256 internal constant MAX_PERCENTAGE = 100;
  uint256 internal constant MAX_SCALE = 77;

  // Larger the scale, lower the output for a claim
  uint256 public scale;

  // Max percentage for a claim with infinite score
  uint256 public max;

  // Mapping of tree root to boolean to enable claims
  mapping(bytes32 => bool) public roots;

  // Mapping of tree root to account to mark as claimed
  mapping(bytes32 => mapping(address => bool)) public claimed;

  // Staking contract address
  address public stakingContract;

  // Staking token address
  address public stakingToken;

  /**
   * @notice Events
   */
  event Enable(bytes32 root);
  event Withdraw(
    bytes32[] roots,
    address account,
    IERC20 token,
    uint256 amount
  );
  event SetScale(uint256 scale);
  event SetMax(uint256 max);
  event DrainTo(IERC20[] tokens, address dest);

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
  }

  /**
   * @notice Set scale
   * @dev Only owner
   * @param _scale uint256
   */
  function setScale(uint256 _scale) external onlyOwner {
    require(_scale <= MAX_SCALE, "SCALE_TOO_HIGH");
    scale = _scale;
    emit SetScale(scale);
  }

  /**
   * @notice Set max
   * @dev Only owner
   * @param _max uint256
   */
  function setMax(uint256 _max) external onlyOwner {
    require(_max <= MAX_PERCENTAGE, "MAX_TOO_HIGH");
    max = _max;
    emit SetMax(max);
  }

  /**
   * @notice Set staking contract address
   * @dev Only owner
   * @param _stakingContract address
   */
  function setStakingContract(address _stakingContract) external onlyOwner {
    require(_stakingContract != address(0), "INVALID_ADDRESS");
    stakingContract = _stakingContract;
  }

  /**
   * @notice Set staking token address
   * @dev Only owner
   * @param _stakingToken address
   */
  function setStakingToken(address _stakingToken) external onlyOwner {
    require(_stakingToken != address(0), "INVALID_ADDRESS");
    stakingToken = _stakingToken;
  }

  /**
   * @notice Set claims from previous pool contract
   * @dev Only owner
   * @param root bytes32
   * @param accounts address[]
   */
  function setClaimed(bytes32 root, address[] memory accounts)
    external
    onlyOwner
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
  function enable(bytes32 root) external onlyOwner {
    require(roots[root] == false, "ROOT_EXISTS");
    roots[root] = true;
    emit Enable(root);
  }

  /**
   * @notice Admin function to migrate funds
   * @dev Only owner
   * @param tokens IERC20[]
   * @param dest address
   */
  function drainTo(IERC20[] calldata tokens, address dest) external onlyOwner {
    for (uint256 i = 0; i < tokens.length; i++) {
      uint256 bal = tokens[i].balanceOf(address(this));
      tokens[i].safeTransfer(dest, bal);
    }
    emit DrainTo(tokens, dest);
  }

  /**
   * @notice Withdraw tokens from the pool using claims
   * @param claims Claim[]
   * @param token IERC20
   */
  function withdraw(
    Claim[] memory claims,
    IERC20 token
  ) external {
    withdrawProtected(claims, token, 0, msg.sender);
  }

  /**
   * @notice Withdraw tokens from the pool using claims and send to recipient
   * @param claims Claim[]
   * @param token IERC20
   * @param recipient address
   */
  function withdrawWithRecipient(
    Claim[] memory claims,
    IERC20 token,
    uint256 minimumAmount,
    address recipient
  ) external {
    withdrawProtected(claims, token, minimumAmount, recipient);
  }

  /**
   * @notice Withdraw tokens from the pool using claims and stake
   * @param claims Claim[]
   * @param token IERC20
   */
  function withdrawAndStake(
    Claim[] memory claims,
    IERC20 token,
    uint256 minimumAmount
  ) external {
    require(token == IERC20(stakingToken), "INVALID_TOKEN");
    uint256 amount = withdrawProtected(
      claims,
      token,
      minimumAmount,
      msg.sender
    );
    (bool success, ) = address(stakingContract).call(
      abi.encodeWithSignature("stakeFor(address,uint256)", msg.sender, amount)
    );
    require(success, "ERROR_STAKING");
  }

  /**
   * @notice Withdraw tokens from the pool using claims and stake for another account
   * @param claims Claim[]
   * @param token IERC20
   * @param account address
   */
  function withdrawAndStakeFor(
    Claim[] memory claims,
    IERC20 token,
    uint256 minimumAmount,
    address account
  ) external {
    require(token == IERC20(stakingToken), "INVALID_TOKEN");
    uint256 amount = withdrawProtected(
      claims,
      token,
      minimumAmount,
      msg.sender
    );
    (bool success, ) = address(stakingContract).call(
      abi.encodeWithSignature("stakeFor(address,uint256)", account, amount)
    );
    require(success, "ERROR_STAKING");
  }

  /**
   * @notice Withdraw tokens from the pool using claims
   * @param claims Claim[]
   * @param token IERC20
   * @param minimumAmount uint256
   * @param recipient address
   */
  function withdrawProtected(
    Claim[] memory claims,
    IERC20 token,
    uint256 minimumAmount,
    address recipient
  ) public returns (uint256) {
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
    token.safeTransfer(recipient, amount);
    emit Withdraw(rootList, msg.sender, token, amount);
    return amount;
  }

  /**
   * @notice Calculate output amount for an input score
   * @param score uint256
   * @param token IERC20
   */
  function calculate(uint256 score, IERC20 token)
    public
    view
    returns (uint256 amount)
  {
    uint256 balance = token.balanceOf(address(this));
    uint256 divisor = (uint256(10)**scale).add(score);
    return max.mul(score).mul(balance).div(divisor).div(100);
  }

  /**
   * @notice Calculate output amount for an input score
   * @param score uint256
   * @param tokens IERC20[]
   */
  function calculateMultiple(uint256 score, IERC20[] calldata tokens)
    public
    view
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
  ) public pure returns (bool valid) {
    bytes32 leaf = keccak256(abi.encodePacked(participant, score));
    return MerkleProof.verify(proof, root, leaf);
  }
}
