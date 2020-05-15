import { BigInt, store } from "@graphprotocol/graph-ts"
import { FillRule, CreateRule, DeleteRule } from "../generated/templates/DelegateV2/DelegateV2"
import { V2Delegate, V2Rule } from "../generated/schema"
import { getUser, getToken } from "./EntityHelper"

export function handleCreateRule(event: CreateRule): void {
  let owner = getUser(event.params.owner.toHex())
  let signerToken = getToken(event.params.signerToken.toHex())
  let senderToken = getToken(event.params.senderToken.toHex())

  let ruleIdentifier = 
    event.address.toHex() + 
    event.params.ruleID.toString()

  let rule = V2Rule.load(ruleIdentifier)
  // create base portion of rule if it doesn't not exist
  if (!rule) {
    rule = new V2Rule(ruleIdentifier)
    rule.delegate = V2Delegate.load(event.address.toHex()).id
    rule.owner = owner.id
    rule.signerToken = signerToken.id
    rule.senderToken = senderToken.id
  }
  rule.signerAmount = event.params.signerAmount
  rule.senderAmount = event.params.senderAmount
  rule.save()
}

export function handleDeleteRule(event: DeleteRule): void {
  let ruleIdentifier = 
    event.address.toHex() + 
    event.params.ruleID.toString()
  store.remove("V2Rule", ruleIdentifier)
}

export function handleFillRule(event: FillRule): void {
  let ruleIdentifier = 
    event.address.toHex() + 
    event.params.ruleID.toString()

  let rule = V2Rule.load(ruleIdentifier)
  rule.senderAmount = rule.senderAmount.minus(event.params.senderAmount)
  rule.signerAmount = rule.senderAmount.minus(event.params.signerAmount)
  rule.save()
}
