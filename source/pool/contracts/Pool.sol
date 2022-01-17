// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@airswap/staking/contracts/interfaces/IStaking.sol";
import "./interfaces/IPool.sol";

/**
 * @title AirSwap Pool: Claim Tokens
 * @notice https://www.airswap.io/
 */
contract Pool is IPool, Ownable {
  using SafeERC20 for IERC20;
  using SafeMath for uint256;

  bytes32 public constant DOMAIN_TYPEHASH =
    keccak256(
      abi.encodePacked(
        "EIP712Domain(",
        "string name,",
        "string version,",
        "uint256 chainId,",
        "address verifyingContract",
        ")"
      )
    );

  bytes32 public constant CLAIM_TYPEHASH =
    keccak256(
      abi.encodePacked(
        "Claim(",
        "uint256 nonce,",
        "address participant,",
        "uint256 score",
        ")"
      )
    );

  bytes32 public constant DOMAIN_NAME = keccak256("POOL");
  bytes32 public constant DOMAIN_VERSION = keccak256("1");
  uint256 public immutable DOMAIN_CHAIN_ID;
  bytes32 public immutable DOMAIN_SEPARATOR;

  uint256 internal constant MAX_PERCENTAGE = 100;
  uint256 internal constant MAX_SCALE = 77;

  // Larger the scale, lower the output for a claim
  uint256 public scale;

  // Max percentage for a claim with infinite score
  uint256 public max;

  // Mapping of address to boolean to enable admin accounts
  mapping(address => bool) public admins;

  // Mapping of participant addresses to nonces to boolean to mark as claimed
  mapping(address => mapping(uint256 => bool)) public noncesClaimed;

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

    uint256 currentChainId = getChainId();
    DOMAIN_CHAIN_ID = currentChainId;
    DOMAIN_SEPARATOR = keccak256(
      abi.encode(
        DOMAIN_TYPEHASH,
        DOMAIN_NAME,
        DOMAIN_VERSION,
        currentChainId,
        this
      )
    );

    IERC20(stakingToken).approve(stakingContract, 2**256 - 1);
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
   * @param token address
   * @param nonce uint256
   * @param score uint256
   * @param v uint8 "v" value of the ECDSA signature
   * @param r bytes32 "r" value of the ECDSA signature
   * @param s bytes32 "s" value of the ECDSA signature
   */
  function withdraw(
    address token,
    uint256 nonce,
    uint256 score,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external override {
    withdrawProtected(0, msg.sender, token, nonce, msg.sender, score, v, r, s);
  }

  /**
   * @notice Withdraw tokens from the pool using claims and send to recipient
   * @param minimumAmount uint256
   * @param token address
   * @param recipient address
   * @param nonce uint256
   * @param score uint256
   * @param v uint8 "v" value of the ECDSA signature
   * @param r bytes32 "r" value of the ECDSA signature
   * @param s bytes32 "s" value of the ECDSA signature
   */
  function withdrawWithRecipient(
    uint256 minimumAmount,
    address token,
    address recipient,
    uint256 nonce,
    uint256 score,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external override {
    withdrawProtected(
      minimumAmount,
      recipient,
      token,
      nonce,
      msg.sender,
      score,
      v,
      r,
      s
    );
  }

  /**
   * @notice Withdraw tokens from the pool using claims and stake
   * @param minimumAmount uint256
   * @param token address
   * @param nonce uint256
   * @param score uint256
   * @param v uint8 "v" value of the ECDSA signature
   * @param r bytes32 "r" value of the ECDSA signature
   * @param s bytes32 "s" value of the ECDSA signature
   */
  function withdrawAndStake(
    uint256 minimumAmount,
    address token,
    uint256 nonce,
    uint256 score,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external override {
    require(token == address(stakingToken), "INVALID_TOKEN");
    _checkValidClaim(nonce, msg.sender, score, v, r, s);
    uint256 amount = _withdrawCheck(score, token, minimumAmount);
    IStaking(stakingContract).stakeFor(msg.sender, amount);
    emit Withdraw(nonce, msg.sender, token, amount);
  }

  /**
   * @notice Withdraw tokens from the pool using signature and stake for another account
   * @param minimumAmount uint256
   * @param token address
   * @param account address
   * @param nonce uint256
   * @param score uint256
   * @param v uint8 "v" value of the ECDSA signature
   * @param r bytes32 "r" value of the ECDSA signature
   * @param s bytes32 "s" value of the ECDSA signature
   */
  function withdrawAndStakeFor(
    uint256 minimumAmount,
    address token,
    address account,
    uint256 nonce,
    uint256 score,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external override {
    require(token == address(stakingToken), "INVALID_TOKEN");
    _checkValidClaim(nonce, msg.sender, score, v, r, s);
    uint256 amount = _withdrawCheck(score, token, minimumAmount);
    IERC20(stakingToken).approve(stakingContract, amount);
    IStaking(stakingContract).stakeFor(account, amount);
    emit Withdraw(nonce, msg.sender, token, amount);
  }

  /**
   * @notice Withdraw tokens from the pool using claims
   * @param minimumAmount uint256
   * @param token address
   * @param participant address
   * @param nonce uint256
   * @param score uint256
   * @param v uint8 "v" value of the ECDSA signature
   * @param r bytes32 "r" value of the ECDSA signature
   * @param s bytes32 "s" value of the ECDSA signature
   */
  function withdrawProtected(
    uint256 minimumAmount,
    address recipient,
    address token,
    uint256 nonce,
    address participant,
    uint256 score,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) public override returns (uint256) {
    _checkValidClaim(nonce, participant, score, v, r, s);
    uint256 amount = _withdrawCheck(score, token, minimumAmount);
    IERC20(token).safeTransfer(recipient, amount);
    emit Withdraw(nonce, participant, token, amount);
    return amount;
  }

  /**
   * @notice Calculate output amount for an input score
   * @param score uint256
   * @param token address
   * @return amount uint256 amount to claim based on balance, scale, and max
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
   * @notice Verify a signature
   * @param nonce uint256
   * @param participant address
   * @param score uint256
   * @param v uint8 "v" value of the ECDSA signature
   * @param r bytes32 "r" value of the ECDSA signature
   * @param s bytes32 "s" value of the ECDSA signature
   */
  function verify(
    uint256 nonce,
    address participant,
    uint256 score,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) public view override returns (bool valid) {
    require(DOMAIN_CHAIN_ID == getChainId(), "CHAIN_ID_CHANGED");
    bytes32 claimHash = keccak256(
      abi.encode(CLAIM_TYPEHASH, nonce, participant, score)
    );
    address signatory = ecrecover(
      keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, claimHash)),
      v,
      r,
      s
    );
    admins[signatory] && !noncesClaimed[participant][nonce]
      ? valid = true
      : valid = false;
  }

  /**
   * @notice Returns the current chainId using the chainid opcode
   * @return id uint256 The chain id
   */
  function getChainId() public view returns (uint256 id) {
    // no-inline-assembly
    assembly {
      id := chainid()
    }
  }

  /**
   * @notice Checks Claim Nonce, Participant, Score, Signature
   * @param nonce uint256
   * @param participant address
   * @param score uint256
   * @param v uint8 "v" value of the ECDSA signature
   * @param r bytes32 "r" value of the ECDSA signature
   * @param s bytes32 "s" value of the ECDSA signature
   */
  function _checkValidClaim(
    uint256 nonce,
    address participant,
    uint256 score,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) internal {
    require(DOMAIN_CHAIN_ID == getChainId(), "CHAIN_ID_CHANGED");
    bytes32 claimHash = keccak256(
      abi.encode(CLAIM_TYPEHASH, nonce, participant, score)
    );
    address signatory = ecrecover(
      keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, claimHash)),
      v,
      r,
      s
    );
    require(admins[signatory], "UNAUTHORIZED");
    require(_markNonceAsUsed(participant, nonce), "NONCE_ALREADY_USED");
  }

  /**
   * @notice Marks a nonce as used for the given participant
   * @param participant address
   * @param nonce uint256
   * @return bool True if nonce was not marked as used already
   */
  function _markNonceAsUsed(address participant, uint256 nonce)
    internal
    returns (bool)
  {
    // If it is already used, return false
    if (noncesClaimed[participant][nonce]) {
      return false;
    }
    return noncesClaimed[participant][nonce] = true;
  }

  /**
   * @notice Withdraw tokens from the pool using a score
   * @param score uint256
   * @param token address
   * @param minimumAmount uint256
   */
  function _withdrawCheck(
    uint256 score,
    address token,
    uint256 minimumAmount
  ) internal view returns (uint256) {
    require(score > 0, "SCORE_MUST_BE_PROVIDED");
    uint256 amount = calculate(score, token);
    require(amount >= minimumAmount, "INSUFFICIENT_AMOUNT");
    return amount;
  }
}
