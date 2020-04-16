import { BigInt, log, store } from "@graphprotocol/graph-ts"
import {
  SetLocator,
  UnsetLocator
} from "../generated/templates/Index/Index"
import { IndexContract, Locator } from "../generated/schema"
import { getUser } from "./EntityHelper"

export function handleSetLocator(event: SetLocator): void {
  let user = getUser(event.params.identifier.toHex())
  var identifier = event.params.identifier.toHex() + event.address.toHex()
  var locator = Locator.load(identifier)
  if (!locator) {
    locator = new Locator(identifier)
    locator.owner = user.id
    locator.index = IndexContract.load(event.address.toHex()).id
  }
  locator.score = event.params.score
  locator.locator = event.params.locator
  locator.save()
}

export function handleUnsetLocator(event: UnsetLocator): void {
  var identifier = event.params.identifier.toHex() + event.address.toHex()
  store.remove("Locator", identifier)
}
