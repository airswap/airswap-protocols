import * as ethers from 'ethers'
import { ERC20_ABI, ERC20_BYTES32_ABI } from './constants'
import { Arrayish } from 'ethers/utils'

// account is optional
export function getContract(address: string, ABI: any) {
  const provider = ethers.getDefaultProvider()
  if (!address || !address.startsWith('0x')) {
    throw Error(`Invalid 'address' parameter '${address}'.`)
  }

  return new ethers.Contract(address, ABI, provider)
}

export async function getTokenName(tokenAddress: string) {
  if (!tokenAddress || !tokenAddress.startsWith('0x')) {
    throw Error(`Invalid 'tokenAddress' parameter`)
  }

  return getContract(tokenAddress, ERC20_ABI)
    .name()
    .catch(() =>
      getContract(tokenAddress, ERC20_BYTES32_ABI)
        .name()
        .then((bytes32: Arrayish) => ethers.utils.parseBytes32String(bytes32))
    )
}

export async function getTokenSymbol(tokenAddress: string) {
  if (!tokenAddress || !tokenAddress.startsWith('0x')) {
    throw Error(`Invalid 'tokenAddress'`)
  }

  return getContract(tokenAddress, ERC20_ABI)
    .symbol()
    .catch(() => {
      const contractBytes32 = getContract(tokenAddress, ERC20_BYTES32_ABI)
      return contractBytes32
        .symbol()
        .then((bytes32: Arrayish) => ethers.utils.parseBytes32String(bytes32))
    })
}

// get token decimals
export async function getTokenDecimals(tokenAddress: string) {
  if (!tokenAddress || !tokenAddress.startsWith('0x')) {
    throw Error(`Invalid 'tokenAddress'`)
  }

  return getContract(tokenAddress, ERC20_ABI).decimals()
}
