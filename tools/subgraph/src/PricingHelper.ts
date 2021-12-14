import { BigInt, Address, TypedMap } from "@graphprotocol/graph-ts"
import { Oracle as OracleContract } from '../generated/SwapLightContract/Oracle'
import { ERC20 } from '../generated/SwapLightContract/ERC20'
import { getCollectedFeesDay } from "./EntityHelper"
import {
  Swap as SwapEvent,
} from "../generated/SwapLightContract/SwapLightContract"

const CHAINLINK_FEED_REGISTRY_ADDRESS = "0x47Fb2585D2C56Fe188D0E6ec628a38b74fCeeeDf";
const USD_DENOMINATION = "0x0000000000000000000000000000000000000348"

function getPrice(tokenAddress: string): BigInt {
  let oracleContract = OracleContract.bind(Address.fromString(CHAINLINK_FEED_REGISTRY_ADDRESS))
  let roundData = oracleContract.try_latestRoundData(
    Address.fromString(tokenAddress),
    Address.fromString(USD_DENOMINATION)
  )

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

export function computeValueUsd(signerToken: string, signerAmount: BigInt): BigInt {
  let base64 = BigInt.fromI32(2).pow(64) //used to keep precision

  let signerTokenPrice = getPrice(signerToken) // 8 decimals USD
  let signerTokenPriceNormalizedx64 = signerTokenPrice.times(base64).div(BigInt.fromI32(10).pow(8)) //should be a decimal whole, precision kept by base64

  let tokenDecimals: BigInt = getTokenDecimals(signerToken) // 6,8,18 decimals - depends on the token
  let signerAmountNormalizedx64 = signerAmount.times(base64).div(BigInt.fromI32(10).pow(<u8>tokenDecimals.toI32())) // should be a decimal whole, precision kept by base64

  let valueUsdx64 = signerAmountNormalizedx64.times(signerTokenPriceNormalizedx64)
  let valueUsd = valueUsdx64.div(base64.pow(2))

  return valueUsd
}

export function computeFeeAmountUsd(swapValueUsd: BigInt, protocolFee: BigInt, divisor: BigInt): BigInt {
  return swapValueUsd.times(protocolFee).div(divisor)
}

export function updateCollectedFeesDay(event: SwapEvent, feeValueUsd: BigInt): void {
  //the following uses integer division based on the number of seconds in a day to generate the id and date
  let dayId = event.block.timestamp.toI32() / 86400
  let dayStartTimestamp = dayId * 86400

  let feesDay = getCollectedFeesDay(dayId.toString())
  //setup the dayStartTimeStamp if the entity is new
  if (feesDay.date == 0) {
    feesDay.date = dayStartTimestamp
  }
  feesDay.amount = feesDay.amount.plus(feeValueUsd.toBigDecimal())
  feesDay.save()
}
