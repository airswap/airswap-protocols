import {
  CancelDurationChange as CancelDurationChangeEvent,
  CompleteDurationChange as CompleteDurationChangeEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  ProposeDelegate as ProposeDelegateEvent,
  ScheduleDurationChange as ScheduleDurationChangeEvent,
  SetDelegate as SetDelegateEvent,
  Transfer as TransferEvent
} from "../generated/Staking/Staking"
import {
  CancelDurationChange,
  CompleteDurationChange,
  OwnershipTransferred,
  ProposeDelegate,
  ScheduleDurationChange,
  SetDelegate,
  Transfer
} from "../generated/schema"

export function handleCancelDurationChange(
  event: CancelDurationChangeEvent
): void {
  let entity = new CancelDurationChange(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )

  entity.save()
}

export function handleCompleteDurationChange(
  event: CompleteDurationChangeEvent
): void {
  let entity = new CompleteDurationChange(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.newDuration = event.params.newDuration
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

export function handleProposeDelegate(event: ProposeDelegateEvent): void {
  let entity = new ProposeDelegate(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.delegate = event.params.delegate
  entity.account = event.params.account
  entity.save()
}

export function handleScheduleDurationChange(
  event: ScheduleDurationChangeEvent
): void {
  let entity = new ScheduleDurationChange(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.unlockTimestamp = event.params.unlockTimestamp
  entity.save()
}

export function handleSetDelegate(event: SetDelegateEvent): void {
  let entity = new SetDelegate(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.delegate = event.params.delegate
  entity.account = event.params.account
  entity.save()
}

export function handleTransfer(event: TransferEvent): void {
  let entity = new Transfer(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.from = event.params.from
  entity.to = event.params.to
  entity.tokens = event.params.tokens
  entity.save()
}
