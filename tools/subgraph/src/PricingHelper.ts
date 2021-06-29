import { BigInt, Address } from "@graphprotocol/graph-ts"
import { Oracle } from '../generated/SwapContract/Oracle'

const supportedOracles: Record<string, string> = {
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // WETH
  '0x6b175474e89094c44da98b954eedeac495271d0f': '0x777A68032a88E5A84678A77Af2CD65A7b3c0775a', // DAI
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': '0x9211c6b3BF41A10F78539810Cf5c64e1BB78Ec60', // USDC
  '0xdac17f958d2ee523a2206206994597c13d831ec7': '0x2ca5A90D34cA333661083F89D831f757A9A50148', // USDT  
}

export function getPrice(tokenAddress: string): BigInt {
  if (!supportedOracles.Keys.includes(tokenAddress)) {
    return BigInt.fromI32(0)
  }
  let oracleContract = Oracle.bind(Address.fromString(supportedOracles[tokenAddress]))
  let roundData = oracleContract.try_latestRoundData()
  if (roundData.reverted) {
    return BigInt.fromI32(0)
  }
  // (roundId, answer, startedAt, updatedAt, answeredInRound)
  return roundData.value.value1 //answer
}

export function computeFeeAmountUsd(signerToken: string, signerAmount: BigInt, signerFee: BigInt, divisor: BigInt) {
  //TODO: current math here is wrong because the decimals are inconsistent between feeAmount(token decimals) and usd(8 decimals)
  let signerTokenPrice = getPrice(signerToken) // 8 decimals USD
  let feeAmount = signerAmount.times(signerFee).div(divisor) // quantity of token
  return signerTokenPrice.times(feeAmount)
}