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
    const contract = await new ERC20(AST_ADDRESS, chainIds.RINKEBY, provider)
    const balance = await contract.balanceOf(
      '0x7F18BB4Dd92CF2404C54CBa1A9BE4A1153bdb078'
    )
    //console.log(balance.toNumber())
  })
})
