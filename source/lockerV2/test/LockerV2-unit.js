const { expect } = require('chai')
const timeMachine = require('ganache-time-traveler')
const { artifacts, ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const IERC20 = artifacts.require('IERC20')

describe('LockerV2 Unit', () => {
  let snapshotId
  let deployer
  let account1
  let account2
  let stakingToken
  let lockerFactory
  let locker
  const CLIFF = 10 //blocks
  const PERIOD_LENGTH = 1 //blocks
  const PERCENT_PER_PERIOD = 1 //percent
  // every 1 block 1% is vested, user can only claim starting afater 10 blocks, or 10% vested

  beforeEach(async () => {
    const snapshot = await timeMachine.takeSnapshot()
    snapshotId = snapshot['result']
  })

  afterEach(async () => {
    await timeMachine.revertToSnapshot(snapshotId)
  })

  before(async () => {
    [deployer, account1, account2] = await ethers.getSigners()
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
      await locker.connect(account1).stake('100')
      const userStakes = await locker
        .connect(account1)
        .getStakes(account1.address)
      expect(userStakes.length).to.equal(1)
      expect(userStakes[0].initialAmount).to.equal(100)
      expect(userStakes[0].claimableAmount).to.equal(100)
    })

    it('test successful staking for', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await locker.connect(account1).stakeFor(account2.address, '170')
      const userStakes = await locker
        .connect(account1)
        .getStakes(account2.address)
      expect(userStakes.length).to.equal(1)
      expect(userStakes[0].initialAmount).to.equal(170)
      expect(userStakes[0].claimableAmount).to.equal(170)
    })

    // TEST failure on transfers
    // TEST  more than 1 stake
  })

  describe('Unstake', async () => {
    it('test unstaking fails when cliff has not passed', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await stakingToken.mock.transfer.returns(true)
      await locker.connect(account1).stake('100')
      await expect(
        locker.connect(account1).unstake('0', '50')
      ).to.be.revertedWith('cliff not reached')
    })

    it('test unstaking fails when attempting to claim more than is available', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await stakingToken.mock.transfer.returns(true)
      await locker.connect(account1).stake('100')

      // move 10 blocks forward - 10% vested
      for (let index = 0; index < 10; index++) {
        await timeMachine.advanceBlock()
      }

      await expect(
        locker.connect(account1).unstake('0', '50')
      ).to.be.revertedWith('insufficient claimable amount')
    })

    it('test a successful unstaking', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await stakingToken.mock.transfer.returns(true)
      await locker.connect(account1).stake('100')

      // move 10 blocks forward - 10% vested
      for (let index = 0; index < 10; index++) {
        await timeMachine.advanceBlock()
      }

      await locker.connect(account1).unstake('0', '10')
      const userStakes = await locker
        .connect(account1)
        .getStakes(account1.address)
      expect(userStakes.length).to.equal(1)
      expect(userStakes[0].initialAmount).to.equal(100)
      expect(userStakes[0].claimableAmount).to.equal(90)
    })

    it('test a successful unstaking and removal of stake', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await stakingToken.mock.transfer.returns(true)
      await locker.connect(account1).stake('100')

      // move 100 blocks forward - 100% vested
      for (let index = 0; index < 100; index++) {
        await timeMachine.advanceBlock()
      }

      await locker.connect(account1).unstake('0', '100')
      const userStakes = await locker
        .connect(account1)
        .getStakes(account1.address)
      expect(userStakes.length).to.equal(0)
    })
  })

  describe('Vested', async () => {
    it('test getting vested amounts match expected amount per block', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await stakingToken.mock.transfer.returns(true)
      await locker.connect(account1).stake('100')
      // move 5 blocks forward - 5%
      for (let index = 0; index < 5; index++) {
        await timeMachine.advanceBlock()
      }
      const vestedAmount = await locker.vested('0', account1.address)
      expect(vestedAmount).to.equal('5')
    })
  })

  describe('Available to unstake', async () => {
    it('test available to unstake is 0, if cliff has not passed', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await stakingToken.mock.transfer.returns(true)
      await locker.connect(account1).stake('100')
      const availableToUnstake = await locker.availableToUnstake(
        '0',
        account1.address
      )

      for (let index = 0; index < CLIFF - 1; index++) {
        await timeMachine.advanceBlock()
      }
      expect(availableToUnstake).to.equal('0')
    })

    it('test available to unstake is > 0, if cliff has passed', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await stakingToken.mock.transfer.returns(true)
      await locker.connect(account1).stake('100')
      for (let index = 0; index < CLIFF; index++) {
        await timeMachine.advanceBlock()
      }

      const availableToUnstake = await locker.availableToUnstake(
        '0',
        account1.address
      )
      // every 1 block 1% is vested, user can only claim starting afater 10 blocks, or 10% vested
      expect(availableToUnstake).to.equal('10')
    })
  })

  describe('Balance of all stakes', async () => {
    it('test get balance of all stakes', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await stakingToken.mock.transfer.returns(true)
      // stake 400 over 4 blocks
      for (let index = 0; index < 4; index++) {
        await locker.connect(account1).stake('100')
      }
      const balance = await locker.connect(account1).balanceOf(account1.address)
      expect(balance).to.equal('400')
    })
  })
})
