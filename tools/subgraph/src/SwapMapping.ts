import { BigInt, log } from "@graphprotocol/graph-ts"
import {
  AuthorizeSender,
  AuthorizeSigner,
  Cancel,
  CancelUpTo,
  RevokeSender,
  RevokeSigner,
  Swap as SwapEvent
} from "../generated/SwapContract/SwapContract"
import { SwapContract, Swap } from "../generated/schema"
import { getUser, getToken } from "./EntityHelper"

export function handleAuthorizeSender(event: AuthorizeSender): void {
  let authorizer = getUser(event.params.authorizerAddress.toHex())
  let sender = getUser(event.params.authorizedSender.toHex())

  let authorizedSenders = authorizer.authorizedSenders
  let currentIdx = authorizedSenders.indexOf(sender.id)
  // only add if sender is not in the list
  if (currentIdx == -1) {
    authorizedSenders.push(sender.id)
    authorizer.authorizedSenders = authorizedSenders
    authorizer.save()
  }
}

export function handleRevokeSender(event: RevokeSender): void {
  let deauthorizer = getUser(event.params.authorizerAddress.toHex())
  let revokedSender = getUser(event.params.revokedSender.toHex())

  let authorizedSenders = deauthorizer.authorizedSenders
  let idxToRemove = authorizedSenders.indexOf(revokedSender.id)
  // only remove if the revokedSender exists
  if (idxToRemove > -1) {
    authorizedSenders.splice(idxToRemove, 1);
    deauthorizer.authorizedSenders = authorizedSenders
    deauthorizer.save()
  }
}

export function handleAuthorizeSigner(event: AuthorizeSigner): void {
  let authorizer = getUser(event.params.authorizerAddress.toHex())
  let signer = getUser(event.params.authorizedSigner.toHex())

  let authorizedSigners = authorizer.authorizedSigners
  let currentIdx = authorizedSigners.indexOf(signer.id)
  // only add if signer is not in the list
  if (currentIdx == -1) {
    authorizedSigners.push(signer.id)
    authorizer.authorizedSigners = authorizedSigners
    authorizer.save()
  }
}

export function handleRevokeSigner(event: RevokeSigner): void {
  let deauthorizer = getUser(event.params.authorizerAddress.toHex())
  let revokedSigner = getUser(event.params.revokedSigner.toHex())

  // handle removal
  let authorizedSigners = deauthorizer.authorizedSigners
  let idxToRemove = authorizedSigners.indexOf(revokedSigner.id)
  // only remove if the revokedSigner exists
  if (idxToRemove > -1) {
    authorizedSigners.splice(idxToRemove, 1);
    deauthorizer.authorizedSigners = authorizedSigners
    deauthorizer.save()
  }
}

export function handleCancel(event: Cancel): void {
  let user = getUser(event.params.signerWallet.toHex())
  let cancelledSwapNonces = user.cancelledSwapNonces
  cancelledSwapNonces.push(event.params.nonce)
  cancelledSwapNonces.sort()
  user.cancelledSwapNonces = cancelledSwapNonces
  user.save()
}

export function handleCancelUpTo(event: CancelUpTo): void {
  let user = getUser(event.params.signerWallet.toHex())
  let cancelledSwapNonces = user.cancelledSwapNonces
  for (let i = BigInt.fromI32(0); i.lt(event.params.nonce); i = i.plus(BigInt.fromI32(1))) {
    // prevent duplicates
    if (cancelledSwapNonces.indexOf(i) > -1) {
      continue
    }
    cancelledSwapNonces.push(i)
  }
  cancelledSwapNonces.sort()
  user.cancelledSwapNonces = cancelledSwapNonces
  user.save()
}

export function handleSwap(event: SwapEvent): void {
  let completedSwap = new Swap(event.params.signerWallet.toHex() + event.params.nonce.toString())

  // create swap contract if it doesn't exist
  let swapContract = SwapContract.load(event.address.toHex())
  if (!swapContract) {
    swapContract = new SwapContract(event.address.toHex())
    swapContract.save()
  }

  let signer = getUser(event.params.signerWallet.toHex())
  let sender = getUser(event.params.senderWallet.toHex())
  let affiliate = getUser(event.params.affiliateWallet.toHex())
  let signerToken = getToken(event.params.signerToken.toHex())
  let senderToken = getToken(event.params.senderToken.toHex())
  let affiliateToken = getToken(event.params.senderToken.toHex())

  completedSwap.swap = swapContract.id
  completedSwap.block = event.block.number
  completedSwap.transactionHash = event.transaction.hash
  completedSwap.timestamp = event.block.timestamp
  completedSwap.from = event.transaction.from
  completedSwap.to = event.transaction.to
  completedSwap.value = event.transaction.value

  completedSwap.nonce = event.params.nonce
  completedSwap.expiry = event.params.timestamp

  completedSwap.signer = signer.id
  completedSwap.signerAmount = event.params.signerAmount
  completedSwap.signerId = event.params.signerId
  completedSwap.signerToken = signerToken.id

  completedSwap.sender = sender.id
  completedSwap.senderAmount = event.params.senderAmount
  completedSwap.senderId = event.params.senderId
  completedSwap.senderToken = senderToken.id

  completedSwap.affiliate = affiliate.id
  completedSwap.affiliateAmount = event.params.affiliateAmount
  completedSwap.affiliateId = event.params.affiliateId
  completedSwap.affiliateToken = affiliateToken.id

  completedSwap.save()
}
