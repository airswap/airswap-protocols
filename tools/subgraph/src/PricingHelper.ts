import { BigInt, Address, TypedMap } from "@graphprotocol/graph-ts"
import { Oracle as OracleContract } from '../generated/SwapLightContract/Oracle'
import { ERC20 } from '../generated/SwapLightContract/ERC20'
import { getCollectedFeesDay } from "./EntityHelper"
import {
  Swap as SwapEvent,
  SwapLightContract as SwapContract
} from "../generated/SwapLightContract/SwapLightContract"

let supportedOracles: TypedMap<string, string> = new TypedMap<string, string>()
supportedOracles.set('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419') // WETH
supportedOracles.set('0x6b175474e89094c44da98b954eedeac495271d0f', '0x777A68032a88E5A84678A77Af2CD65A7b3c0775a') // DAI
supportedOracles.set('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', '0x9211c6b3BF41A10F78539810Cf5c64e1BB78Ec60') // USDC
supportedOracles.set('0xdac17f958d2ee523a2206206994597c13d831ec7', '0x2ca5A90D34cA333661083F89D831f757A9A50148') // USDT

function getPrice(tokenAddress: string): BigInt {
  if (!supportedOracles.isSet(tokenAddress)) {
    return BigInt.fromI32(0)
  }
  let oracleContract = OracleContract.bind(Address.fromString(supportedOracles.get(tokenAddress)!))
  let roundData = oracleContract.try_latestRoundData()
  if (roundData.reverted) {
    return BigInt.fromI32(0)
  }
  // (roundId, answer, startedAt, updatedAt, answeredInRound)
  return roundData.value.value1 //answer
}

function getTokenDecimals(tokenAddress: string): BigInt {
  let tokenContract = ERC20.bind(Address.fromString(tokenAddress))
  let value = tokenContract.try_decimals()
  if (value.reverted) {
    return BigInt.fromI32(0)
  }
  return BigInt.fromI32(value.value)
}

function computeFeeAmountUsd(signerToken: string, signerAmount: BigInt, protocolFee: BigInt, divisor: BigInt): BigInt {
  let base64 = BigInt.fromI32(2).pow(64) //used to keep precision

  let signerTokenPrice = getPrice(signerToken) // 8 decimals USD
  let signerTokenPriceNormalizedx64 = signerTokenPrice.times(base64).div(BigInt.fromI32(10).pow(8)) //should be a decimal whole, precision kept by base64

  let feeAmount = signerAmount.times(protocolFee).div(divisor) // quantity of token
  let tokenDecimals: BigInt = getTokenDecimals(signerToken) // 6,8,18 decimals - depends on the token
  let feeAmountNormalizedx64 = feeAmount.times(base64).div(BigInt.fromI32(10).pow(<u8>tokenDecimals.toI32())) // should be a decimal whole, precision kept by base64

  let priceUsdx64 = feeAmountNormalizedx64.times(signerTokenPriceNormalizedx64)
  let priceUsd = priceUsdx64.div(base64)

  return priceUsd
}

export function updateCollectedFeesDay(event: SwapEvent): void {
  let divisor = SwapContract.bind(event.address).FEE_DIVISOR()
  let feeAmountUsd = computeFeeAmountUsd(event.params.signerToken.toHex(), event.params.signerAmount, event.params.protocolFee, divisor)

  //the following uses integer division based on the number of seconds in a day to generate the id and date
  let dayId = event.block.timestamp.toI32() / 86400
  let dayStartTimestamp = dayId * 86400

  let feesDay = getCollectedFeesDay(dayId.toString())
  //setup the dayStartTimeStamp if the entity is new
  if (feesDay.date == 0) {
    feesDay.date = dayStartTimestamp
  }
  feesDay.amount = feesDay.amount.plus(feeAmountUsd.toBigDecimal())
  feesDay.save()
}