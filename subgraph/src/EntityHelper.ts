import { BigInt, log } from "@graphprotocol/graph-ts"
import { User, Token, Indexer, DelegateFactory, SwapContract } from "../generated/schema"

export function getUser(userAddress: string): User {
  let user = User.load(userAddress)
  // handle new creation of User if they don't exist
  if (!user) {
    user = new User(userAddress)
    user.authorizedSigners = new Array<string>()
    user.authorizedSenders = new Array<string>()
    user.executedOrders = new Array<string>()
    user.cancelledNonces = new Array<BigInt>()
    user.save()
  }
  return user as User
}

export function getToken(tokenAddress: string): Token {
  let token = Token.load(tokenAddress)
  // handle new creation of Token if it doesn't exist
  if (!token) {
    token = new Token(tokenAddress)
    token.isBlacklisted = false
    token.save()
  }
  return token as Token
}

export function getIndexer(indexerAddress: string): Indexer {
  let indexer = Indexer.load(indexerAddress)
  if (!indexer) {
    indexer = new Indexer(indexerAddress)
    indexer.save()
  }
  return indexer as Indexer
}

export function getDelegateFactory(delegateFactoryAddress: string): DelegateFactory {
  let delegateFactory = DelegateFactory.load(delegateFactoryAddress)
  if (!delegateFactory) {
    delegateFactory = new DelegateFactory(delegateFactoryAddress)
    delegateFactory.save()
  }
  return delegateFactory as DelegateFactory
}

export function getSwapContract(swapAddress: string): SwapContract {
  let swap = SwapContract.load(swapAddress)
  if (!swap) {
    swap = new SwapContract(swapAddress)
    swap.save()
  }  
  return swap as SwapContract
}
