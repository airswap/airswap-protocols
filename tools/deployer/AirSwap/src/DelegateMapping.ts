import { BigInt, log, store } from "@graphprotocol/graph-ts"
import { ProvideOrder, SetRule, UnsetRule } from "../generated/templates/Delegate/Delegate"
import { User, Token, DelegateContract, Rule } from "../generated/schema"

export function handleSetRule(event: SetRule): void {
  // handle user if it doesn't exist
  var owner = User.load(event.params.owner.toHex())
  if (!owner) {
    owner = new User(event.params.owner.toHex())
    owner.authorizedSigners = new Array<string>()
    owner.authorizedSenders = new Array<string>()
    owner.executedOrders = new Array<string>()
    owner.cancelledNonces = new Array<BigInt>()
    owner.save()
  }

  var signerToken = Token.load(event.params.signerToken.toHex())
  if (!signerToken) {
    signerToken = new Token(event.params.signerToken.toHex())
    signerToken.isBlacklisted = false
    signerToken.save()
  }

  var senderToken = Token.load(event.params.senderToken.toHex())
  if (!senderToken) {
    senderToken = new Token(event.params.senderToken.toHex())
    senderToken.isBlacklisted = false
    senderToken.save()
  }

  var ruleIdentifier = 
    event.address.toHex() + 
    event.params.senderToken.toHex() + 
    event.params.signerToken.toHex()

  var rule = Rule.load(ruleIdentifier)
  // create base portion of rule if it doesn't not exist
  if (!rule) {
    rule = new Rule(ruleIdentifier)
    rule.delegate = DelegateContract.load(event.address.toHex()).id
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
  var ruleIdentifier = 
    event.address.toHex() + 
    event.params.senderToken.toHex() + 
    event.params.signerToken.toHex()

  store.remove("Rule", ruleIdentifier)
}

export function handleProvideOrder(event: ProvideOrder): void {
  // var ruleIdentifier = 
  //   event.address.toHex() + 
  //   event.params.senderToken.toHex() + 
  //   event.params.signerToken.toHex()

  // var rule = Rule.load(ruleIdentifier)
  // rule.maxSenderAmount = BigInt.fromI32(rule.maxSenderAmount.toI32() - event.params.senderAmount.toI32())
  // // if rule is to have been fully consumed, remove it
  // if (rule.maxSenderAmount == BigInt.fromI32(0)) {
  //   store.remove("Rule", ruleIdentifier)
  // } else {
  //   rule.save()
  // }
}
