import { BigInt, Bytes } from "@graphprotocol/graph-ts"
import { User, Token, Indexer, DelegateFactory, SwapContract, Locker, Pool } from "../generated/schema"

export function getUser(userAddress: string): User {
  let user = User.load(userAddress)
  // handle new creation of User if they don't exist
  if (!user) {
    user = new User(userAddress)
    user.authorizedSigners = new Array<string>()
    user.authorizedSenders = new Array<string>()
    user.cancelledSwapNonces = new Array<BigInt>()
    user.cancelledSwapLightNonces = new Array<BigInt>()
    user.amountInLocker = BigInt.fromI32(0)
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

export function getLocker(lockerAddress: string): Locker {
  let locker = Locker.load(lockerAddress)
  if (!locker) {
    locker = new Locker(lockerAddress)
    // defaults
    locker.throttlingPercentage = BigInt.fromI32(10)
    locker.throttlingDuration = BigInt.fromI32(604800)
    locker.throttlingBalance = BigInt.fromI32(100)
    locker.save()
  }
  return locker as Locker
}

export function getPool(poolAddress: string): Pool {
  let pool = Pool.load(poolAddress)
  if (!pool) {
    pool = new Pool(poolAddress)
    // defaults
    pool.scale = BigInt.fromI32(10)
    pool.max = BigInt.fromI32(604800)
    pool.roots = new Array<Bytes>()
    pool.save()
  }
  return pool as Pool
}
