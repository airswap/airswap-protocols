import { BigInt, log } from "@graphprotocol/graph-ts"
import {
  Cancel,
  Swap as SwapEvent
} from "../generated/SwapLightContract/SwapLightContract"
import { SwapLightContract, SwapLight } from "../generated/schema"
import { getUser, getToken } from "./EntityHelper"

export function handleCancel(event: Cancel): void {
  let user = getUser(event.params.signerWallet.toHex())
  let cancelledNonces = user.cancelledSwapLightNonces
  cancelledNonces.push(event.params.nonce)
  cancelledNonces.sort()
  user.cancelledSwapLightNonces = cancelledNonces
  user.save()
}

export function handleSwap(event: SwapEvent): void {
  let completedSwap = new SwapLight(event.params.signerWallet.toHex() + event.params.nonce.toString())

  // create swap contract if it doesn't exist
  let swapContract = SwapLightContract.load(event.address.toHex())
  if (!swapContract) {
    swapContract = new SwapLightContract(event.address.toHex())
    swapContract.save()
  }

  let signer = getUser(event.params.signerWallet.toHex())
  let sender = getUser(event.params.senderWallet.toHex())
  let signerToken = getToken(event.params.signerToken.toHex())
  let senderToken = getToken(event.params.senderToken.toHex())

  completedSwap.swap = swapContract.id
  completedSwap.block = event.block.number
  completedSwap.transactionHash = event.transaction.hash
  completedSwap.timestamp = event.block.timestamp
  completedSwap.from = event.transaction.from
  completedSwap.to = event.transaction.to
  completedSwap.value = event.transaction.value

  completedSwap.nonce = event.params.nonce
  completedSwap.expiry = event.params.timestamp

  completedSwap.signer = signer.id
  completedSwap.signerAmount = event.params.signerAmount
  completedSwap.signerToken = signerToken.id
  completedSwap.signerFee = event.params.signerFee

  completedSwap.sender = sender.id
  completedSwap.senderAmount = event.params.senderAmount
  completedSwap.senderToken = senderToken.id

  completedSwap.save()
}
