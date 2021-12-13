import { BigInt, Address, TypedMap } from "@graphprotocol/graph-ts"
import { Oracle as OracleContract } from '../generated/SwapLightContract/Oracle'
import { ERC20 } from '../generated/SwapLightContract/ERC20'
import { getVolumeDay } from "./EntityHelper"
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

export function updateVolumeDay(event: SwapEvent, swapValue: BigInt): void {
  //the following uses integer division based on the number of seconds in a day to generate the id and date
  let dayId = event.block.timestamp.toI32() / 86400
  let dayStartTimestamp = dayId * 86400

  let volumeDay = getVolumeDay(dayId.toString())
  //setup the dayStartTimeStamp if the entity is new
  if (volumeDay.date == 0) {
    volumeDay.date = dayStartTimestamp
  }
  volumeDay.amount = volumeDay.amount.plus(swapValue.toBigDecimal())
  volumeDay.save()
}
