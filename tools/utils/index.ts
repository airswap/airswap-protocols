import { ethers } from 'ethers'
import { explorerUrls } from './src/constants'

export * from './src/constants'
export * from './src/metadata'
export * from './src/pricing'
export * from './src/server'
export * from './src/swap'
export * from './src/swap-erc20'
export * from './src/tokenlists'
export * from './src/types'

export function getReceiptUrl(chainId: number, hash: string): string {
  return `${explorerUrls[chainId]}/tx/${hash}`
}

export function getAccountUrl(chainId: number, address: string): string {
  return `${explorerUrls[chainId]}/address/${address}`
}

export function parseCheckResult(errors: Array<string>) {
  const res: Array<string> = []
  for (let idx = 0; idx < errors.length; idx++) {
    const error = ethers.utils.parseBytes32String(errors[idx])
    if (error) {
      res.push(error)
    }
  }
  return res
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

export function stringifyEIP712Type(
  types: { [key: string]: { type: string; name: string }[] },
  primaryType: string
): string {
  return types[primaryType].reduce((str, value, index, values) => {
    const isEnd = index !== values.length - 1
    return `${str}${value.type} ${value.name}${isEnd ? ',' : ')'}`
  }, `${primaryType}(`)
}

export function parseUrl(locator: string): URL {
  if (!/(http|ws)s?:\/\//.test(locator)) {
    return new URL(`https://${locator}`)
  }
  return new URL(locator)
}

export function lowerCaseAddresses(obj: any): any {
  for (const key in obj) {
    if (typeof obj[key] === 'object') {
      lowerCaseAddresses(obj[key])
    } else if (typeof obj[key] === 'string' && obj[key].indexOf('0x') === 0) {
      obj[key] = obj[key]?.toLowerCase()
    } else {
      obj[key] = obj[key]?.toString()
    }
  }
  return obj
}

export function getTimestamp(): string {
  return Math.round(Date.now() / 1000).toString()
}

export function numberToBytes32(number: number): string {
  const hexString = number.toString(16)
  return `0x${hexString.padStart(64, '0')}`
}
