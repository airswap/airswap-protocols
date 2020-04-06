import { BigInt } from "@graphprotocol/graph-ts"
import {
  Contract,
  AddTokenToBlacklist,
  CreateIndex,
  OwnershipTransferred,
  RemoveTokenFromBlacklist,
  Stake,
  Unstake
} from "../generated/Contract/Contract"
import { Token } from "../generated/schema"

export function handleAddTokenToBlacklist(event: AddTokenToBlacklist): void {
  let token = Token.load(event.params.token.toHex())
  // create token if it doesn't exist
  if (token == null) {
    token = new Token(event.params.token.toHex())
  }
  // set token to blacklisted
  token.isBlacklisted = true
  token.save()
}

export function handleCreateIndex(event: CreateIndex): void {}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {}

export function handleRemoveTokenFromBlacklist(
  event: RemoveTokenFromBlacklist
): void {
  let token = Token.load(event.params.token.toHex())
  // create token if it doesn't exist
  if (token == null) {
    token = new Token(event.params.token.toHex())
  }
  // set token to blacklisted
  token.isBlacklisted = false
  token.save()
}

export function handleStake(event: Stake): void {}

export function handleUnstake(event: Unstake): void {}
