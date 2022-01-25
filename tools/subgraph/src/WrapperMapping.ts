import {
  WrappedSwapFor as WrappedSwapForEvent
} from "../generated/Wrapper/Wrapper"
import { WrappedSwapFor } from "../generated/schema"


export function handleWrappedSwapFor(event: WrappedSwapForEvent): void {
  let completedSwapFor = new WrappedSwapFor(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  completedSwapFor.senderWallet = event.params.senderWallet
  completedSwapFor.save()
}
