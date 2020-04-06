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
import { ExampleEntity } from "../generated/schema"

export function handleAddTokenToBlacklist(event: AddTokenToBlacklist): void {}

export function handleCreateIndex(event: CreateIndex): void {}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {}

export function handleRemoveTokenFromBlacklist(
  event: RemoveTokenFromBlacklist
): void {}

export function handleStake(event: Stake): void {}

export function handleUnstake(event: Unstake): void {}
