import { BigInt, log, store } from "@graphprotocol/graph-ts"
import {
  SetLocator,
  UnsetLocator
} from "../generated/templates/Index/Index"
import { IndexContract, User, Locator } from "../generated/schema"

export function handleSetLocator(event: SetLocator): void {

  var user = User.load(event.params.identifier.toHex())
  if (!user) {
    user = new User(event.params.identifier.toHex())
    user.authorizedSigners = new Array<string>()
    user.authorizedSenders = new Array<string>()
    user.executedOrders = new Array<string>()
    user.cancelledNonces = new Array<BigInt>()
    user.save()
  }

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
