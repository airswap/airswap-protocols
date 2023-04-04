import { expect } from 'chai'
const { network, ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle

import { createOrder, createOrderSignature } from '@airswap/utils'
import { Swap } from '../index'
import { tokenKinds } from '@airswap/constants'

const SwapContract = require('@airswap/swap/build/contracts/Swap.sol/Swap.json')
const ERC20AdapterContract = require('@airswap/swap/build/contracts/adapters/ERC20Adapter.sol/ERC20Adapter.json')
const IERC20Contract = require('@openzeppelin/contracts/build/contracts/IERC20.json')
const chainId = network.config.chainId
const protocolFee = 0

let deployer
let signer
let sender
let swap
let adapter
let token
let order

before('deploy adapter and swap', async () => {
  ;[deployer, signer, sender] = await ethers.getSigners()
  token = await deployMockContract(deployer, IERC20Contract.abi)
  await token.mock.allowance.returns(0)
  await token.mock.balanceOf.returns(0)
  await token.mock.transferFrom.returns(true)
  adapter = await (
    await ethers.getContractFactory(
      ERC20AdapterContract.abi,
      ERC20AdapterContract.bytecode
    )
  ).deploy()
  await adapter.deployed()
  swap = await (
    await ethers.getContractFactory(SwapContract.abi, SwapContract.bytecode)
  ).deploy([adapter.address], tokenKinds.ERC20, protocolFee, deployer.address)
  await swap.deployed()

  const unsignedOrder = createOrder({
    protocolFee,
    signer: {
      wallet: signer.address,
      token: token.address,
    },
    sender: {
      wallet: sender.address,
      token: token.address,
    },
  })
  const signature = await createOrderSignature(
    unsignedOrder,
    signer,
    swap.address,
    chainId
  )
  order = {
    ...unsignedOrder,
    ...signature,
  }
})

describe('Swap', () => {
  it('check should succeed', async () => {
    const lib = new Swap(sender, swap.address)
    const errors = await lib.check(order)
    expect(errors.length).to.be.equal(0)
  })
  it('swap should succeed', async () => {
    const lib = new Swap(sender, swap.address)
    const { hash } = await lib.swap(order, '0')
    expect(hash).to.not.be.null
  })
  it('cancel should succeed', async () => {
    const lib = new Swap(signer, swap.address)
    const { hash } = await lib.cancel(['0'])
    expect(hash).to.not.be.null
  })
})
