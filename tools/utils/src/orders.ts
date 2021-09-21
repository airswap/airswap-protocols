import * as ethUtil from 'ethereumjs-util'
import * as sigUtil from 'eth-sig-util'
import { ethers } from 'ethers'
import {
  SECONDS_IN_DAY,
  ADDRESS_ZERO,
  LIGHT_DOMAIN_VERSION,
  LIGHT_DOMAIN_NAME,
} from '@airswap/constants'
import {
  UnsignedLightOrder,
  LightOrder,
  EIP712Light,
  LightSignature,
} from '@airswap/types'

export function numberToBytes32(number: number): string {
  const hexString = number.toString(16)
  return `0x${hexString.padStart(64, '0')}`
}

export function isValidLightOrder(order: LightOrder): boolean {
  return (
    order &&
    'nonce' in order &&
    'expiry' in order &&
    'signerWallet' in order &&
    'signerToken' in order &&
    'signerAmount' in order &&
    'senderToken' in order &&
    'senderAmount' in order &&
    'r' in order &&
    's' in order &&
    'v' in order
  )
}

// eslint-disable-next-line  @typescript-eslint/explicit-module-boundary-types
export function createLightOrder({
  expiry = Math.round(Date.now() / 1000 + SECONDS_IN_DAY).toString(),
  nonce = Date.now().toString(),
  signerWallet = ADDRESS_ZERO,
  signerToken = ADDRESS_ZERO,
  signerAmount = '0',
  signerFee = '0',
  senderWallet = ADDRESS_ZERO,
  senderToken = ADDRESS_ZERO,
  senderAmount = '0',
}: any): UnsignedLightOrder {
  return {
    expiry: String(expiry),
    nonce: String(nonce),
    signerWallet,
    signerToken,
    signerAmount: String(signerAmount),
    signerFee: String(signerFee),
    senderWallet,
    senderToken,
    senderAmount: String(senderAmount),
  }
}

export async function createLightSignature(
  unsignedOrder: UnsignedLightOrder,
  signer: ethers.VoidSigner | string,
  swapContract: string,
  chainId: number
): Promise<LightSignature> {
  let sig
  if (typeof signer === 'string') {
    sig = sigUtil.signTypedData_v4(ethUtil.toBuffer(signer), {
      data: {
        types: EIP712Light,
        domain: {
          name: LIGHT_DOMAIN_NAME,
          version: LIGHT_DOMAIN_VERSION,
          chainId,
          verifyingContract: swapContract,
        },
        primaryType: 'LightOrder',
        message: unsignedOrder,
      },
    })
  } else {
    sig = await signer._signTypedData(
      {
        name: LIGHT_DOMAIN_NAME,
        version: LIGHT_DOMAIN_VERSION,
        chainId,
        verifyingContract: swapContract,
      },
      { LightOrder: EIP712Light.LightOrder },
      unsignedOrder
    )
  }
  const { r, s, v } = ethers.utils.splitSignature(sig)
  return { r, s, v: String(v) }
}

export function getSignerFromLightSignature(
  order: UnsignedLightOrder,
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
      types: EIP712Light,
      domain: {
        name: LIGHT_DOMAIN_NAME,
        version: LIGHT_DOMAIN_VERSION,
        chainId,
        verifyingContract: swapContract,
      },
      primaryType: 'LightOrder',
      message: order,
    },
    sig,
  })
}

export function lightOrderToParams(order: LightOrder): Array<string> {
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
