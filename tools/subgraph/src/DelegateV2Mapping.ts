import { BigInt, store } from "@graphprotocol/graph-ts"
import { FillRule, CreateRule, DeleteRule } from "../generated/templates/DelegateV2/DelegateV2"
import { DelegateV2, RuleV2 } from "../generated/schema"
import { getUser, getToken } from "./EntityHelper"

export function handleCreateRule(event: CreateRule): void {
  let owner = getUser(event.params.owner.toHex())
  let signerToken = getToken(event.params.signerToken.toHex())
  let senderToken = getToken(event.params.senderToken.toHex())

  let ruleIdentifier = 
    event.address.toHex() + 
    event.params.senderToken.toHex() + 
    event.params.signerToken.toHex()

  let rule = RuleV2.load(ruleIdentifier)
  // create base portion of rule if it doesn't not exist
  if (!rule) {
    rule = new RuleV2(ruleIdentifier)
    rule.delegate = DelegateV2.load(event.address.toHex()).id
    rule.owner = owner.id
    rule.signerToken = signerToken.id
    rule.senderToken = senderToken.id
  }
  rule.signerAmount = event.params.signerAmount
  rule.senderAmount = event.params.senderAmount
  rule.save()
}

export function handleDeleteRule(event: DeleteRule): void {
  // let ruleIdentifier = 
  //   event.address.toHex() + 
  //   event.params.senderToken.toHex() + 
  //   event.params.signerToken.toHex()
  // store.remove("Rule", ruleIdentifier)
}

export function handleFillRule(event: FillRule): void {
  // let ruleIdentifier = 
  //   event.address.toHex() + 
  //   event.params.senderToken.toHex() + 
  //   event.params.signerToken.toHex()

  // let rule = Rule.load(ruleIdentifier)
  // rule.maxSenderAmount = rule.maxSenderAmount.minus(event.params.senderAmount)
  // // if rule is to have been fully consumed, remove it
  // if (rule.maxSenderAmount == BigInt.fromI32(0)) {
  //   store.remove("Rule", ruleIdentifier)
  // } else {
  //   rule.save()
  // }
}
