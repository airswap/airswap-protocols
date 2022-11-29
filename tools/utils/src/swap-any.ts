/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import * as ethUtil from 'ethereumjs-util'
import * as sigUtil from 'eth-sig-util'
import { ethers } from 'ethers'

import { lowerCaseAddresses, stringify } from './strings'

import {
  SECONDS_IN_DAY,
  ADDRESS_ZERO,
  DOMAIN_VERSION_SWAP_ANY,
  DOMAIN_NAME_SWAP_ANY,
  chainIds,
} from '@airswap/constants'
import {
  UnsignedOrderAny,
  OrderAny,
  OrderAnyParty,
  Signature,
  EIP712SwapAny,
} from '@airswap/typescript'

export const SWAP_ANY_DOMAIN_TYPEHASH = ethUtil.keccak256(
  stringify(EIP712SwapAny, 'EIP712Domain')
)
export const SWAP_ANY_ORDER_TYPEHASH = ethUtil.keccak256(
  stringify(EIP712SwapAny, 'Order')
)
export const SWAP_ANY_PARTY_TYPEHASH = ethUtil.keccak256(
  stringify(EIP712SwapAny, 'Party')
)

const defaultParty: OrderAnyParty = {
  wallet: ADDRESS_ZERO,
  token: ADDRESS_ZERO,
  kind: '0x36372b07',
  id: '0',
  amount: '0',
}

export function createOrderAny({
  nonce = Date.now(),
  expiry = Math.round(Date.now() / 1000 + SECONDS_IN_DAY).toString(),
  protocolFee = 0,
  signer = {},
  sender = {},
  affiliate = {},
}): UnsignedOrderAny {
  return lowerCaseAddresses({
    nonce: String(nonce),
    expiry: String(expiry),
    protocolFee: String(protocolFee),
    signer: { ...defaultParty, ...signer },
    sender: { ...defaultParty, ...sender },
    affiliate: { ...defaultParty, ...affiliate },
  })
}

export async function createOrderAnySignature(
  unsignedOrder: UnsignedOrderAny,
  signer: ethers.VoidSigner | string,
  swapContract: string,
  chainId: number
): Promise<Signature> {
  let sig
  if (typeof signer === 'string') {
    sig = sigUtil.signTypedData_v4(ethUtil.toBuffer(signer), {
      data: {
        types: EIP712SwapAny,
        domain: {
          name: DOMAIN_NAME_SWAP_ANY,
          version: DOMAIN_VERSION_SWAP_ANY,
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
        name: DOMAIN_NAME_SWAP_ANY,
        version: DOMAIN_VERSION_SWAP_ANY,
        chainId,
        verifyingContract: swapContract,
      },
      { Order: EIP712SwapAny.Order, Party: EIP712SwapAny.Party },
      unsignedOrder
    )
  }
  const { r, s, v } = ethers.utils.splitSignature(sig)
  return { r, s, v: String(v) }
}

export function getSignerFromOrderAnySignature(
  order: UnsignedOrderAny,
  swapContract: string,
  chainId: number,
  v: string,
  r: string,
  s: string
) {
  const sig = `${r}${s.slice(2)}${ethers.BigNumber.from(v)
    .toHexString()
    .slice(2)}`
  return sigUtil.recoverTypedSignature_v4({
    data: {
      types: EIP712SwapAny,
      domain: {
        name: DOMAIN_NAME_SWAP_ANY,
        version: DOMAIN_VERSION_SWAP_ANY,
        chainId,
        verifyingContract: swapContract,
      },
      primaryType: 'Order',
      message: order,
    },
    sig,
  })
}
