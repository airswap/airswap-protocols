import { CreateDelegate } from "../generated/DelegateV2Factory/DelegateV2Factory"
import { V2Delegate as DelegateV2Contract } from '../generated/templates'
import { V2Delegate } from "../generated/schema"
import { getUser, getDelegateV2Factory, getIndexer, getSwapContract } from "./EntityHelper"

export function handleCreateDelegateV2(event: CreateDelegate): void {
  let delegateFactory = getDelegateV2Factory(event.address.toHex())
  let swap = getSwapContract(event.params.swapContract.toHex())
  let indexer = getIndexer(event.params.indexerContract.toHex())
  let owner = getUser(event.params.delegateContractOwner.toHex())

  DelegateV2Contract.create(event.params.delegateContract) // begins indexing this delegate
  let delegate = new V2Delegate(event.params.delegateContract.toHex())
  delegate.factory = delegateFactory.id
  delegate.swap = swap.id
  delegate.indexer = indexer.id
  delegate.owner = owner.id
  delegate.tradeWallet = event.params.delegateTradeWallet
  delegate.save()
}
