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

  uint256 public constant FEE_DIVISOR = 10000;

  uint256 public protocolFee;
  address public protocolFeeWallet;

  uint256 internal constant MAX_ERROR_COUNT = 10;

  /**
   * @notice Double mapping of signers to nonce groups to nonce states
   * @dev The nonce group is computed as nonce / 256, so each group of 256 sequential nonces uses the same key
   * @dev The nonce states are encoded as 256 bits, for each nonce in the group 0 means available and 1 means used
   */
  mapping(address => mapping(uint256 => uint256)) internal _nonceGroups;

  mapping(address => address) public override authorized;

  // Mapping of signer addresses to an optionally set minimum valid nonce
  mapping(address => uint256) public _signerMinimumNonce;

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
    address _protocolFeeWallet
  ) {
    if (_protocolFee >= FEE_DIVISOR) revert InvalidFee();
    if (_protocolFeeWallet == address(0)) revert InvalidFeeWallet();
    uint256 currentChainId = block.chainid;
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
  }

  /**
   * @notice Atomic Token Swap
   * @param order Order to settle
   */
  function swap(Order calldata order) external {
    // Ensure the order is not expired.
    if (order.expiry <= block.timestamp) revert OrderExpired();

    // Ensure the nonce is not yet used and if not mark it used
    if (order.nonce < _signerMinimumNonce[order.signer.wallet])
      revert NonceTooLow();

    // Ensure the nonce is not yet used and if not mark it used
    _markNonceAsUsed(order.signer.wallet, order.nonce);

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
      if (order.sender.wallet != msg.sender) revert SenderInvalid();
    }

    // Validate the signer side of the trade.
    _isAuthorized(order, DOMAIN_SEPARATOR);

    // Ensure the signatory is authorized by the signer wallet

    // Transfer token from sender to signer.
    _transferToken(
      finalSenderWallet,
      order.signer.wallet,
      order.sender.amount,
      order.sender.id,
      order.sender.token,
      order.sender.kind
    );

    // Transfer token from signer to sender.
    _transferToken(
      order.signer.wallet,
      finalSenderWallet,
      order.signer.amount,
      order.signer.id,
      order.signer.token,
      order.signer.kind
    );

    // Transfer token from signer to affiliate if specified.
    if (order.affiliate.token != address(0)) {
      _transferToken(
        order.signer.wallet,
        order.affiliate.wallet,
        order.affiliate.amount,
        order.affiliate.id,
        order.affiliate.token,
        order.affiliate.kind
      );
    }

    // Check if protocol fee is applicable and transfer it accordingly
    if (registry.transferHandlers(order.signer.kind).attemptFeeTransfer()) {
      _transferProtocolFee(order);
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
   * @notice Set the fee
   * @param _protocolFee uint256 Value of the fee in basis points
   */
  function setProtocolFee(uint256 _protocolFee) external onlyOwner {
    // Ensure the fee is less than divisor
    if (_protocolFee >= FEE_DIVISOR) revert InvalidFee();
    protocolFee = _protocolFee;
    emit SetProtocolFee(_protocolFee);
  }

  /**
   * @notice Set the fee wallet
   * @param _protocolFeeWallet address Wallet to transfer fee to
   */
  function setProtocolFeeWallet(address _protocolFeeWallet) external onlyOwner {
    // Ensure the new fee wallet is not null
    if (_protocolFeeWallet == address(0)) revert InvalidFeeWallet();
    protocolFeeWallet = _protocolFeeWallet;
    emit SetProtocolFeeWallet(_protocolFeeWallet);
  }

  /**
   * @notice Authorize a signer
   * @param signer address Wallet of the signer to authorize
   * @dev Emits an Authorize event
   */
  function authorize(address signer) external override {
    if (signer == address(0)) revert SignerInvalid();
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
   * @notice Hash an order into bytes32
   * @dev EIP-191 header and domain separator included
   * @param order Order The order to be hashed
   * @param domainSeparator bytes32
   * @return bytes32 A keccak256 abi.encodePacked value
   */
  function _hashOrder(Order calldata order, bytes32 domainSeparator)
    internal
    view
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
              protocolFee,
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
      _markNonceAsUsed(msg.sender, nonce);
    }
  }

  /**
   * @notice Cancels all orders below a nonce value
   * @dev Emits a CancelUpTo event
   * @param minimumNonce uint256 Minimum valid nonce
   */
  function cancelUpTo(uint256 minimumNonce) external {
    _signerMinimumNonce[msg.sender] = minimumNonce;
    emit CancelUpTo(minimumNonce, msg.sender);
  }

  /**
   * @notice Validates Swap Order for any potential errors
   * @param order Order to settle
   */
  function check(Order calldata order)
    public
    view
    returns (bytes32[] memory, uint256)
  {
    uint256 errCount;
    bytes32[] memory errors = new bytes32[](MAX_ERROR_COUNT);
    address signatory = ecrecover(
      _hashOrder(order, DOMAIN_SEPARATOR),
      order.v,
      order.r,
      order.s
    );

    if (signatory == address(0)) {
      errors[errCount] = "SignatureInvalid";
      errCount++;
    }

    if (order.expiry < block.timestamp) {
      errors[errCount] = "OrderExpired";
      errCount++;
    }

    if (
      order.signer.wallet != signatory &&
      authorized[order.signer.wallet] != signatory
    ) {
      errors[errCount] = "Unauthorized";
      errCount++;
    } else {
      if (nonceUsed(signatory, order.nonce)) {
        errors[errCount] = "NonceAlreadyUsed";
        errCount++;
      }
    }

    if (order.nonce < _signerMinimumNonce[order.signer.wallet]) {
      errors[errCount] = "NonceTooLow";
      errCount++;
    }

    ITransferHandler signerTransferHandler = registry.transferHandlers(
      order.signer.kind
    );

    if (address(signerTransferHandler) == address(0)) {
      errors[errCount] = "SignerTokenKindUnknown";
      errCount++;
    } else {
      if (!signerTransferHandler.hasAllowance(order.signer)) {
        errors[errCount] = "SignerAllowanceLow";
        errCount++;
      }
      if (!signerTransferHandler.hasBalance(order.signer)) {
        errors[errCount] = "SignerBalanceLow";
        errCount++;
      }
    }

    ITransferHandler senderTransferHandler = registry.transferHandlers(
      order.sender.kind
    );

    if (address(senderTransferHandler) == address(0)) {
      errors[errCount] = "SenderTokenKindUnknown";
      errCount++;
    } else {
      if (!senderTransferHandler.hasAllowance(order.sender)) {
        errors[errCount] = "SenderAllowanceLow";
        errCount++;
      }
      if (!senderTransferHandler.hasBalance(order.sender)) {
        errors[errCount] = "SenderBalanceLow";
        errCount++;
      }
    }

    if (order.affiliate.token != address(0)) {
      ITransferHandler affiliateTransferHandler = registry.transferHandlers(
        order.affiliate.kind
      );

      if (!affiliateTransferHandler.hasAllowance(order.signer)) {
        errors[errCount] = "AffiliateAllowanceLow";
        errCount++;
      }
      if (!affiliateTransferHandler.hasBalance(order.signer)) {
        errors[errCount] = "AffiliateBalanceLow";
        errCount++;
      }
    }

    if (order.protocolFee != protocolFee) {
      errors[errCount] = "InvalidFee";
      errCount++;
    }

    return (errors, errCount);
  }

  /**
   * @notice Tests whether signature and signer are valid
   * @param order Order to validate
   * @param domainSeparator bytes32
   */
  function _isAuthorized(Order calldata order, bytes32 domainSeparator)
    internal
    view
  {
    bytes32 hashed = _hashOrder(order, domainSeparator);

    // Recover the signatory from the hash and signature
    address signatory = _getSignatory(order, hashed);

    // Ensure the signatory is not null
    if (signatory == address(0)) revert SignatureInvalid();

    // Ensure the signatory is authorized by the signer wallet
    if (order.signer.wallet != signatory) {
      if (authorized[order.signer.wallet] != signatory) revert Unauthorized();
    }
  }

  /**
   * @notice Recover the signatory from a signature
   * @param order Order signeds
   * @param orderHash hash of the Order signed
   */
  function _getSignatory(Order calldata order, bytes32 orderHash)
    internal
    pure
    returns (address)
  {
    return ecrecover(orderHash, order.v, order.r, order.s);
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
  function _transferToken(
    address from,
    address to,
    uint256 amount,
    uint256 id,
    address token,
    bytes4 kind
  ) internal {
    ITransferHandler transferHandler = registry.transferHandlers(kind);
    if (address(transferHandler) == address(0)) revert TokenKindUnknown();
    if (!transferHandler.transferTokens(from, to, amount, id, token))
      revert TransferFailed();
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
   */
  function _markNonceAsUsed(address signer, uint256 nonce)
    internal
  {
    uint256 groupKey = nonce / 256;
    uint256 indexInGroup = nonce % 256;
    uint256 group = _nonceGroups[signer][groupKey];

    // If it is already used, return mit cancel and revert
    if ((group >> indexInGroup) & 1 == 1) {
      emit Cancel(nonce, msg.sender);
      revert NonceAlreadyUsed(nonce);
    }

    _nonceGroups[signer][groupKey] = group | (uint256(1) << indexInGroup);
  }

  /**
   * @notice Calculates and transfers protocol fee and rebate
   * @param order order
   */
  function _transferProtocolFee(Order calldata order) internal {
    // Transfer fee from signer to feeWallet
    uint256 feeAmount = (order.signer.amount * protocolFee) / FEE_DIVISOR;
    if (feeAmount > 0) {
      _transferToken(
        order.signer.wallet,
        protocolFeeWallet,
        feeAmount,
        order.signer.id,
        order.signer.token,
        order.signer.kind
      );
    }
  }
}
