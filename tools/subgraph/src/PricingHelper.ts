import { BigInt, Bytes } from "@graphprotocol/graph-ts"
import { User, Token, Indexer, DelegateFactory, SwapContract, Locker, Pool, CollectedFees } from "../generated/schema"
import { ERC20 } from '../generated/ERC20/ERC20'

const supportedOracles: Record<string, string> = {
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': '', // WETH
  '0x6b175474e89094c44da98b954eedeac495271d0f': '', // DAI
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': '', // USDC
  '0xdac17f958d2ee523a2206206994597c13d831ec7': '', // USDT  
}

export function getPrice(tokenAddress: string): BigInt {
  let tokenContract = ERC20.bind(tokenAddress)

  //check if tokenAddress is in supportedOracles
  //if not in supportedOracles return 0
  //if in supporteedOracles then query and return price
  return BigInt.fromI32(0)
}