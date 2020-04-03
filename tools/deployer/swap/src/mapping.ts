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

  // handle new creation of User
  if (authorizer == null) {
    authorizer = new User(authorizerAddress)
    authorizer.authorizedSigners = new Array<string>()
    authorizer.authorizedSenders = new Array<string>()
    authorizer.executedOrders = new Array<string>()
    authorizer.cancelledNonces = new Array<BigInt>()
  }

  let senderAddress = event.params.authorizedSender.toHex()
  let sender = User.load(senderAddress) 
  // handle new creation of User
  if (sender == null) {
    sender = new User(senderAddress)
    sender.authorizedSigners = new Array<string>()
    sender.authorizedSenders = new Array<string>()
    sender.executedOrders = new Array<string>()
    sender.cancelledNonces = new Array<BigInt>()
    sender.save()
  }

  let authorizedSenders = authorizer.authorizedSenders
  // authorizedSenders.push(sender)
  // authorizer.authorizedSenders = authorizedSenders
  authorizer.save()
}

export function handleAuthorizeSigner(event: AuthorizeSigner): void {
  log.info("handleAuthorizeSigner not implemented", [])
}

export function handleCancel(event: Cancel): void {
  let signer = event.params.signerWallet.toHex()
  let user = User.load(signer)

  // handle new creation of User
  if (user == null) {
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
  if (user == null) {
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
  log.info("handleRevokeSender not implemented", [])
}

export function handleRevokeSigner(event: RevokeSigner): void {
  log.info("handleRevokeSigner not implemented", [])
}

export function handleSwap(event: Swap): void {
  log.info("handleSwap not implemented", [])
}
