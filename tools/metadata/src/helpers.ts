import * as ethers from 'ethers'
import { ERC20_ABI, ERC20_BYTES32_ABI } from './constants'
import { Arrayish } from 'ethers/utils'

export function getContract(address: string, ABI: any, network = 'mainnet') {
  const provider =
    network === 'mainnet'
      ? ethers.getDefaultProvider()
      : ethers.getDefaultProvider(network.toLowerCase())
  if (!address || !address.startsWith('0x')) {
    throw Error(`Invalid 'address' parameter '${address}'.`)
  }

  return new ethers.Contract(address, ABI, provider)
}

export async function getTokenName(tokenAddress: string, network: string) {
  if (!tokenAddress || !tokenAddress.startsWith('0x')) {
    throw Error(`Invalid 'tokenAddress' parameter`)
  }

  return getContract(tokenAddress, ERC20_ABI, network)
    .name()
    .catch(() =>
      getContract(tokenAddress, ERC20_BYTES32_ABI, network)
        .name()
        .then((bytes32: Arrayish) => ethers.utils.parseBytes32String(bytes32))
    )
}

export async function getTokenSymbol(tokenAddress: string, network: string) {
  if (!tokenAddress || !tokenAddress.startsWith('0x')) {
    throw Error(`Invalid 'tokenAddress' parameter`)
  }

  return getContract(tokenAddress, ERC20_ABI, network)
    .symbol()
    .catch(() =>
      getContract(tokenAddress, ERC20_BYTES32_ABI, network)
        .symbol()
        .then((bytes32: Arrayish) => ethers.utils.parseBytes32String(bytes32))
    )
}

export async function getTokenDecimals(tokenAddress: string, network: string) {
  if (!tokenAddress || !tokenAddress.startsWith('0x')) {
    throw Error(`Invalid 'tokenAddress' parameter`)
  }

  return getContract(tokenAddress, ERC20_ABI, network).decimals()
}
