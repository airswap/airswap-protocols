import {
  DrainTo as DrainToEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  SetMax as SetMaxEvent,
  SetScale as SetScaleEvent,
  Withdraw as WithdrawEvent
} from "../generated/Pool/Pool"
import {
  DrainTo,
  OwnershipTransferred,
  SetMax,
  SetScale,
  Withdraw
} from "../generated/schema"

export function handleDrainTo(event: DrainToEvent): void {
  let entity = new DrainTo(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.tokens = event.params.tokens
  entity.dest = event.params.dest
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

export function handleSetMax(event: SetMaxEvent): void {
  let entity = new SetMax(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.max = event.params.max
  entity.save()
}

export function handleSetScale(event: SetScaleEvent): void {
  let entity = new SetScale(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.scale = event.params.scale
  entity.save()
}

export function handleWithdraw(event: WithdrawEvent): void {
  let entity = new Withdraw(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.nonce = event.params.nonce
  entity.expiry = event.params.expiry
  entity.account = event.params.account
  entity.token = event.params.token
  entity.amount = event.params.amount
  entity.score = event.params.score
  entity.save()
}
