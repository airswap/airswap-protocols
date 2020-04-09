import { log, store } from "@graphprotocol/graph-ts"
import {
  SetLocator,
  UnsetLocator
} from "../generated/templates/Index/Index"
import { Index, Locator } from "../generated/schema"

export function handleSetLocator(event: SetLocator): void {
  var identifier = event.params.identifier.toHex() + event.address.toHex()
  var locator = Locator.load(identifier)
  if (!locator) {
    locator = new Locator(identifier)
    locator.owner = event.params.identifier
    locator.index = Index.load(event.address.toHex()).id
  }
  locator.score = event.params.score
  locator.locator = event.params.locator
  locator.save()
}

export function handleUnsetLocator(event: UnsetLocator): void {
  var identifier = event.params.identifier.toHex() + event.address.toHex()
  store.remove("Locator", identifier)
}
