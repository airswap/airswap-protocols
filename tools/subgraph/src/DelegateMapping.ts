import { BigInt, store } from "@graphprotocol/graph-ts"
import { ProvideOrder, SetRule, UnsetRule } from "../generated/templates/Delegate/Delegate"
import { Delegate, Rule } from "../generated/schema"
import { getUser, getToken } from "./EntityHelper"

export function handleSetRule(event: SetRule): void {
  let owner = getUser(event.params.owner.toHex())
  let signerToken = getToken(event.params.signerToken.toHex())
  let senderToken = getToken(event.params.senderToken.toHex())

  let ruleIdentifier = 
    event.address.toHex() + 
    event.params.senderToken.toHex() + 
    event.params.signerToken.toHex()

  let rule = Rule.load(ruleIdentifier)
  // create base portion of rule if it doesn't not exist
  if (!rule) {
    rule = new Rule(ruleIdentifier)
    rule.delegate = Delegate.load(event.address.toHex()).id
    rule.owner = owner.id
    rule.signerToken = signerToken.id
    rule.senderToken = senderToken.id
  }
  rule.maxSenderAmount = event.params.maxSenderAmount
  rule.priceCoef = event.params.priceCoef
  rule.priceExp = event.params.priceExp
  rule.save()
}

export function handleUnsetRule(event: UnsetRule): void {
  let ruleIdentifier = 
    event.address.toHex() + 
    event.params.senderToken.toHex() + 
    event.params.signerToken.toHex()
  store.remove("Rule", ruleIdentifier)
}

export function handleProvideOrder(event: ProvideOrder): void {
  let ruleIdentifier = 
    event.address.toHex() + 
    event.params.senderToken.toHex() + 
    event.params.signerToken.toHex()

  let rule = Rule.load(ruleIdentifier)
  rule.maxSenderAmount = rule.maxSenderAmount.minus(event.params.senderAmount)
  // if rule is to have been fully consumed, remove it
  if (rule.maxSenderAmount == BigInt.fromI32(0)) {
    store.remove("Rule", ruleIdentifier)
  } else {
    rule.save()
  }
}
