pragma solidity ^0.5.10;
pragma experimental ABIEncoderV2;

import "@airswap/types/contracts/Types.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC721/IERC721.sol";
import "openzeppelin-solidity/contracts/introspection/ERC165Checker.sol";
import "@airswap/swap/contracts/interfaces/ISwap.sol";
import "@airswap/swap/contracts/Swap.sol";
import "@airswap/transfers/contracts/TransferHandlerRegistry.sol";

contract PreSwapChecker {
  using ERC165Checker for address;

  bytes constant internal DOM_NAME = "SWAP";
  bytes constant internal DOM_VERSION = "2";

  bytes4 constant internal ERC721_INTERFACE_ID = 0x80ac58cd;
  bytes4 constant internal ERC20_INTERFACE_ID = 0x36372b07;

  function checkSwapSwap(
    Types.Order calldata order
  ) external view returns (uint256, bytes32[] memory) {
    address swap = order.signature.validator;
    bytes32 domainSeparator = Types.hashDomain(DOM_NAME, DOM_VERSION, swap);

    // max size of the number of errors that could exist
    bytes32[] memory errors = new bytes32[](10);
    uint8 errorCount;

    // Check self transfer
    if (order.signer.wallet == order.sender.wallet) {
      errors[errorCount] = "SELF_TRANSFER_INVALID";
      errorCount++;
    }

    // Check expiry
    if (order.expiry < block.timestamp) {
      errors[errorCount] = "ORDER_EXPIRED";
      errorCount++;
    }

    if (ISwap(swap).signerNonceStatus(order.signer.wallet, order.nonce) != 0x00) {
      errors[errorCount] = "ORDER_TAKEN_OR_CANCELLED";
      errorCount++;
    }

    if (order.nonce < ISwap(swap).signerMinimumNonce(order.signer.wallet)) {
      errors[errorCount] = "NONCE_TOO_LOW";
      errorCount++;
    }

    // check if ERC721 or ERC20 only amount or id set for sender
    if (order.sender.kind == ERC20_INTERFACE_ID && order.sender.id != 0) {
      errors[errorCount] = "SENDER_INVALID_ID";
      errorCount++;
    } else if (order.sender.kind == ERC721_INTERFACE_ID && order.sender.amount != 0) {
      errors[errorCount] = "SENDER_INVALID_AMOUNT";
      errorCount++;
    }

    // check if ERC721 or ERC20 only amount or id set for signer
    if (order.signer.kind == ERC20_INTERFACE_ID && order.signer.id != 0) {
      errors[errorCount] = "SIGNER_INVALID_ID";
      errorCount++;
    } else if (order.signer.kind == ERC721_INTERFACE_ID && order.signer.amount != 0) {
      errors[errorCount] = "SIGNER_INVALID_AMOUNT";
      errorCount++;
    }

    // Check valid token registry handler for sender
    if (hasValidKind(order.sender.kind, swap)) {
      // Check the order sender
      if (order.sender.wallet != address(0)) {
        // The sender was specified
        // Check if sender kind interface can correctly check balance
        if (order.sender.kind == ERC721_INTERFACE_ID && !hasValidERC71Interface(order.sender)) {
          errors[errorCount] = "SENDER_INVALID_ERC721";
          errorCount++;
        } else {
          // Check the order sender token balance
          if (!hasBalance(order.sender)) {
            errors[errorCount] = "SENDER_BALANCE";
            errorCount++;
          }

          // Check their approval
          if (!isApproved(order.sender, swap)) {
            errors[errorCount] = "SENDER_ALLOWANCE";
            errorCount++;
          }
        }
      }
    } else {
      errors[errorCount] = "SENDER_TOKEN_KIND_UNKNOWN";
      errorCount++;
    }

     // Check valid token registry handler for signer
    if (hasValidKind(order.signer.kind, swap)) {
      // Check if sender kind interface can correctly check balance
      if (order.signer.kind == ERC721_INTERFACE_ID && !hasValidERC71Interface(order.signer)) {
        errors[errorCount] = "SIGNER_INVALID_ERC721";
        errorCount++;
      } else {
        // Check the order signer token balance
        if (!hasBalance(order.signer)) {
          errors[errorCount] = "SIGNER_BALANCE";
          errorCount++;
        }

        // Check their approval
        if (!isApproved(order.signer, swap)) {
          errors[errorCount] = "SIGNER_ALLOWANCE";
          errorCount++;
        }
      }
    } else {
      errors[errorCount] = "SIGNER_TOKEN_KIND_UNKNOWN";
      errorCount++;
    }

    if (!isValid(order, domainSeparator)) {
      errors[errorCount] = "INVALID_SIG";
      errorCount++;
    }

    if (order.signature.signatory != order.signer.wallet) {
      if(!ISwap(swap).signerAuthorizations(order.signer.wallet, order.signature.signatory)) {
        errors[errorCount] = "SIGNER_UNAUTHORIZED";
        errorCount++;
      }
    }

    return (errorCount, errors);
  }

  // function to check a party has used a known kinda
  function hasValidKind(
    bytes4 kind,
    address swap
  ) internal view returns (bool) {
    TransferHandlerRegistry tokenRegistry = Swap(swap).registry();
    return (address(tokenRegistry.transferHandlers(kind)) != address(0));
  }

  // checks for valid interfaces for ERC165 tokens, ERC721
  function hasValidERC71Interface(
    Types.Party memory party
  ) internal view returns (bool) {
    return (party.kind == ERC721_INTERFACE_ID && (party.token)._supportsInterface(ERC721_INTERFACE_ID));
  }

  // function to check a party has enough balance to swap
  function hasBalance(
    Types.Party memory party
  ) internal view returns (bool) {
    if (party.kind == ERC721_INTERFACE_ID) {
      address owner = IERC721(party.token).ownerOf(party.id);
      return (owner == party.wallet);
    }

    uint256 balance = IERC20(party.token).balanceOf(party.wallet);
    return (balance >= party.amount);
  }

  // function to check a party has enough allowance to swap
  function isApproved(
    Types.Party memory party,
    address swap
  ) internal view returns (bool) {
    if (party.kind == ERC721_INTERFACE_ID) {
      address approved = IERC721(party.token).getApproved(party.id);
      return (swap == approved);
    }
    uint256 allowance = IERC20(party.token).allowance(party.wallet, swap);
    return (allowance >= party.amount);
  }

  // function to check order signature
  function isValid(
    Types.Order memory order,
    bytes32 domainSeparator
  ) internal pure returns (bool) {
    if (order.signature.v == 0) {
      return true;
    }
    if (order.signature.version == byte(0x01)) {
      return order.signature.signatory == ecrecover(
        Types.hashOrder(
          order,
          domainSeparator
        ),
        order.signature.v,
        order.signature.r,
        order.signature.s
      );
    }
    if (order.signature.version == byte(0x45)) {
      return order.signature.signatory == ecrecover(
        keccak256(
          abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            Types.hashOrder(order, domainSeparator)
          )
        ),
        order.signature.v,
        order.signature.r,
        order.signature.s
      );
    }
    return false;
  }

}
