// SPDX-License-Identifier: MIT

/* solhint-disable var-name-mixedcase */
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./interfaces/ISwap.sol";

/**
 * @title AirSwap: Atomic Token Swap
 * @notice https://www.airswap.io/
 */
contract Swap is ISwap, Ownable {
  using SafeERC20 for IERC20;

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

  bytes32 public constant ORDER_TYPEHASH =
    keccak256(
      abi.encodePacked(
        "Order(",
        "uint256 nonce,",
        "uint256 expiry,",
        "address signerWallet,",
        "address signerToken,",
        "uint256 signerAmount,",
        "uint256 protocolFee,",
        "address senderWallet,",
        "address senderToken,",
        "uint256 senderAmount",
        ")"
      )
    );

  bytes32 public constant DOMAIN_NAME = keccak256("SWAP");
  bytes32 public constant DOMAIN_VERSION = keccak256("3");
  uint256 public immutable DOMAIN_CHAIN_ID;
  bytes32 public immutable DOMAIN_SEPARATOR;

  uint256 internal constant MAX_PERCENTAGE = 100;
  uint256 internal constant MAX_SCALE = 77;
  uint256 internal constant MAX_ERROR_COUNT = 6;
  uint256 public constant FEE_DIVISOR = 10000;

  /**
   * @notice Double mapping of signers to nonce groups to nonce states
   * @dev The nonce group is computed as nonce / 256, so each group of 256 sequential nonces uses the same key
   * @dev The nonce states are encoded as 256 bits, for each nonce in the group 0 means available and 1 means used
   */
  mapping(address => mapping(uint256 => uint256)) internal _nonceGroups;

  mapping(address => address) public override authorized;

  uint256 public protocolFee;
  uint256 public protocolFeeLight;
  address public protocolFeeWallet;
  uint256 public rebateScale;
  uint256 public rebateMax;
  address public staking;

  constructor(
    uint256 _protocolFee,
    uint256 _protocolFeeLight,
    address _protocolFeeWallet,
    uint256 _rebateScale,
    uint256 _rebateMax,
    address _staking
  ) {
    require(_protocolFee < FEE_DIVISOR, "INVALID_FEE");
    require(_protocolFeeLight < FEE_DIVISOR, "INVALID_FEE");
    require(_protocolFeeWallet != address(0), "INVALID_FEE_WALLET");
    require(_rebateScale <= MAX_SCALE, "SCALE_TOO_HIGH");
    require(_rebateMax <= MAX_PERCENTAGE, "MAX_TOO_HIGH");
    require(_staking != address(0), "INVALID_STAKING");

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

    protocolFee = _protocolFee;
    protocolFeeLight = _protocolFeeLight;
    protocolFeeWallet = _protocolFeeWallet;
    rebateScale = _rebateScale;
    rebateMax = _rebateMax;
    staking = _staking;
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
  ) external override {
    // Ensure the order is valid
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

    // Calculate and transfer protocol fee and any rebate
    _transferProtocolFee(signerToken, signerWallet, signerAmount);

    // Emit a Swap event
    emit Swap(
      nonce,
      block.timestamp,
      signerWallet,
      signerToken,
      signerAmount,
      protocolFee,
      msg.sender,
      senderToken,
      senderAmount
    );
  }

  /**
   * @notice Swap Atomic ERC20 Swap (Low Gas Usage)
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
  function light(
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
    require(DOMAIN_CHAIN_ID == getChainId(), "CHAIN_ID_CHANGED");

    // Ensure the expiry is not passed
    require(expiry > block.timestamp, "EXPIRY_PASSED");

    // Recover the signatory from the hash and signature
    address signatory = ecrecover(
      keccak256(
        abi.encodePacked(
          "\x19\x01",
          DOMAIN_SEPARATOR,
          keccak256(
            abi.encode(
              ORDER_TYPEHASH,
              nonce,
              expiry,
              signerWallet,
              signerToken,
              signerAmount,
              protocolFeeLight,
              msg.sender,
              senderToken,
              senderAmount
            )
          )
        )
      ),
      v,
      r,
      s
    );

    // Ensure the signatory is not null
    require(signatory != address(0), "SIGNATURE_INVALID");

    // Ensure the nonce is not yet used and if not mark it used
    require(_markNonceAsUsed(signatory, nonce), "NONCE_ALREADY_USED");

    // Ensure the signatory is authorized by the signer wallet
    if (signerWallet != signatory) {
      require(authorized[signerWallet] == signatory, "UNAUTHORIZED");
    }

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

    // Transfer fee from signer to feeWallet
    IERC20(signerToken).safeTransferFrom(
      signerWallet,
      protocolFeeWallet,
      (signerAmount * protocolFeeLight) / FEE_DIVISOR
    );

    // Emit a Swap event
    emit Swap(
      nonce,
      block.timestamp,
      signerWallet,
      signerToken,
      signerAmount,
      protocolFeeLight,
      msg.sender,
      senderToken,
      senderAmount
    );
  }

  /**
   * @notice Sender Buys an NFT (ERC721)
   * @param nonce uint256 Unique and should be sequential
   * @param expiry uint256 Expiry in seconds since 1 January 1970
   * @param signerWallet address Wallet of the signer
   * @param signerToken address ERC721 token transferred from the signer
   * @param signerID uint256 Token ID transferred from the signer
   * @param senderToken address ERC20 token transferred from the sender
   * @param senderAmount uint256 Amount transferred from the sender
   * @param v uint8 "v" value of the ECDSA signature
   * @param r bytes32 "r" value of the ECDSA signature
   * @param s bytes32 "s" value of the ECDSA signature
   */
  function buyNFT(
    uint256 nonce,
    uint256 expiry,
    address signerWallet,
    address signerToken,
    uint256 signerID,
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
      signerID,
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
    IERC721(signerToken).transferFrom(signerWallet, msg.sender, signerID);

    // Calculate and transfer protocol fee and rebate
    _transferProtocolFee(senderToken, msg.sender, senderAmount);

    emit Swap(
      nonce,
      block.timestamp,
      signerWallet,
      signerToken,
      signerID,
      protocolFee,
      msg.sender,
      senderToken,
      senderAmount
    );
  }

  /**
   * @notice Sender Sells an NFT (ERC721)
   * @param nonce uint256 Unique and should be sequential
   * @param expiry uint256 Expiry in seconds since 1 January 1970
   * @param signerWallet address Wallet of the signer
   * @param signerToken address ERC20 token transferred from the signer
   * @param signerAmount uint256 Amount transferred from the signer
   * @param senderToken address ERC721 token transferred from the sender
   * @param senderID uint256 Token ID transferred from the sender
   * @param v uint8 "v" value of the ECDSA signature
   * @param r bytes32 "r" value of the ECDSA signature
   * @param s bytes32 "s" value of the ECDSA signature
   */
  function sellNFT(
    uint256 nonce,
    uint256 expiry,
    address signerWallet,
    address signerToken,
    uint256 signerAmount,
    address senderToken,
    uint256 senderID,
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
      senderID,
      v,
      r,
      s
    );

    // Transfer token from sender to signer
    IERC721(senderToken).transferFrom(msg.sender, signerWallet, senderID);

    // Transfer token from signer to recipient
    IERC20(signerToken).safeTransferFrom(
      signerWallet,
      msg.sender,
      signerAmount
    );

    // Calculate and transfer protocol fee and rebate
    _transferProtocolFee(signerToken, signerWallet, signerAmount);

    emit Swap(
      nonce,
      block.timestamp,
      signerWallet,
      signerToken,
      signerAmount,
      protocolFee,
      msg.sender,
      senderToken,
      senderID
    );
  }

  /**
   * @notice Signer and sender swap NFTs (ERC721)
   * @param nonce uint256 Unique and should be sequential
   * @param expiry uint256 Expiry in seconds since 1 January 1970
   * @param signerWallet address Wallet of the signer
   * @param signerToken address ERC721 token transferred from the signer
   * @param signerID uint256 Token ID transferred from the signer
   * @param senderToken address ERC721 token transferred from the sender
   * @param senderID uint256 Token ID transferred from the sender
   * @param v uint8 "v" value of the ECDSA signature
   * @param r bytes32 "r" value of the ECDSA signature
   * @param s bytes32 "s" value of the ECDSA signature
   */
  function swapNFTs(
    uint256 nonce,
    uint256 expiry,
    address signerWallet,
    address signerToken,
    uint256 signerID,
    address senderToken,
    uint256 senderID,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) public override {
    _checkValidOrder(
      nonce,
      expiry,
      signerWallet,
      signerToken,
      signerID,
      senderToken,
      senderID,
      v,
      r,
      s
    );

    // Transfer token from sender to signer
    IERC721(senderToken).transferFrom(msg.sender, signerWallet, senderID);

    // Transfer token from signer to sender
    IERC721(signerToken).transferFrom(signerWallet, msg.sender, signerID);

    emit Swap(
      nonce,
      block.timestamp,
      signerWallet,
      signerToken,
      signerID,
      0,
      msg.sender,
      senderToken,
      senderID
    );
  }

  /**
   * @notice Set the fee
   * @param _protocolFee uint256 Value of the fee in basis points
   */
  function setProtocolFee(uint256 _protocolFee) external onlyOwner {
    // Ensure the fee is less than divisor
    require(_protocolFee < FEE_DIVISOR, "INVALID_FEE");
    protocolFee = _protocolFee;
    emit SetProtocolFee(_protocolFee);
  }

  /**
   * @notice Set the light fee
   * @param _protocolFeeLight uint256 Value of the fee in basis points
   */
  function setProtocolFeeLight(uint256 _protocolFeeLight) external onlyOwner {
    // Ensure the fee is less than divisor
    require(_protocolFeeLight < FEE_DIVISOR, "INVALID_FEE_LIGHT");
    protocolFeeLight = _protocolFeeLight;
    emit SetProtocolFeeLight(_protocolFeeLight);
  }

  /**
   * @notice Set the fee wallet
   * @param _protocolFeeWallet address Wallet to transfer fee to
   */
  function setProtocolFeeWallet(address _protocolFeeWallet) external onlyOwner {
    // Ensure the new fee wallet is not null
    require(_protocolFeeWallet != address(0), "INVALID_FEE_WALLET");
    protocolFeeWallet = _protocolFeeWallet;
    emit SetProtocolFeeWallet(_protocolFeeWallet);
  }

  /**
   * @notice Set scale
   * @dev Only owner
   * @param _rebateScale uint256
   */
  function setRebateScale(uint256 _rebateScale) external onlyOwner {
    require(_rebateScale <= MAX_SCALE, "SCALE_TOO_HIGH");
    rebateScale = _rebateScale;
    emit SetRebateScale(_rebateScale);
  }

  /**
   * @notice Set max
   * @dev Only owner
   * @param _rebateMax uint256
   */
  function setRebateMax(uint256 _rebateMax) external onlyOwner {
    require(_rebateMax <= MAX_PERCENTAGE, "MAX_TOO_HIGH");
    rebateMax = _rebateMax;
    emit SetRebateMax(_rebateMax);
  }

  /**
   * @notice Set the staking token
   * @param newstaking address Token to check balances on
   */
  function setStaking(address newstaking) external onlyOwner {
    // Ensure the new staking token is not null
    require(newstaking != address(0), "INVALID_FEE_WALLET");
    staking = newstaking;
    emit SetStaking(newstaking);
  }

  /**
   * @notice Authorize a signer
   * @param signer address Wallet of the signer to authorize
   * @dev Emits an Authorize event
   */
  function authorize(address signer) external override {
    require(signer != address(0), "SIGNER_INVALID");
    authorized[msg.sender] = signer;
    emit Authorize(signer, msg.sender);
  }

  /**
   * @notice Revoke the signer
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
   * @notice Validates Swap Order for any potential errors
   * @param senderWallet address Wallet that would send the order
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
   * @return tuple of error count and bytes32[] memory array of error messages
   */
  function check(
    address senderWallet,
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
  ) public view returns (uint256, bytes32[] memory) {
    bytes32[] memory errors = new bytes32[](MAX_ERROR_COUNT);
    Order memory order;
    uint256 errCount;
    order.nonce = nonce;
    order.expiry = expiry;
    order.signerWallet = signerWallet;
    order.signerToken = signerToken;
    order.signerAmount = signerAmount;
    order.senderToken = senderToken;
    order.senderAmount = senderAmount;
    order.v = v;
    order.r = r;
    order.s = s;
    order.senderWallet = senderWallet;
    bytes32 hashed = _getOrderHash(
      order.nonce,
      order.expiry,
      order.signerWallet,
      order.signerToken,
      order.signerAmount,
      order.senderWallet,
      order.senderToken,
      order.senderAmount
    );
    address signatory = _getSignatory(hashed, order.v, order.r, order.s);

    if (signatory == address(0)) {
      errors[errCount] = "SIGNATURE_INVALID";
      errCount++;
    }

    if (order.expiry < block.timestamp) {
      errors[errCount] = "EXPIRY_PASSED";
      errCount++;
    }

    if (
      order.signerWallet != signatory &&
      authorized[order.signerWallet] != signatory
    ) {
      errors[errCount] = "UNAUTHORIZED";
      errCount++;
    } else {
      if (nonceUsed(signatory, order.nonce)) {
        errors[errCount] = "NONCE_ALREADY_USED";
        errCount++;
      }
    }

    uint256 signerBalance = IERC20(order.signerToken).balanceOf(
      order.signerWallet
    );

    uint256 signerAllowance = IERC20(order.signerToken).allowance(
      order.signerWallet,
      address(this)
    );

    uint256 feeAmount = (order.signerAmount * protocolFee) / FEE_DIVISOR;

    if (signerAllowance < order.signerAmount + feeAmount) {
      errors[errCount] = "SIGNER_ALLOWANCE_LOW";
      errCount++;
    }

    if (signerBalance < order.signerAmount + feeAmount) {
      errors[errCount] = "SIGNER_BALANCE_LOW";
      errCount++;
    }
    return (errCount, errors);
  }

  /**
   * @notice Calculate output amount for an input score
   * @param stakingBalance uint256
   * @param feeAmount uint256
   */
  function calculateDiscount(uint256 stakingBalance, uint256 feeAmount)
    public
    view
    returns (uint256)
  {
    uint256 divisor = (uint256(10)**rebateScale) + stakingBalance;
    return (rebateMax * stakingBalance * feeAmount) / divisor / 100;
  }

  /**
   * @notice Calculates and refers fee amount
   * @param wallet address
   * @param amount uint256
   */
  function calculateProtocolFee(address wallet, uint256 amount)
    public
    view
    override
    returns (uint256)
  {
    // Transfer fee from signer to feeWallet
    uint256 feeAmount = (amount * protocolFee) / FEE_DIVISOR;
    if (feeAmount > 0) {
      uint256 discountAmount = calculateDiscount(
        IERC20(staking).balanceOf(wallet),
        feeAmount
      );
      return feeAmount - discountAmount;
    }
    return feeAmount;
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

    // Ensure the signatory is not null
    require(signatory != address(0), "SIGNATURE_INVALID");

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
          ORDER_TYPEHASH,
          nonce,
          expiry,
          signerWallet,
          signerToken,
          signerAmount,
          protocolFee,
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
    return
      ecrecover(
        keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, hash)),
        v,
        r,
        s
      );
  }

  /**
   * @notice Calculates and transfers protocol fee and rebate
   * @param sourceToken address
   * @param sourceWallet address
   * @param amount uint256
   */
  function _transferProtocolFee(
    address sourceToken,
    address sourceWallet,
    uint256 amount
  ) internal {
    // Transfer fee from signer to feeWallet
    uint256 feeAmount = (amount * protocolFee) / FEE_DIVISOR;
    if (feeAmount > 0) {
      uint256 discountAmount = calculateDiscount(
        IERC20(staking).balanceOf(msg.sender),
        feeAmount
      );
      if (discountAmount > 0) {
        // Transfer fee from signer to sender
        IERC20(sourceToken).safeTransferFrom(
          sourceWallet,
          msg.sender,
          discountAmount
        );
        // Transfer fee from signer to feeWallet
        IERC20(sourceToken).safeTransferFrom(
          sourceWallet,
          protocolFeeWallet,
          feeAmount - discountAmount
        );
      } else {
        IERC20(sourceToken).safeTransferFrom(
          sourceWallet,
          protocolFeeWallet,
          feeAmount
        );
      }
    }
  }
}
