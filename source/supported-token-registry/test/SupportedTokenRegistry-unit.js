const { expect } = require('chai')
const timeMachine = require('ganache-time-traveler')
const { artifacts, ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const IERC20 = artifacts.require('IERC20')

describe('SupportedTokenRegistry Unit', () => {
  let snapshotId
  let deployer
  let account1
  let account2
  let stakingToken
  let registryFactory
  let registry
  const OBLIGATION_COST = 1000
  const TOKEN_COST = 10

  beforeEach(async () => {
    const snapshot = await timeMachine.takeSnapshot()
    snapshotId = snapshot['result']
  })

  afterEach(async () => {
    await timeMachine.revertToSnapshot(snapshotId)
  })

  before(async () => {
    ;[deployer, account1, account2] = await ethers.getSigners()
    stakingToken = await deployMockContract(deployer, IERC20.abi)
    registryFactory = await ethers.getContractFactory('SupportedTokenRegistry')
    registry = await registryFactory.deploy(
      stakingToken.address,
      OBLIGATION_COST,
      TOKEN_COST
    )
    await registry.deployed()
  })

  describe('Default Values', async () => {
    it('constructor set default values', async () => {
      const owner = await registry.owner()
      const tokenAddress = await registry.stakingToken()
      const obligationCost = await registry.obligationCost()
      const tokenCost = await registry.tokenCost()
      expect(owner).to.equal(deployer.address)
      expect(tokenAddress).to.equal(stakingToken.address)
      expect(obligationCost).to.equal(OBLIGATION_COST)
      expect(tokenCost).to.equal(TOKEN_COST)
    })
  })
})
