import { BigInt, log } from "@graphprotocol/graph-ts"
import {
  Contract,
  AuthorizeSender,
  AuthorizeSigner,
  Cancel,
  CancelUpTo,
  RevokeSender,
  RevokeSigner,
  Swap
} from "../generated/Contract/Contract"
import { User, ExecutedOrder } from "../generated/schema"

export function handleAuthorizeSender(event: AuthorizeSender): void {
  let authorizerAddress = event.params.authorizerAddress.toHex()
  let authorizer = User.load(authorizerAddress)

  // handle new creation of User (signer)
  if (!authorizer) {
    authorizer = new User(authorizerAddress)
    authorizer.authorizedSigners = new Array<string>()
    authorizer.authorizedSenders = new Array<string>()
    authorizer.executedOrders = new Array<string>()
    authorizer.cancelledNonces = new Array<BigInt>()
  }

  let senderAddress = event.params.authorizedSender.toHex()
  let sender = User.load(senderAddress) 
  // handle new creation of User (sender)
  if (!sender) {
    sender = new User(senderAddress)
    sender.authorizedSigners = new Array<string>()
    sender.authorizedSenders = new Array<string>()
    sender.executedOrders = new Array<string>()
    sender.cancelledNonces = new Array<BigInt>()
    sender.save()
  }

  let authorizedSenders = authorizer.authorizedSenders
  let currentIdx = authorizedSenders.indexOf(sender.id)
  // only add if sender is not in the list
  if (currentIdx == -1) {
    authorizedSenders.push(sender.id)
    authorizer.authorizedSenders = authorizedSenders
    authorizer.save()
  }
}

export function handleAuthorizeSigner(event: AuthorizeSigner): void {
  let authorizerAddress = event.params.authorizerAddress.toHex()
  let authorizer = User.load(authorizerAddress)

  // handle new creation of User
  if (!authorizer) {
    authorizer = new User(authorizerAddress)
    authorizer.authorizedSigners = new Array<string>()
    authorizer.authorizedSenders = new Array<string>()
    authorizer.executedOrders = new Array<string>()
    authorizer.cancelledNonces = new Array<BigInt>()
  }

  let signerAddress = event.params.authorizedSigner.toHex()
  let signer = User.load(signerAddress) 
  // handle new creation of User (signer)
  if (!signer) {
    signer = new User(signerAddress)
    signer.authorizedSigners = new Array<string>()
    signer.authorizedSenders = new Array<string>()
    signer.executedOrders = new Array<string>()
    signer.cancelledNonces = new Array<BigInt>()
    signer.save()
  }

  let authorizedSigners = authorizer.authorizedSigners
  let currentIdx = authorizedSigners.indexOf(signer.id)
  // only add if signer is not in the list
  if (currentIdx == -1) {
    log.info("signer: {} not found for sender: {}, adding", [signer.id, authorizer.id])
    authorizedSigners.push(signer.id)
    authorizer.authorizedSigners = authorizedSigners
    authorizer.save()
  }
}

export function handleCancel(event: Cancel): void {
  let signer = event.params.signerWallet.toHex()
  let user = User.load(signer)

  // handle new creation of User
  if (!user) {
    user = new User(signer)
    user.authorizedSigners = new Array<string>()
    user.authorizedSenders = new Array<string>()
    user.executedOrders = new Array<string>()
    user.cancelledNonces = new Array<BigInt>()
  }

  let cancelledNonces = user.cancelledNonces
  cancelledNonces.push(event.params.nonce)
  cancelledNonces.sort()
  user.cancelledNonces = cancelledNonces
  user.save()
}

export function handleCancelUpTo(event: CancelUpTo): void {
  let signer = event.params.signerWallet.toHex()
  let user = User.load(signer)

  // handle new creation of User
  if (!user) {
    user = new User(signer)
    user.authorizedSigners = new Array<string>()
    user.authorizedSenders = new Array<string>()
    user.executedOrders = new Array<string>()
    user.cancelledNonces = new Array<BigInt>()
  }
  let cancelledNonces = user.cancelledNonces
  for (let i = BigInt.fromI32(0); i.lt(event.params.nonce); i = i.plus(BigInt.fromI32(1))) {
    // prevent duplicates
    if (cancelledNonces.indexOf(i) > -1) {
      continue
    }
    cancelledNonces.push(i)
  }
  cancelledNonces.sort()
  user.cancelledNonces = cancelledNonces
  user.save()
}

export function handleRevokeSender(event: RevokeSender): void {
  let deauthorizerAddress = event.params.authorizerAddress.toHex()
  let deauthorizer = User.load(deauthorizerAddress)

  // handle new creation of User
  if (!deauthorizer) {
    deauthorizer = new User(deauthorizerAddress)
    deauthorizer.authorizedSigners = new Array<string>()
    deauthorizer.authorizedSenders = new Array<string>()
    deauthorizer.executedOrders = new Array<string>()
    deauthorizer.cancelledNonces = new Array<BigInt>()
  }

  let revokedSenderAddress = event.params.revokedSender.toHex()
  let revokedSender = User.load(revokedSenderAddress) 
  // handle new creation of User (revokedSender)
  if (!revokedSender) {
    revokedSender = new User(revokedSenderAddress)
    revokedSender.authorizedSigners = new Array<string>()
    revokedSender.authorizedSenders = new Array<string>()
    revokedSender.executedOrders = new Array<string>()
    revokedSender.cancelledNonces = new Array<BigInt>()
    revokedSender.save()
  }

  // handle removal
  let authorizedSenders = deauthorizer.authorizedSenders
  let idxToRemove = authorizedSenders.indexOf(revokedSender.id)
  // only remove if the revokedSender exists
  if (idxToRemove > -1) {
    authorizedSenders.splice(idxToRemove, 1);
    deauthorizer.authorizedSenders = authorizedSenders
    deauthorizer.save()
  }
}

export function handleRevokeSigner(event: RevokeSigner): void {
  let deauthorizerAddress = event.params.authorizerAddress.toHex()
  let deauthorizer = User.load(deauthorizerAddress)

  // handle new creation of User
  if (!deauthorizer) {
    deauthorizer = new User(deauthorizerAddress)
    deauthorizer.authorizedSigners = new Array<string>()
    deauthorizer.authorizedSenders = new Array<string>()
    deauthorizer.executedOrders = new Array<string>()
    deauthorizer.cancelledNonces = new Array<BigInt>()
  }

  let revokedSignerAddress = event.params.revokedSigner.toHex()
  let revokedSigner = User.load(revokedSignerAddress) 
  // handle new creation of User (revokedSigner)
  if (!revokedSigner) {
    revokedSigner = new User(revokedSignerAddress)
    revokedSigner.authorizedSigners = new Array<string>()
    revokedSigner.authorizedSenders = new Array<string>()
    revokedSigner.executedOrders = new Array<string>()
    revokedSigner.cancelledNonces = new Array<BigInt>()
    revokedSigner.save()
  }

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

export function handleSwap(event: Swap): void {
  let executedOrder = new ExecutedOrder(event.params.signerWallet.toHex() + event.params.nonce.toString())
  executedOrder.nonce = event.params.nonce
  executedOrder.expiry = event.params.timestamp

  executedOrder.signer = event.params.signerWallet.toHex()
  executedOrder.signerAmount = event.params.signerAmount
  executedOrder.signerTokenId = event.params.signerId
  executedOrder.signerTokenAddress = event.params.signerToken

  executedOrder.sender = event.params.senderWallet.toHex()
  executedOrder.senderAmount = event.params.senderAmount
  executedOrder.senderTokenId = event.params.senderId
  executedOrder.senderTokenAddress = event.params.senderToken

  executedOrder.affiliate = event.params.affiliateWallet.toHex()
  executedOrder.affiliateAmount = event.params.affiliateAmount
  executedOrder.affiliateTokenId = event.params.affiliateId
  executedOrder.affiliateTokenAddress = event.params.affiliateToken

  executedOrder.save()
}
