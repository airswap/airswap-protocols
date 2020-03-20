import { ethers } from 'ethers'
import { expect } from 'chai'

import { ERC20 } from '..'
const simple = require('simple-mock')

const BALANCE = 100

describe('ERC20', async () => {
  it('Tests balanceOf()', async () => {
    const contract = new ERC20('')
    simple.mock(contract, 'balanceOf').returnWith(100)
    const val = await contract.balanceOf('')
    expect(val).to.equal(100)
  })
})
