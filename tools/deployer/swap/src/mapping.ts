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
}

export function handleAuthorizeSigner(event: AuthorizeSigner): void {}

export function handleCancel(event: Cancel): void {
  let signer = event.params.signerWallet
  let user = User.load(signer)

  if (user == null) {
    user = new User(signer)
  }

  let cancelledNonces = user.cancelledNonces
  cancelledNonces.push(event.params.nonce)
  user.cancelledNonces = cancelledNonces

  user.save()
}

export function handleCancelUpTo(event: CancelUpTo): void {}

export function handleRevokeSender(event: RevokeSender): void {}

export function handleRevokeSigner(event: RevokeSigner): void {}

export function handleSwap(event: Swap): void {}
