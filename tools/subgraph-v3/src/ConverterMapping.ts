import {
  ConvertAndTransfer as ConvertAndTransferEvent,
  DrainTo as DrainToEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  PayeeAdded as PayeeAddedEvent,
  PayeeRemoved as PayeeRemovedEvent
} from "../generated/Converter/Converter"
import {
  ConvertAndTransfer,
  DrainTo,
  OwnershipTransferred,
  PayeeAdded,
  PayeeRemoved
} from "../generated/schema"

export function handleConvertAndTransfer(event: ConvertAndTransferEvent): void {
  let entity = new ConvertAndTransfer(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.triggerAccount = event.params.triggerAccount
  entity.swapFromToken = event.params.swapFromToken
  entity.swapToToken = event.params.swapToToken
  entity.amountTokenFrom = event.params.amountTokenFrom
  entity.amountTokenTo = event.params.amountTokenTo
  entity.recievedAddresses = event.params.recievedAddresses
  entity.save()
}

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

export function handlePayeeAdded(event: PayeeAddedEvent): void {
  let entity = new PayeeAdded(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.account = event.params.account
  entity.shares = event.params.shares
  entity.save()
}

export function handlePayeeRemoved(event: PayeeRemovedEvent): void {
  let entity = new PayeeRemoved(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.account = event.params.account
  entity.save()
}
