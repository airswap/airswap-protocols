import { store } from "@graphprotocol/graph-ts"
import {
  AddTokenToBlacklist,
  CreateIndex,
  OwnershipTransferred,
  RemoveTokenFromBlacklist,
  Stake as StakeEvent,
  Unstake
} from "../generated/Indexer/Indexer"
import { Index as IndexContract } from '../generated/templates'
import { Index, Stake } from "../generated/schema"
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

  IndexContract.create(event.params.indexAddress) // begins indexing this index
  let index = new Index(event.params.indexAddress.toHex())
  index.indexer = indexer.id
  index.protocol = event.params.protocol
  index.signerToken = signerToken.id
  index.senderToken = senderToken.id
  index.save()
}

export function handleStake(event: StakeEvent): void {
  let staker = getUser(event.params.staker.toHex())
  let stakeIdentifier = event.params.staker.toHex() + event.address.toHex()

  let stake = Stake.load(stakeIdentifier)
  // create base portion of stake if it doesn't exist
  if (!stake) {
    stake = new Stake(stakeIdentifier)
    let indexer = getIndexer(event.address.toHex())
    let signerToken = getToken(event.params.signerToken.toHex())
    let senderToken = getToken(event.params.senderToken.toHex())
    stake.indexer = indexer.id
    stake.staker = staker.id
    stake.signerToken = signerToken.id
    stake.senderToken = senderToken.id
    stake.protocol = event.params.protocol
  }
  stake.stakeAmount = event.params.stakeAmount
  stake.save()
}

export function handleUnstake(event: Unstake): void {
  let stakeIdentifier = event.params.staker.toHex() + event.address.toHex() 
  store.remove("Stake", stakeIdentifier)
}
