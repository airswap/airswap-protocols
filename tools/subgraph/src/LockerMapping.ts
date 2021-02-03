import { Lock, Unlock, SetThrottlingPercentage, SetThrottlingDuration, SetThrottlingBalance } from "../generated/LockerContract/LockerContract"
import { getUser, getLocker } from "./EntityHelper"

export function handleLock(event: Lock): void {
  let user = getUser(event.params.participant.toHex())
  user.amountInLocker = user.amountInLocker.plus(event.params.amount)
  user.save()
}

export function handleUnlock(event: Unlock): void {
  let user = getUser(event.params.participant.toHex())
  user.amountInLocker = user.amountInLocker.minus(event.params.amount)
  user.save()
}

export function handleSetThrottlingPercentage(event: SetThrottlingPercentage): void {
  let locker = getLocker(event.address.toHex())
  locker.throttlingPercentage = event.params.throttlingPercentage
  locker.save()
}

export function handleSetThrottlingDuration(event: SetThrottlingDuration): void {
  let locker = getLocker(event.address.toHex())
  locker.throttlingPercentage = event.params.throttlingDuration
  locker.save()
}

export function handleSetThrottlingBalance(event: SetThrottlingBalance): void {
  let locker = getLocker(event.address.toHex())
  locker.throttlingPercentage = event.params.throttlingBalance
  locker.save()
}