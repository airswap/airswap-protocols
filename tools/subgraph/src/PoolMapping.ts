import { Enable, Withdraw, SetScale, SetMax } from "../generated/PoolContract/PoolContract"
import { PoolClaim, EnabledRoot } from "../generated/schema"
import { getUser, getPool, getToken } from "./EntityHelper"

export function handleEnable(event: Enable): void {
  let identifier = event.address.toHex() + event.params.root.toString()
  let enabledRoot = new EnabledRoot(identifier)
  enabledRoot.pool = getPool(event.address.toHex()).id
  enabledRoot.root = event.params.root
  enabledRoot.save()
}

export function handleWithdraw(event: Withdraw): void {
  let identifier = event.params.account.toHex() + event.params.token.toHex() + event.block.timestamp.toString()
  let claim = new PoolClaim(identifier)
  claim.pool = getPool(event.address.toHex()).id
  claim.transactionHash = event.transaction.hash
  claim.user = getUser(event.params.account.toHex()).id
  claim.token = getToken(event.params.token.toHex()).id
  claim.amount = event.params.amount
  claim.save()
}

export function handleSetScale(event: SetScale): void {
  let pool = getPool(event.address.toHex())
  pool.scale = event.params.scale
  pool.save()
}

export function handleSetMax(event: SetMax): void {
  let pool = getPool(event.address.toHex())
  pool.max = event.params.max
  pool.save()
}