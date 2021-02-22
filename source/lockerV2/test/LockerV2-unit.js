const { expect } = require('chai')
const timeMachine = require('ganache-time-traveler')
const { artifacts, ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const IERC20 = artifacts.require('IERC20')
const IERC20_Interface = new ethers.utils.Interface(IERC20.abi)

describe('Locker V2', () => {
  let snapshotId
  let deployer
  let randomUser
  let stakingToken
  let lockerFactory
  let locker
  const CLIFF = 10
  const PERIOD_LENGTH = 3
  const PERCENT_PER_PERIOD = 10

  beforeEach(async () => {
    const snapshot = await timeMachine.takeSnapshot()
    snapshotId = snapshot['result']
  })

  afterEach(async () => {
    await timeMachine.revertToSnapshot(snapshotId)
  })

  before(async () => {
    [deployer, randomUser] = await ethers.getSigners()
    stakingToken = await deployMockContract(deployer, IERC20.abi)
    lockerFactory = await ethers.getContractFactory('LockerV2')
    locker = await lockerFactory.deploy(
      stakingToken.address,
      CLIFF,
      PERIOD_LENGTH,
      PERCENT_PER_PERIOD
    )
    await locker.deployed()
  })

  describe('Default Values', async () => {
    it('test constructor sets default values', async () => {
      const owner = await locker.owner()
      const tokenAddress = await locker.stakingToken()
      const cliff = await locker.cliff()
      const periodLength = await locker.periodLength()
      const percentPerPeriod = await locker.percentPerPeriod()

      expect(owner).to.equal(deployer.address)
      expect(tokenAddress).to.equal(stakingToken.address)
      expect(cliff).to.equal(CLIFF)
      expect(periodLength).to.equal(PERIOD_LENGTH)
      expect(percentPerPeriod).to.equal(PERCENT_PER_PERIOD)
    })
  })

  describe('Stake', async () => {
    it('test successful staking', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await locker.connect(randomUser).stake('100')
      const userStakes = await locker
        .connect(randomUser)
        .getStakes(randomUser.address)
      expect(userStakes.length).to.equal(1)
      expect(userStakes[0].initialAmount).to.equal(100)
      expect(userStakes[0].claimableAmount).to.equal(100)
    })
  })
})
