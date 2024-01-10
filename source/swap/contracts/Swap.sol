// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "./interfaces/IAdapter.sol";
import "./interfaces/ISwap.sol";

/**
 * @title AirSwap: Atomic Token Swap
 * @notice https://www.airswap.io/
 */
contract Swap is ISwap, Ownable2Step, EIP712 {
  bytes32 internal constant ORDER_TYPEHASH =
    keccak256(
      abi.encodePacked(
        "Order(uint256 nonce,uint256 expiry,uint256 protocolFee,Party signer,Party sender,address affiliateWallet,uint256 affiliateAmount)",
        "Party(address wallet,address token,bytes4 kind,uint256 id,uint256 amount)"
      )
    );

  bytes32 internal constant PARTY_TYPEHASH =
    keccak256(
      "Party(address wallet,address token,bytes4 kind,uint256 id,uint256 amount)"
    );

  // Domain name and version for use in EIP712 signatures
  string public constant DOMAIN_NAME = "SWAP";
  string public constant DOMAIN_VERSION = "4";
  uint256 public immutable DOMAIN_CHAIN_ID;
  bytes32 public immutable DOMAIN_SEPARATOR;

  uint256 public constant FEE_DIVISOR = 10000;
  uint256 internal constant MAX_ERROR_COUNT = 16;

  // Mapping of ERC165 interface ID to token adapter
  mapping(bytes4 => IAdapter) public adapters;

  // Mapping of signer to authorized signatory
  mapping(address => address) public override authorized;

  // Mapping of signatory address to a minimum valid nonce
  mapping(address => uint256) public signatoryMinimumNonce;

  /**
   * @notice Double mapping of signers to nonce groups to nonce states
   * @dev The nonce group is computed as nonce / 256, so each group of 256 sequential nonces uses the same key
   * @dev The nonce states are encoded as 256 bits, for each nonce in the group 0 means available and 1 means used
   */
  mapping(address => mapping(uint256 => uint256)) internal _nonceGroups;

  bytes4 public requiredSenderKind;
  uint256 public protocolFee;
  address public protocolFeeWallet;

  /**
   * @notice Constructor
   * @dev Sets domain and version for EIP712 signatures
   * @param _adapters IAdapter[] array of token adapters
   * @param _protocolFee uin256 fee to be assessed on swaps
   * @param _protocolFeeWallet address destination for fees
   */
  constructor(
    IAdapter[] memory _adapters,
    bytes4 _requiredSenderKind,
    uint256 _protocolFee,
    address _protocolFeeWallet
  ) EIP712(DOMAIN_NAME, DOMAIN_VERSION) {
    if (_protocolFee >= FEE_DIVISOR) revert FeeInvalid();
    if (_protocolFeeWallet == address(0)) revert FeeWalletInvalid();
    if (_adapters.length == 0) revert AdaptersInvalid();

    DOMAIN_CHAIN_ID = block.chainid;
    DOMAIN_SEPARATOR = _domainSeparatorV4();

    for (uint256 i = 0; i < _adapters.length; i++) {
      adapters[_adapters[i].interfaceId()] = _adapters[i];
    }
    requiredSenderKind = _requiredSenderKind;
    protocolFee = _protocolFee;
    protocolFeeWallet = _protocolFeeWallet;
  }

  /**
   * @notice Atomic Token Swap
   * @param order Order to settle
   */
  function swap(
    address recipient,
    uint256 maxRoyalty,
    Order calldata order
  ) external {
    // Ensure order is valid for signer
    _check(order);

    // Ensure msg.sender matches order if specified
    if (order.sender.wallet != address(0) && order.sender.wallet != msg.sender)
      revert SenderInvalid();

    // Transfer from sender to signer
    _transfer(
      msg.sender,
      order.signer.wallet,
      order.sender.amount,
      order.sender.id,
      order.sender.token,
      order.sender.kind
    );

    // Transfer from signer to recipient
    _transfer(
      order.signer.wallet,
      recipient,
      order.signer.amount,
      order.signer.id,
      order.signer.token,
      order.signer.kind
    );

    // Transfer from sender to affiliate if specified
    if (order.affiliateWallet != address(0)) {
      _transfer(
        msg.sender,
        order.affiliateWallet,
        order.affiliateAmount,
        order.sender.id,
        order.sender.token,
        order.sender.kind
      );
    }

    // Transfer protocol fee from sender if possible
    uint256 protocolFeeAmount = (order.sender.amount * protocolFee) /
      FEE_DIVISOR;
    if (protocolFeeAmount > 0) {
      _transfer(
        msg.sender,
        protocolFeeWallet,
        protocolFeeAmount,
        order.sender.id,
        order.sender.token,
        order.sender.kind
      );
    }

    // Transfer royalty from sender if supported by signer token
    if (supportsRoyalties(order.signer.token)) {
      address royaltyRecipient;
      uint256 royaltyAmount;
      (royaltyRecipient, royaltyAmount) = IERC2981(order.signer.token)
        .royaltyInfo(order.signer.id, order.sender.amount);
      if (royaltyAmount > 0) {
        if (royaltyAmount > maxRoyalty) revert RoyaltyExceedsMax(royaltyAmount);
        _transfer(
          msg.sender,
          royaltyRecipient,
          royaltyAmount,
          order.sender.id,
          order.sender.token,
          order.sender.kind
        );
      }
    }

    emit Swap(
      order.nonce,
      order.signer.wallet,
      order.signer.amount,
      order.signer.id,
      order.signer.token,
      msg.sender,
      order.sender.amount,
      order.sender.id,
      order.sender.token,
      order.affiliateWallet,
      order.affiliateAmount
    );
  }

  /**
   * @notice Set the fee
   * @param _protocolFee uint256 Value of the fee in basis points
   */
  function setProtocolFee(uint256 _protocolFee) external onlyOwner {
    // Ensure the fee is less than divisor
    if (_protocolFee >= FEE_DIVISOR) revert FeeInvalid();
    protocolFee = _protocolFee;
    emit SetProtocolFee(_protocolFee);
  }

  /**
   * @notice Set the fee wallet
   * @param _protocolFeeWallet address Wallet to transfer fee to
   */
  function setProtocolFeeWallet(address _protocolFeeWallet) external onlyOwner {
    // Ensure the new fee wallet is not null
    if (_protocolFeeWallet == address(0)) revert FeeWalletInvalid();
    protocolFeeWallet = _protocolFeeWallet;
    emit SetProtocolFeeWallet(_protocolFeeWallet);
  }

  /**
   * @notice Authorize a signer
   * @param signatory address Wallet of the signer to authorize
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
    for (uint256 i = 0; i < nonces.length; i++) {
      uint256 nonce = nonces[i];
      _markNonceAsUsed(msg.sender, nonce);
      emit Cancel(nonce, msg.sender);
    }
  }

  /**
   * @notice Cancels all orders below a nonce value
   * @dev Emits a CancelUpTo event
   * @param minimumNonce uint256 Minimum valid nonce
   */
  function cancelUpTo(uint256 minimumNonce) external {
    signatoryMinimumNonce[msg.sender] = minimumNonce;
    emit CancelUpTo(minimumNonce, msg.sender);
  }

  /**
   * @notice Validates Swap Order for any potential errors
   * @param order Order to settle
   */
  function check(
    address senderWallet,
    Order calldata order
  ) public view returns (bytes32[] memory, uint256) {
    uint256 errCount;
    bytes32[] memory errors = new bytes32[](MAX_ERROR_COUNT);
    (address signatory, ) = ECDSA.tryRecover(
      _getOrderHash(order),
      order.v,
      order.r,
      order.s
    );

    if (
      order.sender.wallet != address(0) && order.sender.wallet != senderWallet
    ) {
      errors[errCount] = "SenderInvalid";
      errCount++;
    }

    if (signatory == address(0)) {
      errors[errCount] = "SignatureInvalid";
      errCount++;
    } else {
      if (
        authorized[order.signer.wallet] != address(0) &&
        signatory != authorized[order.signer.wallet]
      ) {
        errors[errCount] = "SignatoryUnauthorized";
        errCount++;
      } else if (
        authorized[order.signer.wallet] == address(0) &&
        signatory != order.signer.wallet
      ) {
        errors[errCount] = "Unauthorized";
        errCount++;
      } else if (nonceUsed(signatory, order.nonce)) {
        errors[errCount] = "NonceAlreadyUsed";
        errCount++;
      }
      if (order.nonce < signatoryMinimumNonce[signatory]) {
        errors[errCount] = "NonceTooLow";
        errCount++;
      }
    }

    if (order.expiry < block.timestamp) {
      errors[errCount] = "OrderExpired";
      errCount++;
    }

    IAdapter signerTokenAdapter = adapters[order.signer.kind];

    if (address(signerTokenAdapter) == address(0)) {
      errors[errCount] = "SignerTokenKindUnknown";
      errCount++;
    } else {
      if (!signerTokenAdapter.hasAllowance(order.signer)) {
        errors[errCount] = "SignerAllowanceLow";
        errCount++;
      }
      if (!signerTokenAdapter.hasBalance(order.signer)) {
        errors[errCount] = "SignerBalanceLow";
        errCount++;
      }
      if (!signerTokenAdapter.hasValidParams(order.signer)) {
        errors[errCount] = "AmountOrIDInvalid";
        errCount++;
      }
    }

    IAdapter senderTokenAdapter = adapters[order.sender.kind];

    if (address(senderTokenAdapter) == address(0)) {
      errors[errCount] = "SenderTokenKindUnknown";
      errCount++;
    } else {
      if (order.sender.kind != requiredSenderKind) {
        errors[errCount] = "SenderTokenInvalid";
        errCount++;
      } else {
        uint256 protocolFeeAmount = (order.sender.amount * protocolFee) /
          FEE_DIVISOR;
        uint256 totalSenderAmount = order.sender.amount +
          protocolFeeAmount +
          order.affiliateAmount;
        Party memory sender = Party(
          senderWallet,
          order.sender.token,
          order.sender.kind,
          order.sender.id,
          totalSenderAmount
        );
        if (!senderTokenAdapter.hasAllowance(sender)) {
          errors[errCount] = "SenderAllowanceLow";
          errCount++;
        }
        if (!senderTokenAdapter.hasBalance(sender)) {
          errors[errCount] = "SenderBalanceLow";
          errCount++;
        }
        if (!senderTokenAdapter.hasValidParams(order.signer)) {
          errors[errCount] = "AmountOrIDInvalid";
          errCount++;
        }
        if (order.sender.amount < order.affiliateAmount) {
          errors[errCount] = "AffiliateAmountInvalid";
          errCount++;
        }
      }
    }

    if (order.protocolFee != protocolFee) {
      errors[errCount] = "FeeInvalid";
      errCount++;
    }

    return (errors, errCount);
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
   * @notice Marks a nonce as used for the given signatory
   * @param signatory  address Address of the signer for which to mark the nonce as used
   * @param nonce uint256 Nonce to be marked as used
   */
  function _markNonceAsUsed(address signatory, uint256 nonce) internal {
    uint256 groupKey = nonce / 256;
    uint256 indexInGroup = nonce % 256;
    uint256 group = _nonceGroups[signatory][groupKey];

    // Revert if nonce is already used
    if ((group >> indexInGroup) & 1 == 1) {
      revert NonceAlreadyUsed(nonce);
    }

    _nonceGroups[signatory][groupKey] = group | (uint256(1) << indexInGroup);
  }

  /**
   * @notice Function to indicate whether the party token implements EIP-2981
   * @param token Contract address from which royalty need to be considered
   */
  function supportsRoyalties(address token) internal view returns (bool) {
    try IERC165(token).supportsInterface(type(IERC2981).interfaceId) returns (
      bool result
    ) {
      return result;
    } catch {
      return false;
    }
  }

  /**
   * @notice Tests whether signature and signer are valid
   * @param order Order to validate
   */

  function _check(Order calldata order) internal {
    // Ensure execution on the intended chain
    if (DOMAIN_CHAIN_ID != block.chainid) revert ChainIdChanged();

    // Ensure the sender token is the required kind
    if (order.sender.kind != requiredSenderKind) revert SenderTokenInvalid();

    // Ensure the sender amount is greater than affiliate amount
    if (order.sender.amount < order.affiliateAmount)
      revert AffiliateAmountInvalid();

    // Recover the signatory from the hash and signature
    (address signatory, ) = ECDSA.tryRecover(
      _getOrderHash(order),
      order.v,
      order.r,
      order.s
    );

    // Ensure the signatory is not null
    if (signatory == address(0)) revert SignatureInvalid();

    // Ensure signatory is authorized to sign
    if (authorized[order.signer.wallet] != address(0)) {
      // If one is set by signer wallet, signatory must be authorized
      if (signatory != authorized[order.signer.wallet])
        revert SignatoryUnauthorized();
    } else {
      // Otherwise, signatory must be signer wallet
      if (signatory != order.signer.wallet) revert Unauthorized();
    }

    // Ensure the nonce is not yet used and if not mark it used
    _markNonceAsUsed(signatory, order.nonce);

    // Ensure the nonce is not below the minimum nonce set by cancelUpTo
    if (order.nonce < signatoryMinimumNonce[signatory]) revert NonceTooLow();

    // Ensure the expiry is not passed
    if (order.expiry <= block.timestamp) revert OrderExpired();
  }

  /**
   * @notice Hash an order into bytes32
   * @dev EIP-191 header and domain separator included
   * @param order Order The order to be hashed
   * @return bytes32 A keccak256 abi.encodePacked value
   */
  function _getOrderHash(Order calldata order) internal view returns (bytes32) {
    return
      keccak256(
        abi.encodePacked(
          "\x19\x01", // EIP191: Indicates EIP712
          DOMAIN_SEPARATOR,
          keccak256(
            abi.encode(
              ORDER_TYPEHASH,
              order.nonce,
              order.expiry,
              protocolFee,
              keccak256(abi.encode(PARTY_TYPEHASH, order.signer)),
              keccak256(abi.encode(PARTY_TYPEHASH, order.sender)),
              order.affiliateWallet,
              order.affiliateAmount
            )
          )
        )
      );
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
  function _transfer(
    address from,
    address to,
    uint256 amount,
    uint256 id,
    address token,
    bytes4 kind
  ) internal {
    IAdapter adapter = adapters[kind];
    if (address(adapter) == address(0)) revert TokenKindUnknown();
    // Use delegatecall so underlying transfer is called as Swap
    (bool success, ) = address(adapter).delegatecall(
      abi.encodeWithSelector(
        adapter.transfer.selector,
        from,
        to,
        amount,
        id,
        token
      )
    );
    if (!success) revert TransferFailed(from, to);
  }
}
