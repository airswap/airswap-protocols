import {
  Authorize as AuthorizeEvent,
  Cancel as CancelEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  Revoke as RevokeEvent,
  SetProtocolFee as SetProtocolFeeEvent,
  SetProtocolFeeLight as SetProtocolFeeLightEvent,
  SetProtocolFeeWallet as SetProtocolFeeWalletEvent,
  SetRebateMax as SetRebateMaxEvent,
  SetRebateScale as SetRebateScaleEvent,
  SetStaking as SetStakingEvent,
  Swap as SwapEvent
} from "../generated/Swap/Swap"
import {
  Authorize,
  Cancel,
  OwnershipTransferred,
  Revoke,
  SetProtocolFee,
  SetProtocolFeeLight,
  SetProtocolFeeWallet,
  SetRebateMax,
  SetRebateScale,
  SetStaking,
  Swap
} from "../generated/schema"

export function handleAuthorize(event: AuthorizeEvent): void {
  let entity = new Authorize(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.signer = event.params.signer
  entity.signerWallet = event.params.signerWallet
  entity.save()
}

export function handleCancel(event: CancelEvent): void {
  let entity = new Cancel(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.nonce = event.params.nonce
  entity.signerWallet = event.params.signerWallet
  entity.save()
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.previousOwner = event.params.previousOwner
  entity.newOwner = event.params.newOwner
  entity.save()
}

export function handleRevoke(event: RevokeEvent): void {
  let entity = new Revoke(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.signer = event.params.signer
  entity.signerWallet = event.params.signerWallet
  entity.save()
}

export function handleSetProtocolFee(event: SetProtocolFeeEvent): void {
  let entity = new SetProtocolFee(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.protocolFee = event.params.protocolFee
  entity.save()
}

export function handleSetProtocolFeeLight(
  event: SetProtocolFeeLightEvent
): void {
  let entity = new SetProtocolFeeLight(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.protocolFeeLight = event.params.protocolFeeLight
  entity.save()
}

export function handleSetProtocolFeeWallet(
  event: SetProtocolFeeWalletEvent
): void {
  let entity = new SetProtocolFeeWallet(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.feeWallet = event.params.feeWallet
  entity.save()
}

export function handleSetRebateMax(event: SetRebateMaxEvent): void {
  let entity = new SetRebateMax(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.rebateMax = event.params.rebateMax
  entity.save()
}

export function handleSetRebateScale(event: SetRebateScaleEvent): void {
  let entity = new SetRebateScale(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.rebateScale = event.params.rebateScale
  entity.save()
}

export function handleSetStaking(event: SetStakingEvent): void {
  let entity = new SetStaking(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.staking = event.params.staking
  entity.save()
}

export function handleSwap(event: SwapEvent): void {
  let entity = new Swap(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.nonce = event.params.nonce
  entity.timestamp = event.params.timestamp
  entity.signerWallet = event.params.signerWallet
  entity.signerToken = event.params.signerToken
  entity.signerAmount = event.params.signerAmount
  entity.protocolFee = event.params.protocolFee
  entity.senderWallet = event.params.senderWallet
  entity.senderToken = event.params.senderToken
  entity.senderAmount = event.params.senderAmount
  entity.save()
}
