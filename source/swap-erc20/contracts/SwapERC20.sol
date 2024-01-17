// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/INoReturnERC20.sol";
import "./interfaces/ISwapERC20.sol";

/**
 * @title AirSwap: Atomic ERC20 Token Swap
 * @notice https://www.airswap.io/
 */
contract SwapERC20 is ISwapERC20, Ownable, EIP712 {
  using SafeERC20 for IERC20;

  bytes32 public constant ORDER_TYPEHASH =
    keccak256(
      abi.encodePacked(
        "OrderERC20(uint256 nonce,uint256 expiry,address signerWallet,address signerToken,uint256 signerAmount,",
        "uint256 protocolFee,address senderWallet,address senderToken,uint256 senderAmount)"
      )
    );

  // Domain name and version for use in EIP712 signatures
  string public constant DOMAIN_NAME = "SWAP_ERC20";
  string public constant DOMAIN_VERSION = "4.2";
  uint256 public immutable DOMAIN_CHAIN_ID;
  bytes32 public immutable DOMAIN_SEPARATOR;

  uint256 public constant FEE_DIVISOR = 10000;
  uint256 private constant MAX_ERROR_COUNT = 10;
  uint256 private constant MAX_MAX = 100;
  uint256 private constant MAX_SCALE = 77;

  /**
   * @notice Double mapping of signers to nonce groups to nonce states
   * @dev The nonce group is computed as nonce / 256, so each group of 256 sequential nonces uses the same key
   * @dev The nonce states are encoded as 256 bits, for each nonce in the group 0 means available and 1 means used
   */
  mapping(address => mapping(uint256 => uint256)) private _nonceGroups;

  // Mapping of signer to authorized signatory
  mapping(address => address) public override authorized;

  uint256 public protocolFee;
  uint256 public protocolFeeLight;
  address public protocolFeeWallet;
  uint256 public bonusScale;
  uint256 public bonusMax;
  address public stakingToken;

  /**
   * @notice SwapERC20 constructor
   * @dev Sets domain and version for EIP712 signatures
   * @param _protocolFee uin256 protocol fee to be assessed on swaps
   * @param _protocolFeeWallet address destination for protocol fees
   * @param _bonusScale uin256 scale factor for bonus
   * @param _bonusMax uint256 max bonus percentage
   */
  constructor(
    uint256 _protocolFee,
    uint256 _protocolFeeLight,
    address _protocolFeeWallet,
    uint256 _bonusScale,
    uint256 _bonusMax
  ) EIP712(DOMAIN_NAME, DOMAIN_VERSION) {
    if (_protocolFee >= FEE_DIVISOR) revert InvalidFee();
    if (_protocolFeeLight >= FEE_DIVISOR) revert InvalidFeeLight();
    if (_protocolFeeWallet == address(0)) revert InvalidFeeWallet();
    if (_bonusMax > MAX_MAX) revert MaxTooHigh();
    if (_bonusScale > MAX_SCALE) revert ScaleTooHigh();

    DOMAIN_CHAIN_ID = block.chainid;
    DOMAIN_SEPARATOR = _domainSeparatorV4();

    protocolFee = _protocolFee;
    protocolFeeLight = _protocolFeeLight;
    protocolFeeWallet = _protocolFeeWallet;
    bonusMax = _bonusMax;
    bonusScale = _bonusScale;
  }

  /**
   * @notice Atomic ERC20 Swap
   * @param recipient address Wallet to receive sender proceeds
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
    _check(
      nonce,
      expiry,
      signerWallet,
      signerToken,
      signerAmount,
      msg.sender,
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

    // Calculate and transfer protocol fee
    _transferProtocolFee(signerToken, signerWallet, signerAmount);

    // Emit event
    emit SwapERC20(nonce, signerWallet);
  }

  /**
   * @notice Atomic ERC20 Swap for Any Sender
   * @param recipient address Wallet to receive sender proceeds
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
  function swapAnySender(
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
    _check(
      nonce,
      expiry,
      signerWallet,
      signerToken,
      signerAmount,
      address(0),
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

    // Calculate and transfer protocol fee
    _transferProtocolFee(signerToken, signerWallet, signerAmount);

    // Emit event
    emit SwapERC20(nonce, signerWallet);
  }

  /**
   * @notice Swap Atomic ERC20 Swap (Minimal Gas)
   * @dev No transfer checks. Only use with known tokens.
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
  function swapLight(
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
    // Ensure the expiry is not passed
    if (expiry <= block.timestamp) revert OrderExpired();

    // Recover the signatory from the hash and signature
    address signatory = ecrecover(
      keccak256(
        abi.encodePacked(
          "\x19\x01", // EIP191: Indicates EIP712
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
    if (signatory == address(0)) revert SignatureInvalid();

    // Ensure the nonce is not yet used and if not mark it used
    if (!_markNonceAsUsed(signatory, nonce)) revert NonceAlreadyUsed(nonce);

    // Ensure signatory is authorized to sign
    if (authorized[signerWallet] != address(0)) {
      // If one is set by signer wallet, signatory must be authorized
      if (signatory != authorized[signerWallet]) revert SignatoryUnauthorized();
    } else {
      // Otherwise, signatory must be signer wallet
      if (signatory != signerWallet) revert Unauthorized();
    }

    // Transfer token from sender to signer
    INoReturnERC20(senderToken).transferFrom(
      msg.sender,
      signerWallet,
      senderAmount
    );

    // Transfer token from signer to sender
    INoReturnERC20(signerToken).transferFrom(
      signerWallet,
      msg.sender,
      signerAmount
    );

    // Transfer protocol fee from signer to fee wallet
    INoReturnERC20(signerToken).transferFrom(
      signerWallet,
      protocolFeeWallet,
      (signerAmount * protocolFeeLight) / FEE_DIVISOR
    );

    // Emit event
    emit SwapERC20(nonce, signerWallet);
  }

  /**
   * @notice Set the protocol fee
   * @param _protocolFee uint256 Value of the fee in basis points
   */
  function setProtocolFee(uint256 _protocolFee) external onlyOwner {
    // Ensure the fee is less than divisor
    if (_protocolFee >= FEE_DIVISOR) revert InvalidFee();
    protocolFee = _protocolFee;
    emit SetProtocolFee(_protocolFee);
  }

  /**
   * @notice Set the light protocol fee
   * @param _protocolFeeLight uint256 Value of the fee in basis points
   */
  function setProtocolFeeLight(uint256 _protocolFeeLight) external onlyOwner {
    // Ensure the fee is less than divisor
    if (_protocolFeeLight >= FEE_DIVISOR) revert InvalidFeeLight();
    protocolFeeLight = _protocolFeeLight;
    emit SetProtocolFeeLight(_protocolFeeLight);
  }

  /**
   * @notice Set the protocol fee wallet
   * @param _protocolFeeWallet address Wallet to transfer fee to
   */
  function setProtocolFeeWallet(address _protocolFeeWallet) external onlyOwner {
    // Ensure the new fee wallet is not null
    if (_protocolFeeWallet == address(0)) revert InvalidFeeWallet();
    protocolFeeWallet = _protocolFeeWallet;
    emit SetProtocolFeeWallet(_protocolFeeWallet);
  }

  /**
   * @notice Set staking bonus max
   * @dev Only owner
   * @param _bonusMax uint256
   */
  function setBonusMax(uint256 _bonusMax) external onlyOwner {
    if (_bonusMax > MAX_MAX) revert MaxTooHigh();
    bonusMax = _bonusMax;
    emit SetBonusMax(_bonusMax);
  }

  /**
   * @notice Set staking bonus scale
   * @dev Only owner
   * @param _bonusScale uint256
   */
  function setBonusScale(uint256 _bonusScale) external onlyOwner {
    if (_bonusScale > MAX_SCALE) revert ScaleTooHigh();
    bonusScale = _bonusScale;
    emit SetBonusScale(_bonusScale);
  }

  /**
   * @notice Set staking token
   * @param _stakingToken address Token to check balances on
   */
  function setStaking(address _stakingToken) external onlyOwner {
    // Ensure the new staking token is not null
    if (_stakingToken == address(0)) revert InvalidStaking();
    stakingToken = _stakingToken;
    emit SetStaking(_stakingToken);
  }

  /**
   * @notice Authorize a signatory
   * @param signatory address Wallet of the signatory to authorize
   * @dev Emits an Authorize event
   */
  function authorize(address signatory) external override {
    if (signatory == address(0)) revert SignatoryInvalid();
    authorized[msg.sender] = signatory;
    emit Authorize(signatory, msg.sender);
  }

  /**
   * @notice Revoke the signatory
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
    for (uint256 i; i < nonces.length; ) {
      uint256 nonce = nonces[i];
      if (_markNonceAsUsed(msg.sender, nonce)) {
        emit Cancel(nonce, msg.sender);
      }
      unchecked {
        ++i;
      }
    }
  }

  /**
   * @notice Checks order and returns list of errors
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
  ) external view returns (uint256, bytes32[] memory) {
    bytes32[] memory errors = new bytes32[](MAX_ERROR_COUNT);
    uint256 errCount;

    if (DOMAIN_CHAIN_ID != block.chainid) {
      errors[errCount] = "ChainIdChanged";
      errCount++;
    }

    OrderERC20 memory order;
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

    address signatory = ecrecover(
      _getOrderHash(
        order.nonce,
        order.expiry,
        order.signerWallet,
        order.signerToken,
        order.signerAmount,
        order.senderWallet,
        order.senderToken,
        order.senderAmount
      ),
      order.v,
      order.r,
      order.s
    );

    if (signatory == address(0)) {
      errors[errCount] = "SignatureInvalid";
      errCount++;
    } else {
      if (
        authorized[order.signerWallet] != address(0) &&
        signatory != authorized[order.signerWallet]
      ) {
        errors[errCount] = "SignatoryUnauthorized";
        errCount++;
      } else if (
        authorized[order.signerWallet] == address(0) &&
        signatory != order.signerWallet
      ) {
        errors[errCount] = "Unauthorized";
        errCount++;
      } else if (nonceUsed(signatory, order.nonce)) {
        errors[errCount] = "NonceAlreadyUsed";
        errCount++;
      }
    }

    if (order.expiry < block.timestamp) {
      errors[errCount] = "OrderExpired";
      errCount++;
    }

    if (order.senderWallet != address(0)) {
      uint256 senderBalance = IERC20(order.senderToken).balanceOf(
        order.senderWallet
      );

      uint256 senderAllowance = IERC20(order.senderToken).allowance(
        order.senderWallet,
        address(this)
      );

      if (senderAllowance < order.senderAmount) {
        errors[errCount] = "SenderAllowanceLow";
        errCount++;
      }

      if (senderBalance < order.senderAmount) {
        errors[errCount] = "SenderBalanceLow";
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

    uint256 signerFeeAmount = (order.signerAmount * protocolFee) / FEE_DIVISOR;

    if (signerAllowance < order.signerAmount + signerFeeAmount) {
      errors[errCount] = "SignerAllowanceLow";
      errCount++;
    }

    if (signerBalance < order.signerAmount + signerFeeAmount) {
      errors[errCount] = "SignerBalanceLow";
      errCount++;
    }

    return (errCount, errors);
  }

  /**
   * @notice Calculates bonus from staking balance
   * @param stakingBalance uint256
   * @param feeAmount uint256
   */
  function calculateBonus(
    uint256 stakingBalance,
    uint256 feeAmount
  ) public view returns (uint256) {
    uint256 divisor = (uint256(10) ** bonusScale) + stakingBalance;
    return (bonusMax * stakingBalance * feeAmount) / divisor / MAX_MAX;
  }

  /**
   * @notice Calculates protocol fee for an account
   * @param wallet address
   * @param amount uint256
   */
  function calculateProtocolFee(
    address wallet,
    uint256 amount
  ) external view override returns (uint256) {
    // Transfer fee from signer to feeWallet
    uint256 feeAmount = (amount * protocolFee) / FEE_DIVISOR;
    if (stakingToken != address(0) && feeAmount > 0) {
      uint256 bonusAmount = calculateBonus(
        IERC20(stakingToken).balanceOf(wallet),
        feeAmount
      );
      return feeAmount - bonusAmount;
    }
    return feeAmount;
  }

  /**
   * @notice Returns true if the nonce has been used
   * @param signer address Address of the signer
   * @param nonce uint256 Nonce being checked
   */
  function nonceUsed(
    address signer,
    uint256 nonce
  ) public view override returns (bool) {
    uint256 groupKey = nonce / 256;
    uint256 indexInGroup = nonce % 256;
    return (_nonceGroups[signer][groupKey] >> indexInGroup) & 1 == 1;
  }

  /**
   * @notice Marks a nonce as used for the given signer
   * @param signer address Address of the signer for which to mark the nonce as used
   * @param nonce uint256 Nonce to be marked as used
   * @return bool True if the nonce was not marked as used already
   */
  function _markNonceAsUsed(
    address signer,
    uint256 nonce
  ) private returns (bool) {
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
   * @notice Checks order and reverts on error
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
  function _check(
    uint256 nonce,
    uint256 expiry,
    address signerWallet,
    address signerToken,
    uint256 signerAmount,
    address senderWallet,
    address senderToken,
    uint256 senderAmount,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) private {
    // Ensure execution on the intended chain
    if (DOMAIN_CHAIN_ID != block.chainid) revert ChainIdChanged();

    // Ensure the expiry is not passed
    if (expiry <= block.timestamp) revert OrderExpired();

    // Recover the signatory from the hash and signature
    (address signatory, ) = ECDSA.tryRecover(
      _getOrderHash(
        nonce,
        expiry,
        signerWallet,
        signerToken,
        signerAmount,
        senderWallet,
        senderToken,
        senderAmount
      ),
      v,
      r,
      s
    );

    // Ensure the signatory is not null
    if (signatory == address(0)) revert SignatureInvalid();

    // Ensure signatory is authorized to sign
    if (authorized[signerWallet] != address(0)) {
      // If one is set by signer wallet, signatory must be authorized
      if (signatory != authorized[signerWallet]) revert SignatoryUnauthorized();
    } else {
      // Otherwise, signatory must be signer wallet
      if (signatory != signerWallet) revert Unauthorized();
    }

    // Ensure the nonce is not yet used and if not mark it used
    if (!_markNonceAsUsed(signatory, nonce)) revert NonceAlreadyUsed(nonce);
  }

  /**
   * @notice Hashes order parameters
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
  ) private view returns (bytes32) {
    return
      keccak256(
        abi.encodePacked(
          "\x19\x01", // EIP191: Indicates EIP712
          DOMAIN_SEPARATOR,
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
          )
        )
      );
  }

  /**
   * @notice Calculates and transfers protocol fee and bonus
   * @param sourceToken address
   * @param sourceWallet address
   * @param amount uint256
   */
  function _transferProtocolFee(
    address sourceToken,
    address sourceWallet,
    uint256 amount
  ) private {
    // Transfer fee from signer to feeWallet
    uint256 feeAmount = (amount * protocolFee) / FEE_DIVISOR;
    if (feeAmount > 0) {
      uint256 bonusAmount;
      if (stakingToken != address(0)) {
        // Only check bonus if staking is set
        bonusAmount = calculateBonus(
          IERC20(stakingToken).balanceOf(msg.sender),
          feeAmount
        );
      }
      if (bonusAmount > 0) {
        // Transfer fee from signer to sender
        IERC20(sourceToken).safeTransferFrom(
          sourceWallet,
          msg.sender,
          bonusAmount
        );
        // Transfer fee from signer to feeWallet
        IERC20(sourceToken).safeTransferFrom(
          sourceWallet,
          protocolFeeWallet,
          feeAmount - bonusAmount
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
