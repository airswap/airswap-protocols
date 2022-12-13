// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/ITransferHandler.sol";
import "./interfaces/ISwap.sol";

/**
 * @title Swap: The Atomic Swap used on the AirSwap Network
 */
contract Swap is ISwap, Ownable {
  using SafeERC20 for IERC20;

  bytes32 public constant DOMAIN_TYPEHASH =
    keccak256(
      "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

  bytes32 internal constant ORDER_TYPEHASH =
    keccak256(
      abi.encodePacked(
        "Order(",
        "uint256 nonce,",
        "uint256 expiry,",
        "uint256 protocolFee,",
        "Party signer,",
        "Party sender,",
        "Party affiliate",
        ")",
        "Party(",
        "address wallet,",
        "address token,",
        "bytes4 kind,",
        "uint256 id,",
        "uint256 amount",
        ")"
      )
    );

  bytes32 internal constant PARTY_TYPEHASH =
    keccak256(
      abi.encodePacked(
        "Party(",
        "address wallet,",
        "address token,",
        "bytes4 kind,",
        "uint256 id,",
        "uint256 amount",
        ")"
      )
    );

  // Data type used for hashing: Structured data (EIP-191)
  bytes internal constant EIP191_HEADER = "\x19\x01";

  // Domain and version for use in signatures (EIP-712)
  bytes32 public constant DOMAIN_NAME = keccak256("SWAP");
  bytes32 public constant DOMAIN_VERSION = keccak256("3");

  // Domain chain id for use in signatures (EIP-712)
  uint256 public immutable DOMAIN_CHAIN_ID;

  // Unique domain identifier for use in signatures (EIP-712)
  bytes32 public immutable DOMAIN_SEPARATOR;

  uint256 internal constant MAX_PERCENTAGE = 100;
  uint256 internal constant MAX_SCALE = 77;
  uint256 public constant FEE_DIVISOR = 10000;

  uint256 public protocolFee;
  address public protocolFeeWallet;
  uint256 public rebateScale;
  uint256 public rebateMax;
  address public staking;

  /**
   * @notice Double mapping of signers to nonce groups to nonce states
   * @dev The nonce group is computed as nonce / 256, so each group of 256 sequential nonces uses the same key
   * @dev The nonce states are encoded as 256 bits, for each nonce in the group 0 means available and 1 means used
   */
  mapping(address => mapping(uint256 => uint256)) internal _nonceGroups;

  // Mapping of signer addresses to an optionally set minimum valid nonce
  mapping(address => uint256) public signerMinimumNonce;

  // Mapping of sender address to a delegated sender address and bool
  mapping(address => mapping(address => bool)) public senderAuthorizations;

  // Mapping of signer address to a delegated signer and bool
  mapping(address => mapping(address => bool)) public signerAuthorizations;

  // A registry storing a transfer handler for different token kinds
  TransferHandlerRegistry public registry;

  /**
   * @notice Contract Constructor
   * @dev Sets domain for signature validation (EIP-712)
   * @param swapRegistry TransferHandlerRegistry
   */
  constructor(
    TransferHandlerRegistry swapRegistry,
    uint256 _protocolFee,
    address _protocolFeeWallet,
    uint256 _rebateScale,
    uint256 _rebateMax,
    address _staking
  ) {
    require(_protocolFee < FEE_DIVISOR, "INVALID_FEE");
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
    registry = swapRegistry;
    protocolFee = _protocolFee;
    protocolFeeWallet = _protocolFeeWallet;
    rebateScale = _rebateScale;
    rebateMax = _rebateMax;
    staking = _staking;
  }

  /**
   * @notice Atomic Token Swap
   * @param order Order to settle
   */
  function swap(Order calldata order) external {
    // Ensure the order is not expired.
    require(order.expiry > block.timestamp, "ORDER_EXPIRED");

    require(
      order.nonce >= signerMinimumNonce[order.signer.wallet],
      "NONCE_TOO_LOW"
    );

    // Ensure the nonce is not yet used and if not mark it used
    require(
      _markNonceAsUsed(order.signer.wallet, order.nonce),
      "NONCE_ALREADY_USED"
    );

    // Validate the sender side of the trade.
    address finalSenderWallet;

    if (order.sender.wallet == address(0)) {
      /**
       * Sender is not specified. The msg.sender of the transaction becomes
       * the sender of the order.
       */
      finalSenderWallet = msg.sender;
    } else {
      // The msg.sender is authorized.
      finalSenderWallet = order.sender.wallet;
    }

    // Validate the signer side of the trade.
    require(isValid(order, DOMAIN_SEPARATOR), "SIGNATURE_INVALID");

    // Transfer token from sender to signer.
    transferToken(
      finalSenderWallet,
      order.signer.wallet,
      order.sender.amount,
      order.sender.id,
      order.sender.token,
      order.sender.kind
    );

    // Transfer token from signer to sender.
    transferToken(
      order.signer.wallet,
      finalSenderWallet,
      order.signer.amount,
      order.signer.id,
      order.signer.token,
      order.signer.kind
    );

    // Transfer token from signer to affiliate if specified.
    if (order.affiliate.token != address(0)) {
      transferToken(
        order.signer.wallet,
        order.affiliate.wallet,
        order.affiliate.amount,
        order.affiliate.id,
        order.affiliate.token,
        order.affiliate.kind
      );
    }

    emit Swap(
      order.nonce,
      block.timestamp,
      order.signer.wallet,
      order.sender.amount,
      order.signer.id,
      order.signer.token,
      finalSenderWallet,
      order.sender.amount,
      order.sender.id,
      order.sender.token,
      order.affiliate.wallet,
      order.affiliate.amount,
      order.affiliate.id,
      order.affiliate.token
    );
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

  function setProtocolFee(uint256 _protocolFee) external onlyOwner {
    // Ensure the fee is less than divisor
    require(_protocolFee < FEE_DIVISOR, "INVALID_FEE");
    protocolFee = _protocolFee;
    emit SetProtocolFee(_protocolFee);
  }

  function setProtocolFeeWallet(address _protocolFeeWallet) external onlyOwner {
    // Ensure the new fee wallet is not null
    require(_protocolFeeWallet != address(0), "INVALID_FEE_WALLET");
    protocolFeeWallet = _protocolFeeWallet;
    emit SetProtocolFeeWallet(_protocolFeeWallet);
  }

  /**
   * @notice Hash an order into bytes32
   * @dev EIP-191 header and domain separator included
   * @param order Order The order to be hashed
   * @param domainSeparator bytes32
   * @return bytes32 A keccak256 abi.encodePacked value
   */
  function hashOrder(Order calldata order, bytes32 domainSeparator)
    internal
    pure
    returns (bytes32)
  {
    return
      keccak256(
        abi.encodePacked(
          EIP191_HEADER,
          domainSeparator,
          keccak256(
            abi.encode(
              ORDER_TYPEHASH,
              order.nonce,
              order.expiry,
              order.protocolFee,
              keccak256(
                abi.encode(
                  PARTY_TYPEHASH,
                  order.signer.wallet,
                  order.signer.token,
                  order.signer.kind,
                  order.signer.id,
                  order.signer.amount
                )
              ),
              keccak256(
                abi.encode(
                  PARTY_TYPEHASH,
                  order.sender.wallet,
                  order.sender.token,
                  order.sender.kind,
                  order.sender.id,
                  order.sender.amount
                )
              ),
              keccak256(
                abi.encode(
                  PARTY_TYPEHASH,
                  order.affiliate.wallet,
                  order.affiliate.token,
                  order.affiliate.kind,
                  order.affiliate.id,
                  order.affiliate.amount
                )
              )
            )
          )
        )
      );
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
   * @notice Cancels all orders below a nonce value
   * @dev Emits a CancelUpTo event
   * @param minimumNonce uint256 Minimum valid nonce
   */
  function cancelUpTo(uint256 minimumNonce) external {
    signerMinimumNonce[msg.sender] = minimumNonce;
    emit CancelUpTo(minimumNonce, msg.sender);
  }

  /**
   * @notice Validate signature using an EIP-712 typed data hash
   * @param order Order to validate
   * @param domainSeparator bytes32 Domain identifier used in signatures (EIP-712)
   * @return bool True if order has a valid signature
   */
  function isValid(Order calldata order, bytes32 domainSeparator)
    internal
    pure
    returns (bool)
  {
    return
      order.signer.wallet ==
      ecrecover(hashOrder(order, domainSeparator), order.v, order.r, order.s);
  }

  /**
   * @notice Perform token transfer for tokens in registry
   * @dev Transfer type specified by the bytes4 kind param
   * @dev ERC721: uses transferFrom for transfer
   * @dev ERC20: Takes into account non-standard ERC-20 tokens.
   * @param from address Wallet address to transfer from
   * @param to address Wallet address to transfer to
   * @param amount uint256 Amount for ERC-20
   * @param id token ID for ERC-721
   * @param token address Contract address of token
   * @param kind bytes4 EIP-165 interface ID of the token
   */
  function transferToken(
    address from,
    address to,
    uint256 amount,
    uint256 id,
    address token,
    bytes4 kind
  ) internal {
    // Ensure the transfer is not to self.
    require(from != to, "SELF_TRANSFER_INVALID");
    ITransferHandler transferHandler = registry.transferHandlers(kind);
    require(address(transferHandler) != address(0), "TOKEN_KIND_UNKNOWN");
    // delegatecall required to pass msg.sender as Swap contract to handle the
    // token transfer in the calling contract
    (bool success, bytes memory data) = address(transferHandler).delegatecall(
      abi.encodeWithSelector(
        transferHandler.transferTokens.selector,
        from,
        to,
        amount,
        id,
        token
      )
    );
    require(success && abi.decode(data, (bool)), "TRANSFER_FAILED");
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

  function calculateDiscount(uint256 stakingBalance, uint256 feeAmount)
    public
    view
    returns (uint256)
  {
    uint256 divisor = (uint256(10)**rebateScale) + stakingBalance;
    return (rebateMax * stakingBalance * feeAmount) / divisor / 100;
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
