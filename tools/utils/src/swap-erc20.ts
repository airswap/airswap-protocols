import {
  SignTypedDataVersion,
  recoverTypedSignature,
  signTypedData,
} from '@metamask/eth-sig-util'
import { toBuffer } from 'ethereumjs-util'
import { ethers } from 'ethers'
import lzString from 'lz-string'

import { abi as ERC20_ABI } from './abis/ERC20.json'
const erc20Interface = new ethers.utils.Interface(ERC20_ABI)

import {
  ADDRESS_ZERO,
  ChainIds,
  DOMAIN_NAME_SWAP_ERC20,
  DOMAIN_VERSION_SWAP_ERC20,
  SECONDS_IN_DAY,
} from './constants'

import type { Signature, Settlement, Transfer } from './types'

export const EIP712SwapERC20 = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
  ],
  OrderERC20: [
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' },
    { name: 'signerWallet', type: 'address' },
    { name: 'signerToken', type: 'address' },
    { name: 'signerAmount', type: 'uint256' },
    { name: 'protocolFee', type: 'uint256' },
    { name: 'senderWallet', type: 'address' },
    { name: 'senderToken', type: 'address' },
    { name: 'senderAmount', type: 'uint256' },
  ],
}

export type UnsignedOrderERC20 = {
  nonce: string
  expiry: string
  signerWallet: string
  signerToken: string
  signerAmount: string
  protocolFee: string
  senderWallet: string
  senderToken: string
  senderAmount: string
}

export type OrderERC20 = {
  nonce: string
  expiry: string
  signerWallet: string
  signerToken: string
  signerAmount: string
  senderToken: string
  senderAmount: string
} & Signature

export type FullOrderERC20 = UnsignedOrderERC20 & Signature & Settlement

export type SwapERC20 = {
  nonce: string
  signerWallet: string
}

export type FullSwapERC20 = {
  signerToken: string
  signerAmount: string
  senderWallet: string
  senderToken: string
  senderAmount: string
  feeAmount: string
} & SwapERC20

export function createOrderERC20({
  nonce = Date.now().toString(),
  expiry = Math.round(Date.now() / 1000 + SECONDS_IN_DAY).toString(),
  signerWallet = ADDRESS_ZERO,
  signerToken = ADDRESS_ZERO,
  signerAmount = '0',
  protocolFee = '0',
  senderWallet = ADDRESS_ZERO,
  senderToken = ADDRESS_ZERO,
  senderAmount = '0',
}: any): UnsignedOrderERC20 {
  return {
    nonce: String(nonce),
    expiry: String(expiry),
    signerWallet,
    signerToken,
    signerAmount: String(signerAmount),
    protocolFee: String(protocolFee),
    senderWallet,
    senderToken,
    senderAmount: String(senderAmount),
  }
}

export async function createOrderERC20Signature(
  unsignedOrder: UnsignedOrderERC20,
  signer: ethers.VoidSigner | string,
  swapContract: string,
  chainId = ChainIds.MAINNET,
  version = DOMAIN_VERSION_SWAP_ERC20,
  name = DOMAIN_NAME_SWAP_ERC20
): Promise<Signature> {
  let sig: string
  if (typeof signer === 'string') {
    sig = signTypedData({
      version: SignTypedDataVersion.V4,
      privateKey: toBuffer(signer),
      data: {
        types: EIP712SwapERC20,
        domain: {
          verifyingContract: swapContract,
          chainId,
          version,
          name,
        },
        primaryType: 'OrderERC20',
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
      { OrderERC20: EIP712SwapERC20.OrderERC20 },
      unsignedOrder
    )
  }
  const { r, s, v } = ethers.utils.splitSignature(sig)
  return { r, s, v: String(v) }
}

export function getSignerFromOrderERC20Signature(
  order: UnsignedOrderERC20,
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
      types: EIP712SwapERC20,
      domain: {
        name: DOMAIN_NAME_SWAP_ERC20,
        version: DOMAIN_VERSION_SWAP_ERC20,
        chainId,
        verifyingContract: swapContract,
      },
      primaryType: 'OrderERC20',
      message: order,
    },
  })
}

export function isValidOrderERC20(order: OrderERC20): boolean {
  return (
    !!order &&
    typeof order.nonce === 'string' &&
    typeof order.expiry === 'string' &&
    ethers.utils.isAddress(order.signerWallet) &&
    ethers.utils.isAddress(order.signerToken) &&
    typeof order.signerAmount === 'string' &&
    ethers.utils.isAddress(order.senderToken) &&
    typeof order.senderAmount === 'string' &&
    typeof order.v === 'string' &&
    ethers.utils.isBytesLike(order.r) &&
    ethers.utils.isBytesLike(order.s)
  )
}

export function isValidFullOrderERC20(fullOrder: FullOrderERC20): boolean {
  return (
    !!fullOrder &&
    ethers.utils.isAddress(fullOrder.swapContract) &&
    typeof fullOrder.chainId === 'number' &&
    typeof fullOrder.nonce === 'string' &&
    typeof fullOrder.expiry === 'string' &&
    ethers.utils.isAddress(fullOrder.signerWallet) &&
    ethers.utils.isAddress(fullOrder.signerToken) &&
    typeof fullOrder.signerAmount === 'string' &&
    typeof fullOrder.protocolFee === 'string' &&
    ethers.utils.isAddress(fullOrder.senderWallet) &&
    ethers.utils.isAddress(fullOrder.senderToken) &&
    typeof fullOrder.senderAmount === 'string' &&
    typeof fullOrder.v === 'string' &&
    ethers.utils.isBytesLike(fullOrder.r) &&
    ethers.utils.isBytesLike(fullOrder.s)
  )
}

export function orderERC20ToParams(
  order: OrderERC20
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
  string
] {
  return [
    order.nonce,
    order.expiry,
    order.signerWallet,
    order.signerToken,
    order.signerAmount,
    order.senderToken,
    order.senderAmount,
    order.v,
    order.r,
    order.s,
  ]
}

export function paramsToOrderERC20(str: string): OrderERC20 {
  const split = str.split(',')
  return {
    nonce: split[0],
    expiry: split[1],
    signerWallet: split[2],
    signerToken: split[3],
    signerAmount: split[4],
    senderToken: split[5],
    senderAmount: split[6],
    v: split[7],
    r: split[8],
    s: split[9],
  }
}

export function fullOrderERC20ToParams(
  order: FullOrderERC20
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
  string
] {
  return [
    order.chainId,
    order.swapContract,
    order.nonce,
    order.expiry,
    order.signerWallet,
    order.signerToken,
    order.signerAmount,
    order.protocolFee,
    order.senderWallet,
    order.senderToken,
    order.senderAmount,
    order.v,
    order.r,
    order.s,
  ]
}

export function paramsToFullOrderERC20(str: string): FullOrderERC20 {
  const split = str.split(',')
  return {
    chainId: Number(split[0]),
    swapContract: split[1],
    nonce: split[2],
    expiry: split[3],
    signerWallet: split[4],
    signerToken: split[5],
    signerAmount: split[6],
    protocolFee: split[7],
    senderWallet: split[8],
    senderToken: split[9],
    senderAmount: split[10],
    v: split[11],
    r: split[12],
    s: split[13],
  }
}

export function orderERC20PropsToStrings(obj: any): OrderERC20 {
  return {
    nonce: String(obj.nonce),
    expiry: String(obj.expiry),
    signerWallet: String(obj.signerWallet),
    signerToken: String(obj.signerToken),
    signerAmount: String(obj.signerAmount),
    senderToken: String(obj.senderToken),
    senderAmount: String(obj.senderAmount),
    v: String(obj.v),
    r: String(obj.r),
    s: String(obj.s),
  }
}

export function compressFullOrderERC20(order: FullOrderERC20): string {
  return lzString.compressToEncodedURIComponent(
    fullOrderERC20ToParams(order).join(',')
  )
}

export function decompressFullOrderERC20(str: string): FullOrderERC20 {
  return paramsToFullOrderERC20(lzString.decompressFromEncodedURIComponent(str))
}

const parseTransfer = (log: any): Transfer | null => {
  let parsed: any
  let transfer: any
  try {
    parsed = erc20Interface.parseLog(log)
    if (parsed.name === 'Transfer') {
      transfer = {
        token: log.address?.toLowerCase(),
        from: parsed.args[0]?.toLowerCase(),
        to: parsed.args[1]?.toLowerCase(),
        amount: ethers.BigNumber.from(parsed.args[2]),
      }
    }
  } catch (e) {
    return null
  }
  return transfer
}

export const getFullSwapERC20FromTransfers = (
  nonce: string,
  signerWallet: string,
  feeReceiver: string,
  transfers: Transfer[]
): FullSwapERC20 => {
  let feeTransfer: Transfer | null
  let signerTransfer: Transfer | null
  let senderTransfer: Transfer | null

  let i = transfers.length
  while (i--) {
    if (transfers[i].to === feeReceiver) {
      feeTransfer = transfers[i]
    } else {
      let j = transfers.length
      while (j--) {
        if (
          transfers[i].from === signerWallet.toLowerCase() &&
          transfers[i].from === transfers[j].to &&
          transfers[i].to === transfers[j].from
        ) {
          signerTransfer = transfers[i]
          senderTransfer = transfers[j]
          break
        }
      }
    }
  }

  if (!signerTransfer || !senderTransfer) {
    throw new Error('getFullSwapERC20: mutual transfers not found')
  }

  return {
    nonce: nonce.toString(),
    signerWallet: signerTransfer.from,
    signerToken: signerTransfer.token,
    signerAmount: signerTransfer.amount.toString(),
    senderWallet: senderTransfer.from,
    senderToken: senderTransfer.token,
    senderAmount: senderTransfer.amount.toString(),
    feeAmount: (feeTransfer?.amount || 0).toString(),
  }
}

export const getFullSwapERC20 = (
  nonce: string,
  signerWallet: string,
  feeReceiver: string,
  logs: ethers.providers.Log[]
): FullSwapERC20 => {
  const allTransfers: Transfer[] = []
  let transfer: Transfer | null
  let length = logs.length

  feeReceiver = feeReceiver.toLowerCase()
  signerWallet = signerWallet.toLowerCase()

  while (length--) {
    if ((transfer = parseTransfer(logs[length]))) {
      allTransfers.push(transfer)
    }
  }

  return getFullSwapERC20FromTransfers(
    nonce,
    signerWallet,
    feeReceiver,
    allTransfers
  )
}
