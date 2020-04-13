import { BigInt, log } from "@graphprotocol/graph-ts"
import { CreateDelegate } from "../generated/DelegateFactory/DelegateFactory"
import { Delegate } from '../generated/templates'
import { DelegateContract } from "../generated/schema"
import { getUser, getDelegateFactory, getIndexer, getSwapContract } from "./EntityHelper"

export function handleCreateDelegate(event: CreateDelegate): void {
  let delegateFactory = getDelegateFactory(event.address.toHex())
  let swap = getSwapContract(event.params.swapContract.toHex())
  let indexer = getIndexer(event.params.indexerContract.toHex())
  let owner = getUser(event.params.delegateContractOwner.toHex())

  Delegate.create(event.params.delegateContract)
  let delegate = new DelegateContract(event.params.delegateContract.toHex())
  delegate.factory = delegateFactory.id
  delegate.swap = swap.id
  delegate.indexer = indexer.id
  delegate.owner = owner.id
  delegate.tradeWallet = event.params.delegateTradeWallet
  delegate.save()
}
