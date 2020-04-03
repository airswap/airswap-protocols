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
//  let entity = AuthorizedSender.load(event.transaction.hash.toHex())

//  if (entity == null) {
//    entity = new AuthorizedSender(event.transaction.hash.toHex())
//  }
//
//  entity.isAuthorized = true
//  entity.authorizerAddress = event.params.authorizerAddress
//  entity.authorizedSender = event.params.authorizedSender
//  entity.save()
  log.info("handleAuthorizeSender not implemented", [])
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
