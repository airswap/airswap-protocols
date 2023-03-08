import { ethers } from 'ethers'
import { toBuffer } from 'ethereumjs-util'
import {
  signTypedData,
  recoverTypedSignature,
  SignTypedDataVersion,
} from '@metamask/eth-sig-util'

import {
  ADDRESS_ZERO,
  DOMAIN_VERSION_POOL,
  DOMAIN_NAME_POOL,
} from '@airswap/constants'

import { UnsignedClaim, Claim, Signature, EIP712Claim } from '@airswap/types'

export function createClaim({
  nonce = Date.now().toString(),
  expiry = nonce + 60,
  participant = ADDRESS_ZERO,
  score = '0',
}: any): UnsignedClaim {
  return {
    nonce: String(nonce),
    expiry: String(expiry),
    participant,
    score: String(score),
  }
}

export async function createClaimSignature(
  unsignedClaim: UnsignedClaim,
  signer: ethers.VoidSigner | string,
  poolContract: string,
  chainId: number
): Promise<Signature> {
  let sig
  if (typeof signer === 'string') {
    sig = signTypedData({
      version: SignTypedDataVersion.V4,
      privateKey: toBuffer(signer),
      data: {
        types: EIP712Claim,
        domain: {
          name: DOMAIN_NAME_POOL,
          version: DOMAIN_VERSION_POOL,
          chainId,
          verifyingContract: poolContract,
        },
        primaryType: 'Claim',
        message: unsignedClaim,
      },
    })
  } else {
    sig = await signer._signTypedData(
      {
        name: DOMAIN_NAME_POOL,
        version: DOMAIN_VERSION_POOL,
        chainId,
        verifyingContract: poolContract,
      },
      { Claim: EIP712Claim.Claim },
      unsignedClaim
    )
  }
  const { r, s, v } = ethers.utils.splitSignature(sig)
  return { r, s, v: String(v) }
}

export function getSignerFromClaimSignature(
  claim: UnsignedClaim,
  poolContract: string,
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
      types: EIP712Claim,
      domain: {
        name: DOMAIN_NAME_POOL,
        version: DOMAIN_VERSION_POOL,
        chainId,
        verifyingContract: poolContract,
      },
      primaryType: 'Claim',
      message: claim,
    },
  })
}

export function isValidClaim(claim: Claim): boolean {
  return (
    claim &&
    'nonce' in claim &&
    'expiry' in claim &&
    'participant' in claim &&
    'score' in claim &&
    'r' in claim &&
    's' in claim &&
    'v' in claim
  )
}

export function claimToParams(claim: Claim): Array<string> {
  return [
    claim.nonce,
    claim.expiry,
    claim.participant,
    claim.score,
    claim.v,
    claim.r,
    claim.s,
  ]
}

export function claimPropsToStrings(obj: any): Claim {
  return {
    nonce: String(obj.nonce),
    expiry: String(obj.expiry),
    participant: String(obj.participant),
    score: String(obj.score),
    v: String(obj.v),
    r: String(obj.r),
    s: String(obj.s),
  }
}
