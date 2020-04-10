import { log } from "@graphprotocol/graph-ts"
import { CreateDelegate } from "../generated/DelegateFactory/DelegateFactory"
import { Delegate } from '../generated/templates'
import { User, Indexer, SwapContract, DelegateFactory, DelegateContract } from "../generated/schema"

export function handleCreateDelegate(event: CreateDelegate): void {

  // handle delegate factory if it doesn't exist
  var delegateFactory = DelegateFactory.load(event.address.toHex())
  if (!delegateFactory) {
    delegateFactory = new DelegateFactory(event.address.toHex())
    delegateFactory.save()
  }

  Delegate.create(event.params.delegateContract)
  var delegate = new DelegateContract(event.params.delegateContract.toHex())
  delegate.factory = delegateFactory.id
  delegate.swap = SwapContract.load(event.params.swapContract.toHex()).id
  delegate.indexer = Indexer.load(event.params.indexerContract.toHex()).id
  delegate.owner = User.load(event.params.delegateContractOwner.toHex()).id
  delegate.tradeWallet = event.params.delegateTradeWallet
  delegate.save()
}
