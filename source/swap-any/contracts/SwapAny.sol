// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "./interfaces/ITransferHandler.sol";
import "./interfaces/ISwapAny.sol";

/**
 * @title Swap: The Atomic Swap used on the AirSwap Network
 */
contract SwapAny is ISwapAny {
  bytes32 public constant DOMAIN_TYPEHASH =
    keccak256(
      "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

  bytes32 public constant ORDER_TYPEHASH =
    keccak256(
      "Order(uint256 nonce,uint256 expiry,address signerWallet,address signerToken,uint256 signerAmount,uint256 protocolFee,address senderWallet,address senderToken,uint256 senderAmount)"
    );

  // Data type used for hashing: Structured data (EIP-191)
  bytes internal constant EIP191_HEADER = "\x19\x01";

  // Domain and version for use in signatures (EIP-712)
  bytes32 public constant DOMAIN_NAME = keccak256("SWAPANY");
  bytes32 public constant DOMAIN_VERSION = keccak256("3");

  // Domain chain id for use in signatures (EIP-712)
  uint256 public immutable DOMAIN_CHAIN_ID;

  // Unique domain identifier for use in signatures (EIP-712)
  bytes32 public immutable DOMAIN_SEPARATOR;

  // Possible nonce statuses
  bytes1 internal constant AVAILABLE = 0x00;
  bytes1 internal constant UNAVAILABLE = 0x01;

  // Mapping of sender address to a delegated sender address and bool
  mapping(address => mapping(address => bool)) public senderAuthorizations;

  // Mapping of signer address to a delegated signer and bool
  mapping(address => mapping(address => bool)) public signerAuthorizations;

  // Mapping of signers to nonces with value AVAILABLE (0x00) or UNAVAILABLE (0x01)
  mapping(address => mapping(uint256 => bytes1)) public signerNonceStatus;

  // Mapping of signer addresses to an optionally set minimum valid nonce
  mapping(address => uint256) public signerMinimumNonce;

  // A registry storing a transfer handler for different token kinds
  TransferHandlerRegistry public registry;

  /**
   * @notice Contract Constructor
   * @dev Sets domain for signature validation (EIP-712)
   * @param swapRegistry TransferHandlerRegistry
   */
  constructor(TransferHandlerRegistry swapRegistry) {
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
  }

  /**
   * @notice Atomic Token Swap
   * @param order Order to settle
   */
  function swap(OrderAny calldata order) external {
    // Ensure the order is not expired.
    require(order.expiry > block.timestamp, "ORDER_EXPIRED");

    // Ensure the nonce is AVAILABLE (0x00).
    require(
      signerNonceStatus[order.signerWallet][order.nonce] == AVAILABLE,
      "ORDER_TAKEN_OR_CANCELLED"
    );

    // Ensure the order nonce is above the minimum.
    require(
      order.nonce >= signerMinimumNonce[order.signerWallet],
      "NONCE_TOO_LOW"
    );

    // Mark the nonce UNAVAILABLE (0x01).
    signerNonceStatus[order.signerWallet][order.nonce] = UNAVAILABLE;

    // Validate the sender side of the trade.
    address finalSenderWallet;

    if (order.senderWallet == address(0)) {
      /**
       * Sender is not specified. The msg.sender of the transaction becomes
       * the sender of the order.
       */
      finalSenderWallet = msg.sender;
    } else {
      /**
       * Sender is specified. If the msg.sender is not the specified sender,
       * this determines whether the msg.sender is an authorized sender.
       */
      require(
        isSenderAuthorized(order.senderWallet, msg.sender),
        "SENDER_UNAUTHORIZED"
      );
      // The msg.sender is authorized.
      finalSenderWallet = order.senderWallet;
    }

    // Validate the signer side of the trade.
    if (order.v == 0) {
      /**
       * Signature is not provided. The signer may have authorized the
       * msg.sender to swap on its behalf, which does not require a signature.
       */
      require(
        isSignerAuthorized(order.signerWallet, msg.sender),
        "SIGNER_UNAUTHORIZED"
      );
    } else {
      /**
       * The signature is provided. Determine whether the signer is
       * authorized and if so validate the signature itself.
       */
      require(
        isSignerAuthorized(order.signerWallet, order.signatory),
        "SIGNER_UNAUTHORIZED"
      );

      // Ensure the signature is valid.
      require(isValid(order, DOMAIN_SEPARATOR), "SIGNATURE_INVALID");
    }
    // Transfer token from sender to signer.
    transferToken(
      finalSenderWallet,
      order.signerWallet,
      order.senderAmount,
      order.senderId,
      order.senderToken,
      order.senderKind
    );

    // Transfer token from signer to sender.
    transferToken(
      order.signerWallet,
      finalSenderWallet,
      order.signerAmount,
      order.signerId,
      order.signerToken,
      order.signerKind
    );

    // Transfer token from signer to affiliate if specified.
    if (order.affiliateToken != address(0)) {
      transferToken(
        order.signerWallet,
        order.affiliateWallet,
        order.affiliateAmount,
        order.affiliateId,
        order.affiliateToken,
        order.affiliateKind
      );
    }

    emit Swap(
      order.nonce,
      block.timestamp,
      order.signerWallet,
      order.signerAmount,
      order.signerId,
      order.signerToken,
      finalSenderWallet,
      order.senderAmount,
      order.senderId,
      order.senderToken,
      order.affiliateWallet,
      order.affiliateAmount,
      order.affiliateId,
      order.affiliateToken
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

  /**
   * @notice Hash an order into bytes32
   * @dev EIP-191 header and domain separator included
   * @param order Order The order to be hashed
   * @param domainSeparator bytes32
   * @return bytes32 A keccak256 abi.encodePacked value
   */
  function hashOrder(OrderAny calldata order, bytes32 domainSeparator)
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
              keccak256(
                abi.encode(
                  order.signerKind,
                  order.signerWallet,
                  order.signerToken,
                  order.signerAmount,
                  order.signerId
                )
              ),
              keccak256(
                abi.encode(
                  order.senderKind,
                  order.senderWallet,
                  order.senderToken,
                  order.senderAmount,
                  order.senderId
                )
              ),
              keccak256(
                abi.encode(
                  order.affiliateKind,
                  order.affiliateWallet,
                  order.affiliateToken,
                  order.affiliateAmount,
                  order.affiliateId
                )
              )
            )
          )
        )
      );
  }

  /**
   * @notice Cancel one or more open orders by nonce
   * @dev Cancelled nonces are marked UNAVAILABLE (0x01)
   * @dev Emits a Cancel event
   * @dev Out of gas may occur in arrays of length > 400
   * @param nonces uint256[] List of nonces to cancel
   */
  function cancel(uint256[] calldata nonces) external {
    for (uint256 i = 0; i < nonces.length; i++) {
      if (signerNonceStatus[msg.sender][nonces[i]] == AVAILABLE) {
        signerNonceStatus[msg.sender][nonces[i]] = UNAVAILABLE;
        emit Cancel(nonces[i], msg.sender);
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
   * @notice Authorize a delegated sender
   * @dev Emits an AuthorizeSender event
   * @param authorizedSender address Address to authorize
   */
  function authorizeSender(address authorizedSender) external {
    require(msg.sender != authorizedSender, "SELF_AUTH_INVALID");
    if (!senderAuthorizations[msg.sender][authorizedSender]) {
      senderAuthorizations[msg.sender][authorizedSender] = true;
      emit AuthorizeSender(msg.sender, authorizedSender);
    }
  }

  /**
   * @notice Authorize a delegated signer
   * @dev Emits an AuthorizeSigner event
   * @param authorizedSigner address Address to authorize
   */
  function authorizeSigner(address authorizedSigner) external {
    require(msg.sender != authorizedSigner, "SELF_AUTH_INVALID");
    if (!signerAuthorizations[msg.sender][authorizedSigner]) {
      signerAuthorizations[msg.sender][authorizedSigner] = true;
      emit AuthorizeSigner(msg.sender, authorizedSigner);
    }
  }

  /**
   * @notice Revoke an authorized sender
   * @dev Emits a RevokeSender event
   * @param authorizedSender address Address to revoke
   */
  function revokeSender(address authorizedSender) external {
    if (senderAuthorizations[msg.sender][authorizedSender]) {
      delete senderAuthorizations[msg.sender][authorizedSender];
      emit RevokeSender(msg.sender, authorizedSender);
    }
  }

  /**
   * @notice Revoke an authorized signer
   * @dev Emits a RevokeSigner event
   * @param authorizedSigner address Address to revoke
   */
  function revokeSigner(address authorizedSigner) external {
    if (signerAuthorizations[msg.sender][authorizedSigner]) {
      delete signerAuthorizations[msg.sender][authorizedSigner];
      emit RevokeSigner(msg.sender, authorizedSigner);
    }
  }

  /**
   * @notice Determine whether a sender delegate is authorized
   * @param authorizer address Address doing the authorization
   * @param delegate address Address being authorized
   * @return bool True if a delegate is authorized to send
   */
  function isSenderAuthorized(address authorizer, address delegate)
    internal
    view
    returns (bool)
  {
    return ((authorizer == delegate) ||
      senderAuthorizations[authorizer][delegate]);
  }

  /**
   * @notice Determine whether a signer delegate is authorized
   * @param authorizer address Address doing the authorization
   * @param delegate address Address being authorized
   * @return bool True if a delegate is authorized to sign
   */
  function isSignerAuthorized(address authorizer, address delegate)
    internal
    view
    returns (bool)
  {
    return ((authorizer == delegate) ||
      signerAuthorizations[authorizer][delegate]);
  }

  /**
   * @notice Validate signature using an EIP-712 typed data hash
   * @param order Order to validate
   * @param domainSeparator bytes32 Domain identifier used in signatures (EIP-712)
   * @return bool True if order has a valid signature
   */
  function isValid(OrderAny calldata order, bytes32 domainSeparator)
    internal
    pure
    returns (bool)
  {
    if (order.signatureVersion == bytes1(0x01)) {
      return
        order.signatory ==
        ecrecover(hashOrder(order, domainSeparator), order.v, order.r, order.s);
    }
    if (order.signatureVersion == bytes1(0x45)) {
      return
        order.signatory ==
        ecrecover(
          keccak256(
            abi.encodePacked(
              "\x19Ethereum Signed Message:\n32",
              hashOrder(order, domainSeparator)
            )
          ),
          order.v,
          order.r,
          order.s
        );
    }
    return false;
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
}
