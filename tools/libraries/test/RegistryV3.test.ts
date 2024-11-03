import { expect } from 'chai'

const { ChainIds } = require('@airswap/utils')
const { ethers } = require('hardhat')
const ERC20PresetFixedSupply = require('@openzeppelin/contracts/build/contracts/ERC20PresetFixedSupply.json')
const RegistryABI = require('registry-v3/build/contracts/Registry.sol/Registry.json')

const { RegistryV3 } = require('../index')

let deployer: any
let staker: any
let stakingToken: any
let baseToken: any
let quoteToken: any
let registryFactory: any
let registry: any

const SERVER_URL = 'https://maker.com/xyz'
const STAKING_COST = 1000
const SUPPORT_COST = 10
const TOKEN_BALANCE = 10000

describe('Registry', async () => {
  before(async () => {
    ;[deployer, staker] = await ethers.getSigners()
    stakingToken = await (
      await ethers.getContractFactory(
        ERC20PresetFixedSupply.abi,
        ERC20PresetFixedSupply.bytecode
      )
    ).deploy('TestERC20', 'TERC20', TOKEN_BALANCE, staker.address)
    baseToken = await (
      await ethers.getContractFactory(
        ERC20PresetFixedSupply.abi,
        ERC20PresetFixedSupply.bytecode
      )
    ).deploy('TestERC20', 'TERC20', TOKEN_BALANCE, staker.address)
    quoteToken = await (
      await ethers.getContractFactory(
        ERC20PresetFixedSupply.abi,
        ERC20PresetFixedSupply.bytecode
      )
    ).deploy('TestERC20', 'TERC20', TOKEN_BALANCE, staker.address)
    registryFactory = await ethers.getContractFactory(
      RegistryABI.abi,
      RegistryABI.bytecode
    )
    registry = await registryFactory
      .connect(deployer)
      .deploy(stakingToken.address, STAKING_COST, SUPPORT_COST)
    await registry.deployed()

    stakingToken.connect(staker).approve(registry.address, STAKING_COST * 2)

    await registry.connect(staker).setURL(SERVER_URL)
    await registry
      .connect(staker)
      .addTokens([quoteToken.address, baseToken.address])
  })

  it('get URLs: succeeds', async () => {
    const servers = await RegistryV3.getServerURLs(
      ethers.provider,
      ChainIds.HARDHAT,
      baseToken.address,
      quoteToken.address,
      registry.address
    )
    expect(servers.length).to.be.equal(1)
    expect(servers[0]).to.be.equal(SERVER_URL)
  })
})
