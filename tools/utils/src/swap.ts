import {
  SignTypedDataVersion,
  recoverTypedSignature,
  signTypedData,
} from '@metamask/eth-sig-util'
import { toBuffer } from 'ethereumjs-util'
import { ethers } from 'ethers'

import { lowerCaseAddresses } from '../index'
import {
  ADDRESS_ZERO,
  ChainIds,
  DOMAIN_NAME_SWAP,
  DOMAIN_VERSION_SWAP,
  SECONDS_IN_DAY,
} from './constants'

import { Settlement, Signature } from './types'

import lzString from 'lz-string'

export const EIP712Swap = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
  ],
  Order: [
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' },
    { name: 'protocolFee', type: 'uint256' },
    { name: 'signer', type: 'Party' },
    { name: 'sender', type: 'Party' },
    { name: 'affiliateWallet', type: 'address' },
    { name: 'affiliateAmount', type: 'uint256' },
  ],
  Party: [
    { name: 'wallet', type: 'address' },
    { name: 'token', type: 'address' },
    { name: 'kind', type: 'bytes4' },
    { name: 'id', type: 'uint256' },
    { name: 'amount', type: 'uint256' },
  ],
}

export type OrderParty = {
  wallet: string
  token: string
  kind: string
  id: string
  amount: string
}

export type UnsignedOrder = {
  nonce: string
  expiry: string
  protocolFee: string
  signer: OrderParty
  sender: OrderParty
  affiliateWallet: string
  affiliateAmount: string
}

export type Order = UnsignedOrder & Signature

export type FullOrder = UnsignedOrder & Signature & Settlement

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
    isValidString(orderParty.wallet) &&
    isValidString(orderParty.token) &&
    isValidString(orderParty.kind) &&
    isValidString(orderParty.id) &&
    isValidString(orderParty.amount)
  )
}

export function isValidOrder(order: Order): boolean {
  return (
    !!order &&
    isValidString(order.nonce) &&
    isValidString(order.expiry) &&
    isValidString(order.protocolFee) &&
    isValidString(order.affiliateWallet) &&
    isValidString(order.affiliateAmount) &&
    isBytesLike(order.r) &&
    isBytesLike(order.s) &&
    isValidString(order.v) &&
    isValidOrderParty(order.signer) &&
    isValidOrderParty(order.sender)
  )
}

export function isValidFullOrder(fullOrder: FullOrder) {
  return (
    isValidOrder(fullOrder as Order) &&
    ethers.utils.isAddress(fullOrder.swapContract) &&
    typeof fullOrder.chainId === 'number'
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
  chainId = ChainIds.MAINNET,
  version = DOMAIN_VERSION_SWAP,
  name = DOMAIN_NAME_SWAP
): Promise<Signature> {
  let sig: string
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

export function orderToParams(
  order: Order
): [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string
] {
  return [
    order.nonce,
    order.expiry,
    order.protocolFee,
    order.signer.wallet,
    order.signer.token,
    order.signer.kind,
    order.signer.id,
    order.signer.amount,
    order.sender.wallet,
    order.sender.token,
    order.sender.kind,
    order.sender.id,
    order.sender.amount,
    order.affiliateWallet,
    order.affiliateAmount,
    order.v,
    order.r,
    order.s,
  ]
}

export function fullOrderToParams(
  order: FullOrder
): [
  number,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string
] {
  // Helper to get the type of a field from EIP712Swap
  const getFieldType = (field: string): string => {
    const orderField = EIP712Swap.Order.find((f) => f.name === field)
    if (orderField) return orderField.type
    const partyField = EIP712Swap.Party.find((f) => f.name === field)
    if (partyField) return partyField.type
    return 'string'
  }

  const sanitizeValue = (val: any, field: string): string => {
    if (!val && val !== 0) {
      const type = getFieldType(field)
      if (type === 'address') return ADDRESS_ZERO
      if (type === 'uint256') return '0'
      if (type === 'bytes4') return '0x00000000'
      return ''
    }
    return String(val)
  }

  return [
    order.chainId,
    order.swapContract,
    sanitizeValue(order.nonce, 'nonce'),
    sanitizeValue(order.expiry, 'expiry'),
    sanitizeValue(order.protocolFee, 'protocolFee'),
    sanitizeValue(order.signer?.wallet, 'wallet'),
    sanitizeValue(order.signer?.token, 'token'),
    sanitizeValue(order.signer?.kind, 'kind'),
    sanitizeValue(order.signer?.id, 'id'),
    sanitizeValue(order.signer?.amount, 'amount'),
    sanitizeValue(order.sender?.wallet, 'wallet'),
    sanitizeValue(order.sender?.token, 'token'),
    sanitizeValue(order.sender?.kind, 'kind'),
    sanitizeValue(order.sender?.id, 'id'),
    sanitizeValue(order.sender?.amount, 'amount'),
    sanitizeValue(order.affiliateWallet, 'affiliateWallet'),
    sanitizeValue(order.affiliateAmount, 'affiliateAmount'),
    sanitizeValue(order.v, 'v'),
    sanitizeValue(order.r, 'r'),
    sanitizeValue(order.s, 's'),
  ]
}

export function paramsToFullOrder(str: string): FullOrder {
  const split = str.split(',')
  return {
    chainId: Number(split[0]),
    swapContract: split[1],
    nonce: split[2],
    expiry: split[3],
    protocolFee: split[4],
    signer: {
      wallet: split[5],
      token: split[6],
      kind: split[7],
      id: split[8],
      amount: split[9],
    },
    sender: {
      wallet: split[10],
      token: split[11],
      kind: split[12],
      id: split[13],
      amount: split[14],
    },
    affiliateWallet: split[15],
    affiliateAmount: split[16],
    v: split[17],
    r: split[18],
    s: split[19],
  }
}

export function compressFullOrder(order: FullOrder): string {
  return lzString.compressToEncodedURIComponent(
    fullOrderToParams(order).join(',')
  )
}

export function decompressFullOrder(str: string): FullOrder {
  return paramsToFullOrder(lzString.decompressFromEncodedURIComponent(str))
}
