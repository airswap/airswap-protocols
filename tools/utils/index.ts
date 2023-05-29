import { ethers, BigNumber as BigNumberEthers } from 'ethers'
import * as url from 'url'
import { explorerUrls } from '@airswap/constants'

export * from './src/pricing'
export * from './src/swap'
export * from './src/swapERC20'

export function getReceiptUrl(chainId: number, hash: string): string {
  return `${explorerUrls[chainId]}/tx/${hash}`
}

export function getAccountUrl(chainId: number, address: string): string {
  return `${explorerUrls[chainId]}/address/${address}`
}

export function checkResultToErrors(
  count: BigNumberEthers,
  errors: Array<string>
) {
  const res: Array<string> = []
  for (let idx = 0; idx < count.toNumber(); idx++) {
    res.push(ethers.utils.parseBytes32String(errors[idx]))
  }
  return res
}

export function getTimestamp(): string {
  return Math.round(Date.now() / 1000).toString()
}

export function numberToBytes32(number: number): string {
  const hexString = number.toString(16)
  return `0x${hexString.padStart(64, '0')}`
}

export function getInterfaceId(functions: string[]): string {
  const _interface = new ethers.utils.Interface(functions)
  const interfaceId = ethers.utils.arrayify(
    _interface.getSighash(_interface.fragments[0])
  )
  for (let i = 1; i < _interface.fragments.length; i++) {
    const hash = ethers.utils.arrayify(
      _interface.getSighash(_interface.fragments[i])
    )
    for (let j = 0; j < hash.length; j++) {
      interfaceId[j] = interfaceId[j] ^ hash[j]
    }
  }
  return ethers.utils.hexlify(interfaceId)
}

export function parseUrl(locator: string): url.UrlWithStringQuery {
  if (!/(http|ws)s?:\/\//.test(locator)) {
    locator = `https://${locator}`
  }
  return url.parse(locator)
}

export function lowerCaseAddresses(obj: any): any {
  for (const key in obj) {
    if (typeof obj[key] === 'object') {
      lowerCaseAddresses(obj[key])
    } else if (typeof obj[key] === 'string' && obj[key].indexOf('0x') === 0) {
      obj[key] = obj[key] && obj[key].toLowerCase()
    } else {
      obj[key] = obj[key] && obj[key].toString()
    }
  }
  return obj
}
