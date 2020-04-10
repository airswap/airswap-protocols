import { BigInt, log, store } from "@graphprotocol/graph-ts"
import { ProvideOrder, SetRule, UnsetRule } from "../generated/templates/Delegate/Delegate"
import { User, Token, DelegateContract, Rule } from "../generated/schema"

export function handleSetRule(event: SetRule): void {
  var ruleIdentifier = 
    event.address.toHex() + 
    event.params.senderToken.toHex() + 
    event.params.signerToken.toHex()

  var rule = Rule.load(ruleIdentifier)
  // create base portion of rule if it doesn't not exist
  if (!rule) {
    rule = new Rule(ruleIdentifier)
    rule.delegate = DelegateContract.load(event.address.toHexString()).id
    rule.owner = User.load(event.params.owner.toHex()).id
    rule.signerToken = Token.load(event.params.signerToken.toHex()).id
    rule.senderToken = Token.load(event.params.senderToken.toHex()).id
  }
  rule.maxSenderAmount = event.params.maxSenderAmount
  rule.priceCoef = event.params.priceCoef
  rule.priceExp = event.params.priceExp
  rule.save()
}

export function handleUnsetRule(event: UnsetRule): void {
  var ruleIdentifier = 
    event.address.toHex() + 
    event.params.senderToken.toHex() + 
    event.params.signerToken.toHex()

  store.remove("Rule", ruleIdentifier)
}

export function handleProvideOrder(event: ProvideOrder): void {
  var ruleIdentifier = 
    event.address.toHex() + 
    event.params.senderToken.toHex() + 
    event.params.signerToken.toHex()

  var rule = Rule.load(ruleIdentifier)
  rule.maxSenderAmount = BigInt.fromI32(rule.maxSenderAmount.toI32() - event.params.senderAmount.toI32())
  // if rule is to have been fully consumed, remove it
  if (rule.maxSenderAmount == BigInt.fromI32(0)) {
    store.remove("Rule", ruleIdentifier)
  } else {
    rule.save()
  }
}
