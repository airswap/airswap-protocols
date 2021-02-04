import { Enable, Withdraw, SetScale, SetMax } from "../generated/PoolContract/PoolContract"
import { getUser, getPool } from "./EntityHelper"

export function handleEnable(event: Enable): void {
  // let user = getUser(event.params.participant.toHex())
  // user.amountInLocker = user.amountInLocker.plus(event.params.amount)
  // user.save()
}

export function handleWithdraw(event: Withdraw): void {
  // let user = getUser(event.params.participant.toHex())
  // user.amountInLocker = user.amountInLocker.minus(event.params.amount)
  // user.save()
}

export function handleSetScale(event: SetScale): void {
  // let locker = getLocker(event.address.toHex())
  // locker.throttlingPercentage = event.params.throttlingPercentage
  // locker.save()
}

export function handleSetMax(event: SetMax): void {
  // let locker = getLocker(event.address.toHex())
  // locker.throttlingPercentage = event.params.throttlingDuration
  // locker.save()
}