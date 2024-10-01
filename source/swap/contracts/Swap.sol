// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "./interfaces/ISwap.sol";

/**
 * @title AirSwap: Atomic Token Swap
 * @notice https://www.airswap.io/
 */
contract Swap is ISwap, Ownable2Step, EIP712 {
  bytes32 private constant ORDER_TYPEHASH =
    keccak256(
      abi.encodePacked(
        "Order(uint256 nonce,uint256 expiry,uint256 protocolFee,Party signer,Party sender,address affiliateWallet,uint256 affiliateAmount)",
        "Party(address wallet,address token,bytes4 kind,uint256 id,uint256 amount)"
      )
    );

  bytes32 private constant PARTY_TYPEHASH =
    keccak256(
      "Party(address wallet,address token,bytes4 kind,uint256 id,uint256 amount)"
    );

  // Domain name and version for use in EIP712 signatures
  string public constant DOMAIN_NAME = "SWAP";
  string public constant DOMAIN_VERSION = "4.2";
  bytes32 public immutable DOMAIN_SEPARATOR;

  uint256 public constant FEE_DIVISOR = 10000;
  uint256 private constant MAX_ERROR_COUNT = 15;

  /**
   * @notice Double mapping of signers to nonce groups to nonce states
   * @dev The nonce group is computed as nonce / 256, so each group of 256 sequential nonces uses the same key
   * @dev The nonce states are encoded as 256 bits, for each nonce in the group 0 means available and 1 means used
   */
  mapping(address => mapping(uint256 => uint256)) private _nonceGroups;

  // Mapping of signer to authorized signatory
  mapping(address => address) public override authorized;

  // Mapping of signatory address to a minimum valid nonce
  mapping(address => uint256) public signatoryMinimumNonce;

  uint256 public protocolFee;
  address public protocolFeeWallet;
  bytes4 public immutable requiredSenderKind;

  // Mapping of ERC165 interface ID to token adapter
  mapping(bytes4 => IAdapter) public adapters;

  /**
   * @notice Swap constructor
   * @dev Sets domain and version for EIP712 signatures
   * @param _adapters IAdapter[] array of token adapters
   * @param _protocolFee uin256 protocol fee to be assessed on swaps
   * @param _protocolFeeWallet address destination for protocol fees
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

    DOMAIN_SEPARATOR = _domainSeparatorV4();

    uint256 adaptersLength = _adapters.length;
    for (uint256 i; i < adaptersLength; ) {
      adapters[_adapters[i].interfaceId()] = _adapters[i];
      unchecked {
        ++i;
      }
    }
    requiredSenderKind = _requiredSenderKind;
    protocolFee = _protocolFee;
    protocolFeeWallet = _protocolFeeWallet;
  }

  /**
   * @notice Atomic Token Swap
   * @param recipient address Wallet to receive sender proceeds
   * @param maxRoyalty uint256 Max to avoid unexpected royalties
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

    // Transfer protocol fee from sender
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

    // Transfer royalty from sender if required by signer token
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
   * @notice Set the protocol fee
   * @param _protocolFee uint256 Value of the fee in basis points
   */
  function setProtocolFee(uint256 _protocolFee) external onlyOwner {
    // Ensure the fee is less than divisor
    if (_protocolFee >= FEE_DIVISOR) revert FeeInvalid();
    protocolFee = _protocolFee;
    emit SetProtocolFee(_protocolFee);
  }

  /**
   * @notice Set the protocol fee wallet
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
    for (uint256 i; i < nonces.length; ) {
      uint256 nonce = nonces[i];
      _markNonceAsUsed(msg.sender, nonce);
      emit Cancel(nonce, msg.sender);
      unchecked {
        ++i;
      }
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
   * @notice Checks an order for errors
   * @param senderWallet address Wallet that would send the order
   * @param order Order that would be settled
   * @return bytes32[] errors
   */
  function check(
    address senderWallet,
    Order calldata order
  ) external view returns (bytes32[] memory) {
    bytes32[] memory errors = new bytes32[](MAX_ERROR_COUNT);
    uint256 count;

    // Validate as the authorized signatory if set
    address signatory = order.signer.wallet;
    if (authorized[signatory] != address(0)) {
      signatory = authorized[signatory];
    }

    if (
      !SignatureChecker.isValidSignatureNow(
        signatory,
        _getOrderHash(order),
        abi.encodePacked(order.r, order.s, order.v)
      )
    ) {
      errors[count++] = "Unauthorized";
    } else if (nonceUsed(signatory, order.nonce)) {
      errors[count++] = "NonceAlreadyUsed";
    } else if (order.nonce < signatoryMinimumNonce[signatory]) {
      errors[count++] = "NonceTooLow";
    }

    if (order.expiry < block.timestamp) {
      errors[count++] = "OrderExpired";
    }

    if (
      order.sender.wallet != address(0) && order.sender.wallet != senderWallet
    ) {
      errors[count++] = "SenderInvalid";
    }

    IAdapter senderTokenAdapter = adapters[order.sender.kind];

    if (address(senderTokenAdapter) == address(0)) {
      errors[count++] = "SenderTokenKindUnknown";
    } else {
      if (order.sender.kind != requiredSenderKind) {
        errors[count++] = "SenderTokenInvalid";
      } else {
        uint256 protocolFeeAmount = (order.sender.amount * protocolFee) /
          FEE_DIVISOR;
        uint256 totalSenderAmount = order.sender.amount +
          protocolFeeAmount +
          order.affiliateAmount;
        if (supportsRoyalties(order.signer.token)) {
          (, uint256 royaltyAmount) = IERC2981(order.signer.token).royaltyInfo(
            order.signer.id,
            order.sender.amount
          );
          totalSenderAmount += royaltyAmount;
        }
        Party memory sender = Party(
          senderWallet,
          order.sender.token,
          order.sender.kind,
          order.sender.id,
          totalSenderAmount
        );
        if (senderWallet != address(0)) {
          if (!senderTokenAdapter.hasAllowance(sender)) {
            errors[count++] = "SenderAllowanceLow";
          }
          if (!senderTokenAdapter.hasBalance(sender)) {
            errors[count++] = "SenderBalanceLow";
          }
        }
        if (!senderTokenAdapter.hasValidParams(sender)) {
          errors[count++] = "AmountOrIDInvalid";
        }
        if (order.sender.amount < order.affiliateAmount) {
          errors[count++] = "AffiliateAmountInvalid";
        }
      }
    }

    IAdapter signerTokenAdapter = adapters[order.signer.kind];

    if (address(signerTokenAdapter) == address(0)) {
      errors[count++] = "SignerTokenKindUnknown";
    } else {
      if (!signerTokenAdapter.hasAllowance(order.signer)) {
        errors[count++] = "SignerAllowanceLow";
      }
      if (!signerTokenAdapter.hasBalance(order.signer)) {
        errors[count++] = "SignerBalanceLow";
      }
      if (!signerTokenAdapter.hasValidParams(order.signer)) {
        errors[count++] = "AmountOrIDInvalid";
      }
    }

    // Truncate errors array to actual count
    if (count != errors.length) {
      assembly {
        mstore(errors, count)
      }
    }

    return errors;
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
  function _markNonceAsUsed(address signatory, uint256 nonce) private {
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
   * @notice Checks whether a token implements EIP-2981
   * @param token address token to check
   */
  function supportsRoyalties(address token) private view returns (bool) {
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
  function _check(Order calldata order) private {
    // Ensure the sender token is the required kind
    if (order.sender.kind != requiredSenderKind) revert SenderTokenInvalid();

    // Ensure the sender amount is greater than affiliate amount
    if (order.sender.amount < order.affiliateAmount)
      revert AffiliateAmountInvalid();

    // Validate as the authorized signatory if set
    address signatory = order.signer.wallet;
    if (authorized[signatory] != address(0)) {
      signatory = authorized[signatory];
    }

    // Ensure the signature is correct for the order
    if (
      !SignatureChecker.isValidSignatureNow(
        signatory,
        _getOrderHash(order),
        abi.encodePacked(order.r, order.s, order.v)
      )
    ) revert Unauthorized();

    // Ensure the nonce is not yet used and if not mark it used
    _markNonceAsUsed(signatory, order.nonce);

    // Ensure the nonce is not below the minimum nonce set by cancelUpTo
    if (order.nonce < signatoryMinimumNonce[signatory]) revert NonceTooLow();

    // Ensure the expiry is not passed
    if (order.expiry <= block.timestamp) revert OrderExpired();
  }

  /**
   * @notice Hashes an order into bytes32
   * @dev EIP-191 header and domain separator included
   * @param order Order The order to be hashed
   * @return bytes32 A keccak256 abi.encodePacked value
   */
  function _getOrderHash(Order calldata order) private view returns (bytes32) {
    return
      _hashTypedDataV4(
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
      );
  }

  /**
   * @notice Performs token transfer
   * @param from address Wallet address to transfer from
   * @param to address Wallet address to transfer to
   * @param amount uint256 Amount for ERC-20
   * @param id uint256 token ID for ERC-721, ERC-1155
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
  ) private {
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
