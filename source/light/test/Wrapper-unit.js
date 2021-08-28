const {
  assert: { equal },
} = require('@airswap/test-utils')
const timeMachine = require('ganache-time-traveler')
const { artifacts, ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const IERC20 = artifacts.require('IERC20')
const Light = artifacts.require('Light')

describe('Light Unit', () => {
  let snapshotId
  let wrapper
  let light
  let weth
  let signerToken
  let senderToken

  let deployer

  beforeEach(async () => {
    const snapshot = await timeMachine.takeSnapshot()
    snapshotId = snapshot['result']
  })

  afterEach(async () => {
    await timeMachine.revertToSnapshot(snapshotId)
  })

  before('get signers and deploy', async () => {
    ;[deployer] = await ethers.getSigners()

    light = await deployMockContract(deployer, Light.abi)
    weth = await deployMockContract(deployer, IERC20.abi)
    signerToken = await deployMockContract(deployer, IERC20.abi)
    senderToken = await deployMockContract(deployer, IERC20.abi)
    await signerToken.mock.transferFrom.returns(true)
    await senderToken.mock.transferFrom.returns(true)

    wrapper = await (await ethers.getContractFactory('LightWrapper')).deploy(
      light.address,
      weth.address
    )
    await wrapper.deployed()
  })

  describe('Default Values', async () => {
    it('constructor sets default values', async () => {
      const swapContract = await wrapper.swapContract()
      const wethContract = await wrapper.wethContract()
      equal(swapContract, light.address)
      equal(wethContract, weth.address)
    })
  })
})
