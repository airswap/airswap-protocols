import { BigInt, log } from "@graphprotocol/graph-ts"
import { CreateDelegate } from "../generated/DelegateFactory/DelegateFactory"
import { Delegate } from '../generated/templates'
import { User, Indexer, SwapContract, DelegateFactory, DelegateContract } from "../generated/schema"

export function handleCreateDelegate(event: CreateDelegate): void {
  log.info("DELEGATE CREATED!",[])
  
  // handle delegate factory if it doesn't exist
  var delegateFactory = DelegateFactory.load(event.address.toHex())
  if (!delegateFactory) {
    delegateFactory = new DelegateFactory(event.address.toHex())
    delegateFactory.save()
  }

  // handle swap contract if it doesn't exist
  var swap = SwapContract.load(event.params.swapContract.toHex())
  if (!swap) {
    swap = new SwapContract(event.params.swapContract.toHex())
    swap.save()
  }

  // handle indexer if it doesn't exist
  var indexer = Indexer.load(event.params.indexerContract.toHex())
  if (!indexer) {
    indexer = new Indexer(event.params.indexerContract.toHex())
    indexer.save()
  }

  // handle user if it doesn't exist
  var owner = User.load(event.params.delegateContractOwner.toHex())
  if (!owner) {
    owner = new User(event.params.delegateContractOwner.toHex())
    owner.authorizedSigners = new Array<string>()
    owner.authorizedSenders = new Array<string>()
    owner.executedOrders = new Array<string>()
    owner.cancelledNonces = new Array<BigInt>()
    owner.save()
  }

  Delegate.create(event.params.delegateContract)
  var delegate = new DelegateContract(event.params.delegateContract.toHex())
  delegate.factory = delegateFactory.id
  delegate.swap = swap.id
  delegate.indexer = indexer.id
  delegate.owner = owner.id
  delegate.tradeWallet = event.params.delegateTradeWallet
  delegate.save()
}
