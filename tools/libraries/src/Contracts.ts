import * as ethers from 'ethers'

import { ServerOptions } from '@airswap/types'
import { wrappedTokenAddresses } from '@airswap/constants'

import { Swap__factory } from '@airswap/swap/typechain/factories/contracts'
import { SwapERC20__factory } from '@airswap/swap-erc20/typechain/factories/contracts'
import { Wrapper__factory } from '@airswap/wrapper/typechain/factories/contracts'
import { Registry__factory } from '@airswap/registry/typechain/factories/contracts'
import { WETH9__factory } from '@airswap/wrapper/typechain/factories/contracts'

import * as registryDeploys from '@airswap/registry/deploys.js'
import * as swapERC20Deploys from '@airswap/swap-erc20/deploys.js'
import * as swapDeploys from '@airswap/swap/deploys.js'
import * as wrapperDeploys from '@airswap/wrapper/deploys.js'

import BalanceChecker from '@airswap/balances/build/contracts/BalanceChecker.json'
// @ts-ignore
import balancesDeploys from '@airswap/balances/deploys.js'
const balancesInterface = new ethers.utils.Interface(
  JSON.stringify(BalanceChecker.abi)
)

import { Server } from './Server'

class Contract {
  public name: string
  public addresses: Record<number, string>
  public factory: any
  public constructor(
    name: string,
    addresses: Record<number, string>,
    factory: any
  ) {
    this.name = name
    this.addresses = addresses
    this.factory = factory
  }
  public getAddress(chainId: number) {
    return this.addresses[chainId]
  }
  public getContract(
    providerOrSigner: ethers.providers.Provider | ethers.Signer,
    chainId: number
  ): ethers.Contract {
    console.log(this.name, chainId, this.addresses[chainId], this.addresses)
    return this.factory.connect(this.addresses[chainId], providerOrSigner)
  }
}

class ServerRegistry extends Contract {
  public constructor(
    name: string,
    addresses: Record<number, string>,
    factory: any
  ) {
    super(name, addresses, factory)
  }
  public async getServerURLs(
    providerOrSigner: ethers.providers.Provider | ethers.Signer,
    chainId: number,
    protocol: string,
    baseToken?: string,
    quoteToken?: string
  ): Promise<string[]> {
    const contract = Registry__factory.connect(
      registryDeploys[chainId],
      providerOrSigner
    )
    const protocolStakers: string[] = await contract.getStakersForProtocol(
      protocol
    )
    const stakers = protocolStakers.filter(async (staker) => {
      const tokens = await contract.getTokensForStaker(staker)
      let include = false
      if (!tokens.length) include = true
      else if (baseToken) include = tokens.includes(baseToken)
      else if (quoteToken) include = tokens.includes(quoteToken)
      return include
    })
    return await contract.getServerURLsForStakers(stakers)
  }
  public async getServers(
    providerOrSigner: ethers.providers.Provider | ethers.Signer,
    chainId: number,
    protocol: string,
    baseToken?: string,
    quoteToken?: string,
    options?: ServerOptions
  ): Promise<Array<Server>> {
    const urls = await this.getServerURLs(
      providerOrSigner,
      chainId,
      protocol,
      baseToken,
      quoteToken
    )
    const serverPromises = await Promise.allSettled(
      urls.map((url) => {
        return Server.at(url, {
          swapContract: options?.swapContract || SwapERC20.getAddress(chainId),
          chainId: chainId,
          initializeTimeout: options?.initializeTimeout,
        })
      })
    )
    const servers: PromiseFulfilledResult<Server>[] = serverPromises.filter(
      (value): value is PromiseFulfilledResult<Server> =>
        value.status === 'fulfilled'
    )
    return servers.map((value) => value.value)
  }
}

export const Swap = new Contract('Swap', swapDeploys, Swap__factory)
export const SwapERC20 = new Contract(
  'SwapERC20',
  swapERC20Deploys,
  SwapERC20__factory
)
export const Wrapper = new Contract('Wrapper', wrapperDeploys, Wrapper__factory)
export const Registry = new ServerRegistry(
  'Registry',
  registryDeploys,
  Registry__factory
)
export const WETH = new Contract('WETH', wrappedTokenAddresses, WETH9__factory)
export const Balances = new Contract(
  'Balances',
  wrapperDeploys,
  Wrapper__factory
)
Balances.getContract = (
  providerOrSigner: ethers.providers.Provider | ethers.Signer,
  chainId: number
): ethers.Contract => {
  return new ethers.Contract(
    balancesDeploys[chainId],
    balancesInterface,
    providerOrSigner
  )
}
