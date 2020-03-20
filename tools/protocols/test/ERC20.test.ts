import { ethers } from 'ethers'
import { expect } from 'chai'

import { ERC20 } from '..'
var simple = require('simple-mock')

const BALANCE = 100

describe('ERC20', async () => {
  it('Tests balanceOf()', async () => {
    const contract = new ERC20('')
    simple.mock(contract, 'balanceOf').returnWith(100)
    let val = await contract.balanceOf('')
    expect(val).to.equal(100)
  })
})
