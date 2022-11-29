import * as ethUtil from 'ethereumjs-util'
import * as sigUtil from 'eth-sig-util'
import { ethers } from 'ethers'
import lzString from 'lz-string'

import { stringify } from './strings'

import {
  SECONDS_IN_DAY,
  ADDRESS_ZERO,
  DOMAIN_VERSION_SWAP,
  DOMAIN_NAME_SWAP,
} from '@airswap/constants'
import {
  UnsignedOrder,
  Order,
  FullOrder,
  Signature,
  EIP712Swap,
} from '@airswap/typescript'

export const SWAP_DOMAIN_TYPEHASH = ethUtil.keccak256(
  stringify(EIP712Swap, 'EIP712Domain')
)
export const SWAP_ORDER_TYPEHASH = ethUtil.keccak256(
  stringify(EIP712Swap, 'Order')
)

export function createOrder({
  nonce = Date.now().toString(),
  expiry = Math.round(Date.now() / 1000 + SECONDS_IN_DAY).toString(),
  signerWallet = ADDRESS_ZERO,
  signerToken = ADDRESS_ZERO,
  signerAmount = '0',
  protocolFee = '0',
  senderWallet = ADDRESS_ZERO,
  senderToken = ADDRESS_ZERO,
  senderAmount = '0',
}: any): UnsignedOrder {
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

export async function createSwapSignature(
  unsignedOrder: UnsignedOrder,
  signer: ethers.VoidSigner | string,
  swapContract: string,
  chainId: number
): Promise<Signature> {
  let sig
  if (typeof signer === 'string') {
    sig = sigUtil.signTypedData_v4(ethUtil.toBuffer(signer), {
      data: {
        types: EIP712Swap,
        domain: {
          name: DOMAIN_NAME_SWAP,
          version: DOMAIN_VERSION_SWAP,
          chainId,
          verifyingContract: swapContract,
        },
        primaryType: 'Order',
        message: unsignedOrder,
      },
    })
  } else {
    sig = await signer._signTypedData(
      {
        name: DOMAIN_NAME_SWAP,
        version: DOMAIN_VERSION_SWAP,
        chainId,
        verifyingContract: swapContract,
      },
      { Order: EIP712Swap.Order },
      unsignedOrder
    )
  }
  const { r, s, v } = ethers.utils.splitSignature(sig)
  return { r, s, v: String(v) }
}

export function getSignerFromSwapSignature(
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
  return sigUtil.recoverTypedSignature_v4({
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
    sig,
  })
}

export function hashOrder(order: UnsignedOrder): Buffer {
  return ethUtil.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      [
        'bytes32',
        'uint256',
        'uint256',
        'address',
        'address',
        'uint256',
        'uint256',
        'address',
        'address',
        'uint256',
      ],
      [
        SWAP_ORDER_TYPEHASH,
        order.nonce,
        order.expiry,
        order.signerWallet,
        order.signerToken,
        order.signerAmount,
        order.protocolFee,
        order.senderWallet,
        order.senderToken,
        order.senderAmount,
      ]
    )
  )
}

export function hashDomain(swapContract: string): Buffer {
  return ethUtil.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['bytes32', 'bytes32', 'bytes32', 'address'],
      [
        SWAP_DOMAIN_TYPEHASH,
        ethUtil.keccak256(DOMAIN_NAME_SWAP),
        ethUtil.keccak256(DOMAIN_VERSION_SWAP),
        swapContract,
      ]
    )
  )
}

export function getOrderHash(
  order: UnsignedOrder,
  swapContract: string
): Buffer {
  return ethUtil.keccak256(
    Buffer.concat([
      Buffer.from('1901', 'hex'),
      hashDomain(swapContract),
      hashOrder(order),
    ])
  )
}

export function isValidOrder(order: Order): boolean {
  return (
    !!order &&
    typeof order['nonce'] == 'string' &&
    typeof order['expiry'] == 'string' &&
    ethers.utils.isAddress(order['signerWallet']) &&
    ethers.utils.isAddress(order['signerToken']) &&
    typeof order['signerAmount'] == 'string' &&
    ethers.utils.isAddress(order['senderToken']) &&
    typeof order['senderAmount'] == 'string' &&
    typeof order['v'] == 'string' &&
    ethers.utils.isBytesLike(order['r']) &&
    ethers.utils.isBytesLike(order['s'])
  )
}

export function isValidFullOrder(fullOrder: FullOrder): boolean {
  return (
    !!fullOrder &&
    ethers.utils.isAddress(fullOrder['swapContract']) &&
    typeof fullOrder['chainId'] == 'string' &&
    typeof fullOrder['nonce'] == 'string' &&
    typeof fullOrder['expiry'] == 'string' &&
    ethers.utils.isAddress(fullOrder['signerWallet']) &&
    ethers.utils.isAddress(fullOrder['signerToken']) &&
    typeof fullOrder['signerAmount'] == 'string' &&
    typeof fullOrder['protocolFee'] == 'string' &&
    ethers.utils.isAddress(fullOrder['senderWallet']) &&
    ethers.utils.isAddress(fullOrder['senderToken']) &&
    typeof fullOrder['senderAmount'] == 'string' &&
    typeof fullOrder['v'] == 'string' &&
    ethers.utils.isBytesLike(fullOrder['r']) &&
    ethers.utils.isBytesLike(fullOrder['s'])
  )
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

export function paramsToOrder(str: string): Order {
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

export function fullOrderToParams(
  order: FullOrder
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

export function paramsToFullOrder(str: string): FullOrder {
  const split = str.split(',')
  return {
    chainId: split[0],
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

export function orderPropsToStrings(obj: any): Order {
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

export function compressFullOrder(order: FullOrder): string {
  return lzString.compressToEncodedURIComponent(
    fullOrderToParams(order).join(',')
  )
}

export function decompressFullOrder(str: string): FullOrder {
  return paramsToFullOrder(lzString.decompressFromEncodedURIComponent(str))
}
