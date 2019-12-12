pragma solidity ^0.5.10;
pragma experimental ABIEncoderV2;

import "@airswap/types/contracts/Types.sol";
import "@airswap/tokens/contracts/interfaces/INRERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC721/IERC721.sol";
import "@airswap/swap/contracts/interfaces/ISwap.sol";

contract PreSwapChecker {

  bytes constant internal DOM_NAME = "SWAP";
  bytes constant internal DOM_VERSION = "2";

  bytes4 constant internal ERC721_INTERFACE_ID = 0x80ac58cd;


  function checkSwapSwap(
    Types.Order calldata order
  ) external view returns (bytes32[] memory) {
    address swap = order.signature.validator;
    bytes32 domainSeparator = Types.hashDomain(DOM_NAME, DOM_VERSION, swap);

    // max size of the number of errors that could exist
    bytes32[] memory errors = new bytes32[](10);
    uint8 errorCount;

    // Check self transfer
    if (order.signer.wallet == order.sender.wallet) {
      errors[errorCount] = 'INVALID_SELF_TRANSFER';
      errorCount++;
    }

    // Check expiry
    if (order.expiry < block.timestamp) {
      errors[errorCount] = 'ORDER_EXPIRED';
      errorCount++;
    }

    if (ISwap(swap).signerNonceStatus(order.signer.wallet, order.nonce) != 0x00) {
      errors[errorCount] = 'ORDER_TAKEN_OR_CANCELLED';
      errorCount++;
    }

    if (order.nonce < ISwap(swap).signerMinimumNonce(order.signer.wallet)) {
      errors[errorCount] = 'NONCE_TOO_LOW';
      errorCount++;
    }

    // Check the order sender
    if (order.sender.wallet != address(0)) {
      // The sender was specified
      // Check their token balance
      if (!hasBalance(order.sender)) {
        errors[errorCount] = 'SENDER_BALANCE';
        errorCount++;
      }

      // Check their approval
      if (!isApproved(order.sender, swap)) {
        errors[errorCount] = 'SENDER_ALLOWANCE';
        errorCount++;
      }
    }

    // Check the order signer
    if (!hasBalance(order.signer)) {
      errors[errorCount] = 'SIGNER_BALANCE';
      errorCount++;
    }

    // Check their approval
    if (!isApproved(order.signer, swap)) {
      errors[errorCount] = 'SIGNER_ALLOWANCE';
      errorCount++;
    }

    if (!isValid(order, domainSeparator)) {
      errors[errorCount] = 'INVALID_SIG';
      errorCount++;
    }

    if (order.signature.signatory != order.signer.wallet) {
      if(!ISwap(swap).signerAuthorizations(order.signer.wallet, order.signature.signatory)) {
        errors[errorCount] = 'SIGNER_UNAUTHORIZED';
        errorCount++;
      }
    }

    return errors;
  }


  // function to check a party has enough balance to swap
  function hasBalance(
    Types.Party memory party
  ) internal view returns (bool) {
    if (party.kind == ERC721_INTERFACE_ID) {
      address owner = IERC721(party.token).ownerOf(party.param);
      return (owner == party.wallet);
    }
    uint256 balance = INRERC20(party.token).balanceOf(party.wallet);
    return (balance >= party.param);
  }

  // function to check a party has enough allowance to swap
  function isApproved(
    Types.Party memory party,
    address swap
  ) internal view returns (bool) {
    if (party.kind == ERC721_INTERFACE_ID) {
      address approved = IERC721(party.token).getApproved(party.param);
      return (swap == approved);
    }
    uint256 allowance = INRERC20(party.token).allowance(party.wallet, swap);
    return (allowance >= party.param);
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