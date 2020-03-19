import { fancy } from 'fancy-test'
import { expect } from 'chai'

import { ethers } from 'ethers'
import { chainIds, chainNames, stakingTokenAddresses } from '@airswap/constants'
import { ERC20 } from '..'

const AST_ADDRESS = stakingTokenAddresses['4']

describe('ERC20 Test', () => {
  fancy.it('fails receiving a bad quote', async () => {
    const provider = new ethers.providers.JsonRpcProvider(
      'http://localhost:8545'
    )
    await new ERC20(AST_ADDRESS, chainIds.RINKEBY, provider.getSigner())
  })
})
