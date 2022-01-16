import { BigInt } from "@graphprotocol/graph-ts"
import {
  Swap as SwapEvent
} from "../generated/SwapLightContract/SwapLightContract"
import { getVolumeDay } from "./EntityHelper"

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
