// SPDX-License-Identifier: MIT

/* solhint-disable var-name-mixedcase */
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/ILight.sol";

/**
 * @title AirSwap Light: Atomic Swap between Tokens
 * @notice https://www.airswap.io/
 */
contract Light is ILight, Ownable {
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

  bytes32 public constant LIGHT_ORDER_TYPEHASH =
    keccak256(
      abi.encodePacked(
        "LightOrder(",
        "uint256 nonce,",
        "uint256 expiry,",
        "address signerWallet,",
        "address signerToken,",
        "uint256 signerAmount,",
        "uint256 signerFee,",
        "address senderWallet,",
        "address senderToken,",
        "uint256 senderAmount",
        ")"
      )
    );

  bytes32 public constant DOMAIN_NAME = keccak256("SWAP_LIGHT");
  bytes32 public constant DOMAIN_VERSION = keccak256("3");
  uint256 public immutable DOMAIN_CHAIN_ID;
  bytes32 public immutable DOMAIN_SEPARATOR;

  uint256 public constant FEE_DIVISOR = 10000;
  uint256 public signerFee;
  uint256 public conditionalSignerFee;

  /**
   * @notice Double mapping of signers to nonce groups to nonce states
   * @dev The nonce group is computed as nonce / 256, so each group of 256 sequential nonces uses the same key
   * @dev The nonce states are encoded as 256 bits, for each nonce in the group 0 means available and 1 means used
   */
  mapping(address => mapping(uint256 => uint256)) internal _nonceGroups;

  mapping(address => address) public override authorized;

  address public feeWallet;
  uint256 public stakingRebateMinimum;
  address public stakingToken;

  constructor(
    address _feeWallet,
    uint256 _signerFee,
    uint256 _conditionalSignerFee,
    uint256 _stakingRebateMinimum,
    address _stakingToken
  ) {
    // Ensure the fee wallet is not null
    require(_feeWallet != address(0), "INVALID_FEE_WALLET");
    // Ensure the fee is less than divisor
    require(_signerFee < FEE_DIVISOR, "INVALID_FEE");
    // Ensure the conditional fee is less than divisor
    require(_conditionalSignerFee < FEE_DIVISOR, "INVALID_CONDITIONAL_FEE");
    // Ensure the staking token is not null
    require(_stakingToken != address(0), "INVALID_STAKING_TOKEN");

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

    feeWallet = _feeWallet;
    signerFee = _signerFee;
    conditionalSignerFee = _conditionalSignerFee;
    stakingRebateMinimum = _stakingRebateMinimum;
    stakingToken = _stakingToken;
  }

  /**
   * @notice Atomic ERC20 Swap
   * @param nonce uint256 Unique and should be sequential
   * @param expiry uint256 Expiry in seconds since 1 January 1970
   * @param signerWallet address Wallet of the signer
   * @param signerToken address ERC20 token transferred from the signer
   * @param signerAmount uint256 Amount transferred from the signer
   * @param senderToken address ERC20 token transferred from the sender
   * @param senderAmount uint256 Amount transferred from the sender
   * @param v uint8 "v" value of the ECDSA signature
   * @param r bytes32 "r" value of the ECDSA signature
   * @param s bytes32 "s" value of the ECDSA signature
   */
  function swap(
    uint256 nonce,
    uint256 expiry,
    address signerWallet,
    address signerToken,
    uint256 signerAmount,
    address senderToken,
    uint256 senderAmount,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external override {
    swapWithRecipient(
      msg.sender,
      nonce,
      expiry,
      signerWallet,
      signerToken,
      signerAmount,
      senderToken,
      senderAmount,
      v,
      r,
      s
    );
  }

  /**
   * @notice Set the fee wallet
   * @param newFeeWallet address Wallet to transfer signerFee to
   */
  function setFeeWallet(address newFeeWallet) external onlyOwner {
    // Ensure the new fee wallet is not null
    require(newFeeWallet != address(0), "INVALID_FEE_WALLET");
    feeWallet = newFeeWallet;
    emit SetFeeWallet(newFeeWallet);
  }

  /**
   * @notice Set the fee
   * @param newSignerFee uint256 Value of the fee in basis points
   */
  function setFee(uint256 newSignerFee) external onlyOwner {
    // Ensure the fee is less than divisor
    require(newSignerFee < FEE_DIVISOR, "INVALID_FEE");
    signerFee = newSignerFee;
    emit SetFee(newSignerFee);
  }

  /**
   * @notice Set the conditional fee
   * @param newConditionalSignerFee uint256 Value of the fee in basis points
   */
  function setConditionalFee(uint256 newConditionalSignerFee)
    external
    onlyOwner
  {
    // Ensure the fee is less than divisor
    require(newConditionalSignerFee < FEE_DIVISOR, "INVALID_FEE");
    conditionalSignerFee = newConditionalSignerFee;
    emit SetConditionalFee(conditionalSignerFee);
  }

  /**
   * @notice Set the staking token
   * @param newStakingToken address Token to check balances on
   */
  function setStakingToken(address newStakingToken) external onlyOwner {
    // Ensure the new staking token is not null
    require(newStakingToken != address(0), "INVALID_FEE_WALLET");
    stakingToken = newStakingToken;
    emit SetStakingToken(newStakingToken);
  }

  /**
   * @notice Authorize a signer
   * @param signer address Wallet of the signer to authorize
   * @dev Emits an Authorize event
   */
  function authorize(address signer) external override {
    authorized[msg.sender] = signer;
    emit Authorize(signer, msg.sender);
  }

  /**
   * @notice Revoke authorization of a signer
   * @dev Emits a Revoke event
   */
  function revoke() external override {
    address tmp = authorized[msg.sender];
    delete authorized[msg.sender];
    emit Revoke(tmp, msg.sender);
  }

  /**
   * @notice Cancel one or more nonces
   * @dev Cancelled nonces are marked as used
   * @dev Emits a Cancel event
   * @dev Out of gas may occur in arrays of length > 400
   * @param nonces uint256[] List of nonces to cancel
   */
  function cancel(uint256[] calldata nonces) external override {
    for (uint256 i = 0; i < nonces.length; i++) {
      uint256 nonce = nonces[i];
      if (_markNonceAsUsed(msg.sender, nonce)) {
        emit Cancel(nonce, msg.sender);
      }
    }
  }

  /**
   * @notice Atomic ERC20 Swap with Recipient
   * @param recipient Wallet of the recipient
   * @param nonce uint256 Unique and should be sequential
   * @param expiry uint256 Expiry in seconds since 1 January 1970
   * @param signerWallet address Wallet of the signer
   * @param signerToken address ERC20 token transferred from the signer
   * @param signerAmount uint256 Amount transferred from the signer
   * @param senderToken address ERC20 token transferred from the sender
   * @param senderAmount uint256 Amount transferred from the sender
   * @param v uint8 "v" value of the ECDSA signature
   * @param r bytes32 "r" value of the ECDSA signature
   * @param s bytes32 "s" value of the ECDSA signature
   */
  function swapWithRecipient(
    address recipient,
    uint256 nonce,
    uint256 expiry,
    address signerWallet,
    address signerToken,
    uint256 signerAmount,
    address senderToken,
    uint256 senderAmount,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) public override {
    _checkValidOrder(
      nonce,
      expiry,
      signerWallet,
      signerToken,
      signerAmount,
      senderToken,
      senderAmount,
      v,
      r,
      s
    );

    // Transfer token from sender to signer
    IERC20(senderToken).safeTransferFrom(
      msg.sender,
      signerWallet,
      senderAmount
    );

    // Transfer token from signer to recipient
    IERC20(signerToken).safeTransferFrom(signerWallet, recipient, signerAmount);

    // Transfer fee from signer to feeWallet
    uint256 feeAmount = signerAmount.mul(signerFee).div(FEE_DIVISOR);
    if (feeAmount > 0) {
      IERC20(signerToken).safeTransferFrom(signerWallet, feeWallet, feeAmount);
    }

    // Emit a Swap event
    emit Swap(
      nonce,
      block.timestamp,
      signerWallet,
      signerToken,
      signerAmount,
      signerFee,
      msg.sender,
      senderToken,
      senderAmount
    );
  }

  /**
   * @notice Atomic ERC20 Swap with Rebate for Stakers
   * @param nonce uint256 Unique and should be sequential
   * @param expiry uint256 Expiry in seconds since 1 January 1970
   * @param signerWallet address Wallet of the signer
   * @param signerToken address ERC20 token transferred from the signer
   * @param signerAmount uint256 Amount transferred from the signer
   * @param senderToken address ERC20 token transferred from the sender
   * @param senderAmount uint256 Amount transferred from the sender
   * @param v uint8 "v" value of the ECDSA signature
   * @param r bytes32 "r" value of the ECDSA signature
   * @param s bytes32 "s" value of the ECDSA signature
   */
  function swapWithConditionalFee(
    uint256 nonce,
    uint256 expiry,
    address signerWallet,
    address signerToken,
    uint256 signerAmount,
    address senderToken,
    uint256 senderAmount,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) public override {
    _checkValidOrder(
      nonce,
      expiry,
      signerWallet,
      signerToken,
      signerAmount,
      senderToken,
      senderAmount,
      v,
      r,
      s
    );

    // Transfer token from sender to signer
    IERC20(senderToken).safeTransferFrom(
      msg.sender,
      signerWallet,
      senderAmount
    );

    // Transfer token from signer to recipient
    IERC20(signerToken).safeTransferFrom(
      signerWallet,
      msg.sender,
      signerAmount
    );

    // Transfer fee from signer
    uint256 feeAmount = signerAmount.mul(conditionalSignerFee).div(FEE_DIVISOR);
    if (feeAmount > 0) {
      // Check sender staking balance for rebate
      if (IERC20(stakingToken).balanceOf(msg.sender) >= stakingRebateMinimum) {
        // Transfer fee from signer to sender
        IERC20(signerToken).safeTransferFrom(
          signerWallet,
          msg.sender,
          feeAmount
        );
      } else {
        // Transfer fee from signer to feeWallet
        IERC20(signerToken).safeTransferFrom(
          signerWallet,
          feeWallet,
          feeAmount
        );
      }
    }

    // Emit a Swap event
    emit Swap(
      nonce,
      block.timestamp,
      signerWallet,
      signerToken,
      signerAmount,
      signerFee,
      msg.sender,
      senderToken,
      senderAmount
    );
  }

  /**
   * @notice Returns true if the nonce has been used
   * @param signer address Address of the signer
   * @param nonce uint256 Nonce being checked
   */
  function nonceUsed(address signer, uint256 nonce)
    public
    view
    override
    returns (bool)
  {
    uint256 groupKey = nonce / 256;
    uint256 indexInGroup = nonce % 256;
    return (_nonceGroups[signer][groupKey] >> indexInGroup) & 1 == 1;
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
   * @notice Marks a nonce as used for the given signer
   * @param signer address Address of the signer for which to mark the nonce as used
   * @param nonce uint256 Nonce to be marked as used
   * @return bool True if the nonce was not marked as used already
   */
  function _markNonceAsUsed(address signer, uint256 nonce)
    internal
    returns (bool)
  {
    uint256 groupKey = nonce / 256;
    uint256 indexInGroup = nonce % 256;
    uint256 group = _nonceGroups[signer][groupKey];

    // If it is already used, return false
    if ((group >> indexInGroup) & 1 == 1) {
      return false;
    }

    _nonceGroups[signer][groupKey] = group | (uint256(1) << indexInGroup);

    return true;
  }

  /**
   * @notice Checks Order Expiry, Nonce, Signature
   * @param nonce uint256 Unique and should be sequential
   * @param expiry uint256 Expiry in seconds since 1 January 1970
   * @param signerWallet address Wallet of the signer
   * @param signerToken address ERC20 token transferred from the signer
   * @param signerAmount uint256 Amount transferred from the signer
   * @param senderToken address ERC20 token transferred from the sender
   * @param senderAmount uint256 Amount transferred from the sender
   * @param v uint8 "v" value of the ECDSA signature
   * @param r bytes32 "r" value of the ECDSA signature
   * @param s bytes32 "s" value of the ECDSA signature
   */
  function _checkValidOrder(
    uint256 nonce,
    uint256 expiry,
    address signerWallet,
    address signerToken,
    uint256 signerAmount,
    address senderToken,
    uint256 senderAmount,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) internal {
    require(DOMAIN_CHAIN_ID == getChainId(), "CHAIN_ID_CHANGED");

    // Ensure the expiry is not passed
    require(expiry > block.timestamp, "EXPIRY_PASSED");

    bytes32 hashed = _getOrderHash(
      nonce,
      expiry,
      signerWallet,
      signerToken,
      signerAmount,
      msg.sender,
      senderToken,
      senderAmount
    );

    // Recover the signatory from the hash and signature
    address signatory = _getSignatory(hashed, v, r, s);

    // Ensure the nonce is not yet used and if not mark it used
    require(_markNonceAsUsed(signatory, nonce), "NONCE_ALREADY_USED");

    // Ensure the signatory is authorized by the signer wallet
    if (signerWallet != signatory) {
      require(authorized[signerWallet] == signatory, "UNAUTHORIZED");
    }
  }

  /**
   * @notice Hash order parameters
   * @param nonce uint256
   * @param expiry uint256
   * @param signerWallet address
   * @param signerToken address
   * @param signerAmount uint256
   * @param senderToken address
   * @param senderAmount uint256
   * @return bytes32
   */
  function _getOrderHash(
    uint256 nonce,
    uint256 expiry,
    address signerWallet,
    address signerToken,
    uint256 signerAmount,
    address senderWallet,
    address senderToken,
    uint256 senderAmount
  ) internal view returns (bytes32) {
    return
      keccak256(
        abi.encode(
          LIGHT_ORDER_TYPEHASH,
          nonce,
          expiry,
          signerWallet,
          signerToken,
          signerAmount,
          signerFee,
          senderWallet,
          senderToken,
          senderAmount
        )
      );
  }

  /**
   * @notice Recover the signatory from a signature
   * @param hash bytes32
   * @param v uint8
   * @param r bytes32
   * @param s bytes32
   */
  function _getSignatory(
    bytes32 hash,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) internal view returns (address) {
    bytes32 digest = keccak256(
      abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, hash)
    );
    address signatory = ecrecover(digest, v, r, s);
    // Ensure the signatory is not null
    require(signatory != address(0), "INVALID_SIG");
    return signatory;
  }
}
