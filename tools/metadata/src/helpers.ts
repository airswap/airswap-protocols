import * as ethers from 'ethers'
import { ERC20_ABI, ERC20_BYTES32_ABI } from './constants'

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
  try {
    return await getContract(tokenAddress, ERC20_ABI, provider).name()
  } catch {
    const name = await getContract(
      tokenAddress,
      ERC20_BYTES32_ABI,
      provider
    ).name()
    return ethers.utils.parseBytes32String(name)
  }
}

export async function getTokenSymbol(
  tokenAddress: string,
  provider: ethers.providers.BaseProvider
) {
  if (!tokenAddress || !tokenAddress.startsWith('0x')) {
    throw Error(`Invalid 'tokenAddress' parameter`)
  }

  try {
    return await getContract(tokenAddress, ERC20_ABI, provider).symbol()
  } catch {
    const symbol = await getContract(
      tokenAddress,
      ERC20_BYTES32_ABI,
      provider
    ).symbol()
    return ethers.utils.parseBytes32String(symbol)
  }
}

export function getTokenDecimals(
  tokenAddress: string,
  provider: ethers.providers.BaseProvider
) {
  if (!tokenAddress || !tokenAddress.startsWith('0x')) {
    throw Error(`Invalid 'tokenAddress' parameter`)
  }

  return getContract(tokenAddress, ERC20_ABI, provider).decimals()
}
