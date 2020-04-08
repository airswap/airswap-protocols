import { BigInt } from "@graphprotocol/graph-ts"
import { ProvideOrder, SetRule, UnsetRule } from "../generated/templates/Delegate/Delegate"
import { DelegateRule, ProvidedOrder } from "../generated/schema"

export function handleSetRule(event: SetRule): void {
  var ruleIdentifier = 
    event.params.owner.toHex() + 
    event.params.senderToken.toHex() + 
    event.params.signerToken.toHex()

  var rule = DelegateRule.load(ruleIdentifier)
  if (!rule) {
    rule = new DelegateRule(ruleIdentifier)
    rule.owner = event.params.owner
    rule.signerToken = event.params.signerToken
    rule.senderToken = event.params.senderToken
  }
  rule.maxSenderAmount = event.params.maxSenderAmount
  rule.priceCoef = event.params.priceCoef
  rule.priceExp = event.params.priceExp
  rule.save()
}

export function handleUnsetRule(event: UnsetRule): void {
}

export function handleProvideOrder(event: ProvideOrder): void {
}
