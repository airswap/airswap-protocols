import { ethers, BigNumber as BigNumberEthers } from 'ethers'
import * as url from 'url'
import { explorerUrls } from '@airswap/constants'
import { SwapERC20, FullSwapERC20 } from '@airswap/types'

import { SwapERC20__factory } from '@airswap/swap-erc20/typechain/factories/contracts'
import { abi as ERC20_ABI } from '@openzeppelin/contracts/build/contracts/ERC20.json'

const swapInterface = new ethers.utils.Interface(SwapERC20__factory.abi)
const erc20Interface = new ethers.utils.Interface(ERC20_ABI)

export * from './src/pricing'
export * from './src/swap'
export * from './src/swapERC20'

export function getReceiptUrl(chainId: number, hash: string): string {
  return `${explorerUrls[chainId]}/tx/${hash}`
}

export function getAccountUrl(chainId: number, address: string): string {
  return `${explorerUrls[chainId]}/address/${address}`
}

const parseTransfer = (log: any) => {
  let parsed
  let transfer
  try {
    parsed = erc20Interface.parseLog(log)
    if (parsed.name === 'Transfer')
      transfer = {
        token: log.address,
        from: parsed.args[0],
        to: parsed.args[1],
        amount: ethers.BigNumber.from(parsed.args[2]),
      }
  } catch (e) {
    return null
  }
  return transfer
}

export const getFullSwapERC20 = async (
  event: SwapERC20,
  tx: ethers.providers.TransactionResponse
): Promise<FullSwapERC20> => {
  const receipt = await tx.wait()
  const transfers = []
  for (let i = 0; i < receipt.logs.length; i++) {
    let parsed: ethers.utils.LogDescription
    try {
      parsed = swapInterface.parseLog(receipt.logs[i])
    } catch (e) {
      continue
    }
    if (parsed && parsed.name === 'SwapERC20') {
      let transfer: any
      while (i--) {
        if ((transfer = parseTransfer(receipt.logs[i]))) {
          transfers.push(transfer)
        }
      }
      break
    }
  }

  const [fee, signer, sender] = transfers
  if (fee.from !== event.signerWallet)
    throw new Error(
      'unable to get SwapERC20 params: found incorrect fee transfer (wrong signerWallet)'
    )
  if (signer.from !== event.signerWallet)
    throw new Error(
      'unable to get SwapERC20 params: found incorrect signer transfer (wrong signerWallet)'
    )
  if (signer.from !== sender.to)
    throw new Error(
      'unable to get SwapERC20 params: signer transfer mismatched sender transfer'
    )
  if (sender.from !== signer.to)
    throw new Error(
      'unable to get SwapERC20 params: sender transfer mismatched signer transfer'
    )

  return {
    ...event,
    signerToken: signer.token,
    signerAmount: signer.amount.toString(),
    senderWallet: sender.from,
    senderToken: sender.token,
    senderAmount: sender.amount.toString(),
    feeAmount: fee.amount.toString(),
  }
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
