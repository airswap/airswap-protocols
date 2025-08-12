// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import "./interfaces/IDelegate.sol";
import "@airswap/swap/contracts/interfaces/ISwap.sol";
import "@airswap/swap/contracts/interfaces/IAdapter.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import { Ownable } from "solady/src/auth/Ownable.sol";
import { SafeTransferLib } from "solady/src/utils/SafeTransferLib.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "hardhat/console.sol";

/**
 * @title AirSwap: Delegated On-chain Trading Rules
 * @notice Supports multiple token types (ERC-20, ERC-721, ERC-1155)
 * @dev inherits IDelegate, Ownable; uses SafeTransferLib
 */
contract Delegate is IDelegate, Ownable {
  // The Swap contract to be used to execute orders
  ISwap public swapContract;

  // Mapping of ERC165 interface ID to token adapter
  mapping(bytes4 => IAdapter) public adapters;

  // Mapping of senderWallet to senderToken to signerToken to Rule
  mapping(address => mapping(address => mapping(address => Rule))) public rules;

  // Mapping of senderWallet to an authorized manager
  mapping(address => address) public authorized;

  // Mapping of authorized manager to senderWallet
  mapping(address => address) public senderWallets;

  /**
   * @notice Constructor
   * @param _swapContract address
   * @param _adapters IAdapter[] array of token adapters
   */
  constructor(address _swapContract, IAdapter[] memory _adapters) {
    _initializeOwner(msg.sender);
    swapContract = ISwap(_swapContract);
    for (uint256 i; i < _adapters.length; ) {
      adapters[_adapters[i].interfaceId()] = _adapters[i];
      unchecked {
        ++i;
      }
    }
  }

  /**
   * @notice Set a Rule
   * @param _order ISwap.Order The order to be stored as a rule
   */
  function setRule(
    address _senderWallet,
    ISwap.Order calldata _order
  ) external {
    // Ensure the sender wallet is the delegate contract
    if (_order.sender.wallet != address(this)) revert SenderInvalid();

    if (authorized[_senderWallet] != address(0)) {
      // If an authorized manager is set, the message sender must be the manager
      if (msg.sender != authorized[_senderWallet]) revert SenderInvalid();
    } else {
      // Otherwise the message sender must be the sender wallet
      if (msg.sender != _senderWallet) revert SenderInvalid();
    }

    // Set the rule. Overwrites an existing rule.
    // TODO: handle tokenId
    rules[_senderWallet][_order.sender.token][_order.signer.token] = Rule(
      _order
    );

    // Emit a SetRule event
    emit SetRule(
      _senderWallet,
      _order.signer.token,
      _order.sender.token,
      _order.signer.amount,
      _order.sender.amount,
      _order.expiry
    );
  }

  /**
   * @notice Unset a Rule
   * @param _senderToken address Token the sender would transfer
   * @param _signerToken address Token the signer would transfer
   */
  function unsetRule(
    address _senderWallet,
    address _senderToken,
    address _signerToken
  ) external {
    if (authorized[_senderWallet] != address(0)) {
      // If an authorized manager is set, the message sender must be the manager
      if (msg.sender != authorized[_senderWallet]) revert SenderInvalid();
    } else {
      // Otherwise the message sender must be the sender wallet
      if (msg.sender != _senderWallet) revert SenderInvalid();
    }

    // Delete the rule
    delete rules[_senderWallet][_senderToken][_signerToken];

    // Emit an UnsetRule event
    emit UnsetRule(_senderWallet, _senderToken, _signerToken);
  }

  /**
   * @notice Perform an atomic swap using the Swap contract
   * @dev Forwards to underlying Swap contract
   * @param _order ISwap.Order The order to be executed
   */
  function swap(
    ISwap.Order calldata _order,
    address _senderWallet,
    uint256 _maxRoyalty
  ) external {
    Rule storage rule = rules[_senderWallet][_order.sender.token][
      _order.signer.token
    ];
    // Ensure the expiry is not passed
    if (rule.order.expiry <= block.timestamp)
      revert RuleExpiredOrDoesNotExist();

    // Ensure the sender amount matches the rule
    if (_order.sender.amount != rule.order.sender.amount) {
      revert SenderAmountInvalid();
    }

    // Calculate the protocol fee amount using Swap contract
    uint256 protocolFee = swapContract.protocolFee();
    uint256 protocolFeeDivisor = swapContract.FEE_DIVISOR();

    uint256 protocolFeeAmount = (rule.order.sender.amount * protocolFee) /
      protocolFeeDivisor;

    // Calculate the sender amount including affiliate amount, protocol fee and royalty amount
    uint256 royaltyAmount;
    if (supportsRoyalties(_order.signer.token)) {
      (, royaltyAmount) = IERC2981(_order.signer.token).royaltyInfo(
        _order.signer.id,
        _order.sender.amount
      );
    }

    // Calculate the total sender cost which includes NFT price, affiliate amount, protocol fee and royalty amount
    uint256 _senderAmount = rule.order.sender.amount +
      rule.order.affiliateAmount +
      protocolFeeAmount +
      royaltyAmount;

    // Transfer the sender token to this contract using the appropriate adapter
    _transfer(
      _senderWallet,
      address(this),
      _senderAmount,
      rule.order.sender.id,
      rule.order.sender.token,
      rule.order.sender.kind
    );

    SafeTransferLib.safeApprove(
      rule.order.sender.token,
      address(swapContract),
      _senderAmount
    );

    // Execute the swap - the Swap contract will transfer from this contract to signer
    swapContract.swap(address(this), _maxRoyalty, _order);

    // Transfer NFT to signer wallet
    _transfer(
      address(this),
      _senderWallet,
      rule.order.signer.amount,
      rule.order.signer.id,
      rule.order.signer.token,
      rule.order.signer.kind
    );

    // Emit a DelegatedSwapFor event
    emit DelegatedSwapFor(
      _senderWallet,
      rule.order.signer.wallet,
      rule.order.nonce
    );
  }

  /**
   * @notice Authorize a wallet to manage rules
   * @param _manager address Wallet of the manager to authorize
   * @dev Emits an Authorize event
   */
  function authorize(address _manager) external {
    if (_manager == address(0)) revert ManagerInvalid();
    authorized[msg.sender] = _manager;
    senderWallets[_manager] = msg.sender;
    emit Authorize(_manager, msg.sender);
  }

  /**
   * @notice Revoke a manager
   * @dev Emits a Revoke event
   */
  function revoke() external {
    address _tmp = authorized[msg.sender];
    delete authorized[msg.sender];
    delete senderWallets[_tmp];
    emit Revoke(_tmp, msg.sender);
  }

  /**
   * @notice Sets the Swap contract
   * @param _swapContract address
   */
  function setSwapContract(address _swapContract) external onlyOwner {
    if (_swapContract == address(0)) revert AddressInvalid();
    swapContract = ISwap(_swapContract);
  }

  /**
   * @notice Performs token transfer using adapters
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

    // Use delegatecall so underlying transfer is called as Delegate
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
    if (!success) revert TransferFromFailed();
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
   * @notice ERC721Receiver implementation
   * @dev This is a no-op implementation, needed as the contract temporarily receives ERC721 tokens
   * @return bytes4 `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`
   */
  function onERC721Received(
    address /* operator */,
    address /* from */,
    uint256 /* tokenId */,
    bytes calldata /* data */
  ) external pure returns (bytes4) {
    return this.onERC721Received.selector;
  }

  /**
   * @notice ERC1155Receiver implementation
   * @dev This is a no-op implementation, needed as the contract temporarily receives ERC1155 tokens
   * @return bytes4 `bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))`
   */
  function onERC1155Received(
    address /* operator */,
    address /* from */,
    uint256 /* id */,
    uint256 /* value */,
    bytes calldata /* data */
  ) external pure returns (bytes4) {
    return this.onERC1155Received.selector;
  }

  /**
   * @notice ERC1155Receiver batch implementation
   * @dev This is a no-op implementation, needed as the contract temporarily receives ERC1155 tokens
   * @return bytes4 `bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))`
   */
  function onERC1155BatchReceived(
    address /* operator */,
    address /* from */,
    uint256[] calldata /* ids */,
    uint256[] calldata /* values */,
    bytes calldata /* data */
  ) external pure returns (bytes4) {
    return this.onERC1155BatchReceived.selector;
  }
}
