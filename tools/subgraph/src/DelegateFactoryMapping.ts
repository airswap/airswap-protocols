import { CreateDelegate } from "../generated/DelegateFactory/DelegateFactory"
import { Delegate as DelegateContract } from '../generated/templates'
import { Delegate } from "../generated/schema"
import { getUser, getDelegateFactory, getIndexer, getSwapContract } from "./EntityHelper"

export function handleCreateDelegate(event: CreateDelegate): void {
  let delegateFactory = getDelegateFactory(event.address.toHex())
  let swap = getSwapContract(event.params.swapContract.toHex())
  let indexer = getIndexer(event.params.indexerContract.toHex())
  let owner = getUser(event.params.delegateContractOwner.toHex())

  DelegateContract.create(event.params.delegateContract) // begins indexing this delegate
  let delegate = new Delegate(event.params.delegateContract.toHex())
  delegate.factory = delegateFactory.id
  delegate.swap = swap.id
  delegate.indexer = indexer.id
  delegate.owner = owner.id
  delegate.tradeWallet = event.params.delegateTradeWallet
  delegate.save()
}
