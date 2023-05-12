import { ethers } from 'ethers'

import { Swap__factory } from '@airswap/swap/typechain/factories/contracts'
import { SwapERC20__factory } from '@airswap/swap-erc20/typechain/factories/contracts'
import { Wrapper__factory } from '@airswap/wrapper/typechain/factories/contracts'
import { WETH9__factory } from '@airswap/wrapper/typechain/factories/contracts'

import swapERC20Deploys from '@airswap/swap-erc20/deploys.js'
import swapDeploys from '@airswap/swap/deploys.js'
import wrapperDeploys from '@airswap/wrapper/deploys.js'
import wethDeploys from '@airswap/wrapper/deploys-weth.js'

import BalanceChecker from '@airswap/balances/build/contracts/BalanceChecker.sol/BalanceChecker.json'
// @ts-ignore
import balancesDeploys from '@airswap/balances/deploys.js'
const balancesInterface = new ethers.utils.Interface(
  JSON.stringify(BalanceChecker.abi)
)

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
    return this.factory.connect(this.addresses[chainId], providerOrSigner)
  }
}

export const Swap = new Contract('Swap', swapDeploys, Swap__factory)
export const SwapERC20 = new Contract(
  'SwapERC20',
  swapERC20Deploys,
  SwapERC20__factory
)
export const Wrapper = new Contract('Wrapper', wrapperDeploys, Wrapper__factory)
export const WETH = new Contract('WETH', wethDeploys, WETH9__factory)
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
