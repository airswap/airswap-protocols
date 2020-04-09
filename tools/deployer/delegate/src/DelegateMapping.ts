import { BigInt, log, store } from "@graphprotocol/graph-ts"
import { ProvideOrder, SetRule, UnsetRule } from "../generated/templates/Delegate/Delegate"
import { DelegateRule } from "../generated/schema"

export function handleSetRule(event: SetRule): void {
  var ruleIdentifier = 
    event.params.owner.toHex() + 
    event.params.senderToken.toHex() + 
    event.params.signerToken.toHex()

  var rule = DelegateRule.load(ruleIdentifier)
  if (!rule) {
    rule = new DelegateRule(ruleIdentifier)
    rule.delegate = event.address
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
  var ruleIdentifier = 
    event.params.owner.toHex() + 
    event.params.senderToken.toHex() + 
    event.params.signerToken.toHex()
  store.remove("DelegateRule", ruleIdentifier)
}

export function handleProvideOrder(event: ProvideOrder): void {
  var ruleIdentifier = 
    event.params.owner.toHex() + 
    event.params.senderToken.toHex() + 
    event.params.signerToken.toHex()
  var rule = DelegateRule.load(ruleIdentifier)
  rule.maxSenderAmount = BigInt.fromI32(rule.maxSenderAmount.toI32() - event.params.senderAmount.toI32())
  if (rule.maxSenderAmount == BigInt.fromI32(0)) {
    store.remove("DelegateRule", ruleIdentifier)
  } else {
    rule.save()
  }
}
