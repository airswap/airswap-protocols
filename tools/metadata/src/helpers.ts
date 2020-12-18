import * as ethers from 'ethers'
import { ERC20_ABI, ERC20_BYTES32_ABI } from './constants'
import { Arrayish } from 'ethers/utils'

export function getContract(
  address: string,
  ABI: any,
  provider: ethers.providers.BaseProvider
) {
  if (!address || !address.startsWith('0x')) {
    throw Error(`Invalid 'address' parameter '${address}'.`)
  }
  return new ethers.Contract(address, ABI, provider)
}

export async function getTokenName(
  tokenAddress: string,
  provider: ethers.providers.BaseProvider
) {
  if (!tokenAddress || !tokenAddress.startsWith('0x')) {
    throw Error(`Invalid 'tokenAddress' parameter`)
  }

  return getContract(tokenAddress, ERC20_ABI, provider)
    .name()
    .catch(() =>
      getContract(tokenAddress, ERC20_BYTES32_ABI, provider)
        .name()
        .then((bytes32: Arrayish) => ethers.utils.parseBytes32String(bytes32))
    )
}

export async function getTokenSymbol(
  tokenAddress: string,
  provider: ethers.providers.BaseProvider
) {
  if (!tokenAddress || !tokenAddress.startsWith('0x')) {
    throw Error(`Invalid 'tokenAddress' parameter`)
  }

  return getContract(tokenAddress, ERC20_ABI, provider)
    .symbol()
    .catch(() =>
      getContract(tokenAddress, ERC20_BYTES32_ABI, provider)
        .symbol()
        .then((bytes32: Arrayish) => ethers.utils.parseBytes32String(bytes32))
    )
}

export async function getTokenDecimals(
  tokenAddress: string,
  provider: ethers.providers.BaseProvider
) {
  if (!tokenAddress || !tokenAddress.startsWith('0x')) {
    throw Error(`Invalid 'tokenAddress' parameter`)
  }

  return getContract(tokenAddress, ERC20_ABI, provider).decimals()
}
