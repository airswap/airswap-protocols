import { BigInt, log, EthereumEventParam } from "@graphprotocol/graph-ts"
import {
  Contract,
  AddTokenToBlacklist,
  CreateIndex,
  OwnershipTransferred,
  RemoveTokenFromBlacklist,
  Stake,
  Unstake
} from "../generated/Contract/Contract"
import { Token, Index } from "../generated/schema"

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

export function handleCreateIndex(event: CreateIndex): void {
  // 0x0000000000000000000000000000000000000000 + 0x0000
  // -> 0x00000000000000000000000000000000000000000x0000
  let indexIdentifier = event.params.indexAddress.toHex() + event.params.protocol.toHex()
  let index = new Index(indexIdentifier)

  // handle creation of signer tokens if it doesn't exist
  let signerToken = Token.load(event.params.signerToken.toHex())
  if (signerToken == null) {
    signerToken = new Token(event.params.signerToken.toHex())
    signerToken.isBlacklisted = false
    signerToken.save()
  }

  // handle creation of sender tokens if it doesn't exist
  let senderToken = Token.load(event.params.senderToken.toHex())
  if (senderToken == null) {
    senderToken = new Token(event.params.senderToken.toHex())
    senderToken.isBlacklisted = false
    senderToken.save()
  }
  
  index.signerToken = signerToken.id
  index.senderToken = senderToken.id
  index.save()
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  /* Not Implemented or Tracked */
}

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
