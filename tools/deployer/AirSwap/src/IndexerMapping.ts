import { BigInt, log, store } from "@graphprotocol/graph-ts"
import {
  AddTokenToBlacklist,
  CreateIndex,
  OwnershipTransferred,
  RemoveTokenFromBlacklist,
  Stake,
  Unstake
} from "../generated/Indexer/Indexer"
import { Index } from '../generated/templates'
import { Token, Indexer, IndexContract, StakedAmount } from "../generated/schema"
import { getUser, getToken, getIndexer } from "./EntityHelper"

export function handleOwnershipTransferred(event: OwnershipTransferred): void {	
  /* Not Implemented or Tracked */	
}

export function handleAddTokenToBlacklist(event: AddTokenToBlacklist): void {
  let token = getToken(event.params.token.toHex())
  // add token to blacklist
  token.isBlacklisted = true
  token.save()
}

export function handleRemoveTokenFromBlacklist(event: RemoveTokenFromBlacklist): void {
  let token = getToken(event.params.token.toHex())
  // remove token from blackliste
  token.isBlacklisted = false
  token.save()
}

export function handleCreateIndex(event: CreateIndex): void {
  let signerToken = getToken(event.params.signerToken.toHex())
  let senderToken = getToken(event.params.senderToken.toHex())
  let indexer = getIndexer(event.address.toHex())

  Index.create(event.params.indexAddress) // begins indexing this index
  let index = new IndexContract(event.params.indexAddress.toHex())
  index.indexer = indexer.id
  index.protocol = event.params.protocol
  index.signerToken = signerToken.id
  index.senderToken = senderToken.id
  index.save()
}

export function handleStake(event: Stake): void {
  let staker = getUser(event.params.staker.toHex())
  let stakeIdentifier = event.params.staker.toHex() + event.address.toHex()

  let stakedAmount = StakedAmount.load(stakeIdentifier)
  // create base portion of stake if it doesn't exist
  if (!stakedAmount) {
    stakedAmount = new StakedAmount(stakeIdentifier)
    let indexer = getIndexer(event.address.toHex())
    let signerToken = getToken(event.params.signerToken.toHex())
    let senderToken = getToken(event.params.senderToken.toHex())
    stakedAmount.indexer = indexer.id
    stakedAmount.staker = staker.id
    stakedAmount.signerToken = signerToken.id
    stakedAmount.senderToken = senderToken.id
    stakedAmount.protocol = event.params.protocol
  }
  stakedAmount.stakeAmount = event.params.stakeAmount
  stakedAmount.save()
}

export function handleUnstake(event: Unstake): void {
  let stakeIdentifier = event.params.staker.toHex() + event.address.toHex() 
  store.remove("StakedAmount", stakeIdentifier)
}
