import { Bytes, log, store } from "@graphprotocol/graph-ts"
import {
  AddTokenToBlacklist,
  CreateIndex,
  OwnershipTransferred,
  RemoveTokenFromBlacklist,
  Stake,
  Unstake
} from "../generated/Indexer/Indexer"
import { User, Token, Indexer, Index, StakedAmount } from "../generated/schema"

export function handleOwnershipTransferred(event: OwnershipTransferred): void {	
  /* Not Implemented or Tracked */	
}

export function handleAddTokenToBlacklist(event: AddTokenToBlacklist): void {
  let token = Token.load(event.params.token.toHex())
  // create token if it doesn't exist
  if (!token) {
    token = new Token(event.params.token.toHex())
  }
  // set token to blacklisted
  token.isBlacklisted = true
  token.save()
}

export function handleRemoveTokenFromBlacklist(event: RemoveTokenFromBlacklist): void {
  let token = Token.load(event.params.token.toHex())
  // create token if it doesn't exist
  if (!token) {
    token = new Token(event.params.token.toHex())
  }
  // set token to blacklisted
  token.isBlacklisted = false
  token.save()
}

export function handleCreateIndex(event: CreateIndex): void {
  // handle creation of signer tokens if it doesn't exist
  let signerToken = Token.load(event.params.signerToken.toHex())
  if (!signerToken) {
    signerToken = new Token(event.params.signerToken.toHex())
    signerToken.isBlacklisted = false
    signerToken.save()
  }

  // handle creation of sender tokens if it doesn't exist
  let senderToken = Token.load(event.params.senderToken.toHex())
  if (!senderToken) {
    senderToken = new Token(event.params.senderToken.toHex())
    senderToken.isBlacklisted = false
    senderToken.save()
  }

  // handle creation of indexer if it doesn't exist
  let indexer = Indexer.load(event.address.toHex())
  if (!indexer) {
    indexer = new Indexer(event.address.toHex())
    indexer.save()
  }

  let index = new Index(event.params.indexAddress.toHex())
  index.indexer = indexer.id
  index.protocol = event.params.protocol
  index.signerToken = signerToken.id
  index.senderToken = senderToken.id
  index.save()
}

export function handleStake(event: Stake): void {
  let stakeIdentifier = event.params.staker.toHex() + event.address.toHex()
  let stakedAmount = StakedAmount.load(stakeIdentifier)
  // create base portion of stake if it doesn't exist
  if (!stakedAmount) {
    stakedAmount = new StakedAmount(stakeIdentifier)
    stakedAmount.indexer = Indexer.load(event.address.toHex()).id
    stakedAmount.staker = User.load(event.params.staker.toHex()).id
  }
  stakedAmount.stakeAmount = event.params.stakeAmount
  stakedAmount.save()
}

export function handleUnstake(event: Unstake): void {
  let stakeIdentifier = event.params.staker.toHex() + event.address.toHex() 
  store.remove("StakedAmount", stakeIdentifier)
}
