import { ethers } from 'ethers'
import { toBuffer } from 'ethereumjs-util'
import {
  signTypedData,
  recoverTypedSignature,
  SignTypedDataVersion,
} from '@metamask/eth-sig-util'

import { lowerCaseAddresses } from '../index'
import {
  chainIds,
  SECONDS_IN_DAY,
  ADDRESS_ZERO,
  DOMAIN_VERSION_SWAP,
  DOMAIN_NAME_SWAP,
} from '@airswap/constants'

import {
  UnsignedOrder,
  OrderParty,
  Signature,
  EIP712Swap,
  Order,
  FullOrder,
} from '@airswap/types'

const defaultParty: OrderParty = {
  wallet: ADDRESS_ZERO,
  token: ADDRESS_ZERO,
  kind: '0x36372b07',
  id: '0',
  amount: '0',
}

function isValidString(value: string): boolean {
  return typeof value === 'string' && value.length > 0
}
function isBytesLike(value: string): boolean {
  return typeof value === 'string' && ethers.utils.isBytesLike(value)
}
function isValidOrderParty(orderParty: OrderParty): boolean {
  return (
    !!orderParty &&
    isValidString(orderParty['wallet']) &&
    isValidString(orderParty['token']) &&
    isValidString(orderParty['kind']) &&
    isValidString(orderParty['id']) &&
    isValidString(orderParty['amount'])
  )
}

export function isValidOrder(order: Order): boolean {
  return (
    !!order &&
    isValidString(order['nonce']) &&
    isValidString(order['expiry']) &&
    isValidString(order['protocolFee']) &&
    isValidString(order['affiliateWallet']) &&
    isValidString(order['affiliateAmount']) &&
    isBytesLike(order['r']) &&
    isBytesLike(order['s']) &&
    isValidString(order['v']) &&
    isValidOrderParty(order['signer']) &&
    isValidOrderParty(order['sender'])
  )
}

export function isValidFullOrder(fullOrder: FullOrder) {
  return (
    isValidOrder(fullOrder as Order) &&
    ethers.utils.isAddress(fullOrder['swapContract']) &&
    typeof fullOrder['chainId'] == 'number'
  )
}

export function createOrder({
  nonce = Date.now(),
  expiry = Math.round(Date.now() / 1000 + SECONDS_IN_DAY).toString(),
  protocolFee = 0,
  signer = {},
  sender = {},
  affiliateWallet = ADDRESS_ZERO,
  affiliateAmount = 0,
}): UnsignedOrder {
  return lowerCaseAddresses({
    nonce: String(nonce),
    expiry: String(expiry),
    protocolFee: String(protocolFee),
    signer: { ...defaultParty, ...signer },
    sender: { ...defaultParty, ...sender },
    affiliateWallet: String(affiliateWallet),
    affiliateAmount: String(affiliateAmount),
  })
}

export async function createOrderSignature(
  unsignedOrder: UnsignedOrder,
  signer: ethers.VoidSigner | string,
  swapContract: string,
  chainId = chainIds.MAINNET,
  version = DOMAIN_VERSION_SWAP,
  name = DOMAIN_NAME_SWAP
): Promise<Signature> {
  let sig
  if (typeof signer === 'string') {
    sig = signTypedData({
      version: SignTypedDataVersion.V4,
      privateKey: toBuffer(signer),
      data: {
        types: EIP712Swap,
        domain: {
          verifyingContract: swapContract,
          chainId,
          version,
          name,
        },
        primaryType: 'Order',
        message: unsignedOrder,
      },
    })
  } else {
    sig = await signer._signTypedData(
      {
        verifyingContract: swapContract,
        chainId,
        version,
        name,
      },
      { Order: EIP712Swap.Order, Party: EIP712Swap.Party },
      unsignedOrder
    )
  }
  const { r, s, v } = ethers.utils.splitSignature(sig)
  return { r, s, v: String(v) }
}

export function getSignerFromOrderSignature(
  order: UnsignedOrder,
  swapContract: string,
  chainId: number,
  v: string,
  r: string,
  s: string
): string {
  const sig = `${r}${s.slice(2)}${ethers.BigNumber.from(v)
    .toHexString()
    .slice(2)}`
  return recoverTypedSignature({
    version: SignTypedDataVersion.V4,
    signature: sig,
    data: {
      types: EIP712Swap,
      domain: {
        name: DOMAIN_NAME_SWAP,
        version: DOMAIN_VERSION_SWAP,
        chainId,
        verifyingContract: swapContract,
      },
      primaryType: 'Order',
      message: order,
    },
  })
}
