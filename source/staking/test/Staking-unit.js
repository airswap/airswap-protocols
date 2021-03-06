const { expect } = require('chai')
const timeMachine = require('ganache-time-traveler')
const { artifacts, ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const IERC20 = artifacts.require('IERC20')

describe('Staking Unit', () => {
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
    ;[deployer, account1, account2] = await ethers.getSigners()
    stakingToken = await deployMockContract(deployer, IERC20.abi)
    lockerFactory = await ethers.getContractFactory('Staking')
    locker = await lockerFactory.deploy(
      stakingToken.address,
      CLIFF,
      PERIOD_LENGTH,
      PERCENT_PER_PERIOD
    )
    await locker.deployed()
  })

  describe('Default Values', async () => {
    it('constructor sets default values', async () => {
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

  describe('Set Vesting Schedule', async () => {
    it('non owner cannot set vesting schedule', async () => {
      await expect(
        locker.connect(account1).setVestingSchedule(0, 0, 0)
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('owner can set vesting schedule', async () => {
      await locker
        .connect(deployer)
        .setVestingSchedule(CLIFF, PERIOD_LENGTH, 2 * PERCENT_PER_PERIOD)

      const cliff = await locker.cliff()
      const periodLength = await locker.periodLength()
      const percentPerPeriod = await locker.percentPerPeriod()
      expect(cliff).to.equal(CLIFF)
      expect(periodLength).to.equal(PERIOD_LENGTH)
      expect(percentPerPeriod).to.equal(2 * PERCENT_PER_PERIOD)
    })
  })

  describe('Stake', async () => {
    it('successful staking', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await locker.connect(account1).stake('100')
      const userStakes = await locker
        .connect(account1)
        .getStakes(account1.address)
      expect(userStakes.length).to.equal(1)
      expect(userStakes[0].initialBalance).to.equal(100)
      expect(userStakes[0].currentBalance).to.equal(100)
      expect(userStakes[0].cliff).to.equal(CLIFF)
      expect(userStakes[0].periodLength).to.equal(PERIOD_LENGTH)
      expect(userStakes[0].percentPerPeriod).to.equal(PERCENT_PER_PERIOD)
    })

    it('successful staking for', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await locker.connect(account1).stakeFor(account2.address, '170')
      const userStakes = await locker
        .connect(account1)
        .getStakes(account2.address)
      expect(userStakes.length).to.equal(1)
      expect(userStakes[0].initialBalance).to.equal(170)
      expect(userStakes[0].currentBalance).to.equal(170)
      expect(userStakes[0].cliff).to.equal(CLIFF)
      expect(userStakes[0].periodLength).to.equal(PERIOD_LENGTH)
      expect(userStakes[0].percentPerPeriod).to.equal(PERCENT_PER_PERIOD)
    })

    it('successful multiple stakes', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await locker.connect(account1).stake('100')
      await locker.connect(account1).stake('140')
      const userStakes = await locker
        .connect(account1)
        .getStakes(account1.address)
      expect(userStakes.length).to.equal(2)

      expect(userStakes[0].initialBalance).to.equal(100)
      expect(userStakes[0].currentBalance).to.equal(100)
      expect(userStakes[0].cliff).to.equal(CLIFF)
      expect(userStakes[0].periodLength).to.equal(PERIOD_LENGTH)
      expect(userStakes[0].percentPerPeriod).to.equal(PERCENT_PER_PERIOD)

      expect(userStakes[1].initialBalance).to.equal(140)
      expect(userStakes[1].currentBalance).to.equal(140)
      expect(userStakes[1].cliff).to.equal(CLIFF)
      expect(userStakes[1].periodLength).to.equal(PERIOD_LENGTH)
      expect(userStakes[1].percentPerPeriod).to.equal(PERCENT_PER_PERIOD)
    })

    it('successful multiple stakes with an updated vesting schedule', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await locker.connect(account1).stake('100')
      await locker
        .connect(deployer)
        .setVestingSchedule(CLIFF, PERIOD_LENGTH, 2 * PERCENT_PER_PERIOD)
      await locker.connect(account1).stake('140')

      const userStakes = await locker
        .connect(account1)
        .getStakes(account1.address)
      expect(userStakes.length).to.equal(2)

      expect(userStakes[0].initialBalance).to.equal(100)
      expect(userStakes[0].currentBalance).to.equal(100)
      expect(userStakes[0].cliff).to.equal(CLIFF)
      expect(userStakes[0].periodLength).to.equal(PERIOD_LENGTH)
      expect(userStakes[0].percentPerPeriod).to.equal(PERCENT_PER_PERIOD)

      expect(userStakes[1].initialBalance).to.equal(140)
      expect(userStakes[1].currentBalance).to.equal(140)
      expect(userStakes[1].cliff).to.equal(CLIFF)
      expect(userStakes[1].periodLength).to.equal(PERIOD_LENGTH)
      expect(userStakes[1].percentPerPeriod).to.equal(2 * PERCENT_PER_PERIOD)
    })

    it('successful multiple stake fors', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await locker.connect(account1).stakeFor(account2.address, '100')
      await locker.connect(account1).stakeFor(account2.address, '140')
      const userStakes = await locker
        .connect(account1)
        .getStakes(account2.address)
      expect(userStakes.length).to.equal(2)

      expect(userStakes[0].initialBalance).to.equal(100)
      expect(userStakes[0].currentBalance).to.equal(100)
      expect(userStakes[0].cliff).to.equal(CLIFF)
      expect(userStakes[0].periodLength).to.equal(PERIOD_LENGTH)
      expect(userStakes[0].percentPerPeriod).to.equal(PERCENT_PER_PERIOD)

      expect(userStakes[1].initialBalance).to.equal(140)
      expect(userStakes[1].currentBalance).to.equal(140)
      expect(userStakes[1].cliff).to.equal(CLIFF)
      expect(userStakes[1].periodLength).to.equal(PERIOD_LENGTH)
      expect(userStakes[1].percentPerPeriod).to.equal(PERCENT_PER_PERIOD)
    })

    it('unsuccessful staking', async () => {
      await stakingToken.mock.transferFrom.revertsWithReason(
        'Insufficient Funds'
      )
      await expect(locker.connect(account1).stake('100')).to.be.revertedWith(
        'Insufficient Funds'
      )
    })

    it('unsuccessful add to stake when no stakes made', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await expect(locker.connect(account1).addToStake('0', '100')).to.be
        .reverted
    })

    it('successful add to stake stake has been made', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await locker.connect(account1).stake('100')
      await locker.connect(account1).addToStake('0', '120')

      const userStakes = await locker
        .connect(account1)
        .getStakes(account1.address)
      expect(userStakes.length).to.equal(1)

      expect(userStakes[0].initialBalance).to.equal(220)
      expect(userStakes[0].currentBalance).to.equal(220)
      expect(userStakes[0].cliff).to.equal(CLIFF)
      expect(userStakes[0].periodLength).to.equal(PERIOD_LENGTH)
      expect(userStakes[0].percentPerPeriod).to.equal(PERCENT_PER_PERIOD)
    })
  })

  describe('Unstake', async () => {
    it('unstaking fails when cliff has not passed', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await stakingToken.mock.transfer.returns(true)
      await locker.connect(account1).stake('100')
      await expect(
        locker.connect(account1).unstake('0', '50')
      ).to.be.revertedWith('cliff not reached')
    })

    it('unstaking fails when attempting to claim more than is available', async () => {
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

    it('successful unstaking', async () => {
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
      expect(userStakes[0].initialBalance).to.equal(100)
      expect(userStakes[0].currentBalance).to.equal(90)
    })

    it('successful unstaking with updated vesting schedule', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await stakingToken.mock.transfer.returns(true)
      await locker.connect(account1).stake('100')
      await locker
        .connect(deployer)
        .setVestingSchedule(CLIFF, PERIOD_LENGTH, 2 * PERCENT_PER_PERIOD)
      await locker.connect(account1).stake('100')

      // move 10 blocks forward - 20% vested for second stake
      for (let index = 0; index < 10; index++) {
        await timeMachine.advanceBlock()
      }

      await locker.connect(account1).unstake('1', '20')
      const userStakes = await locker
        .connect(account1)
        .getStakes(account1.address)
      expect(userStakes.length).to.equal(2)
      expect(userStakes[1].initialBalance).to.equal(100)
      expect(userStakes[1].currentBalance).to.equal(80)
    })

    it('successful unstaking and removal of stake', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await stakingToken.mock.transfer.returns(true)
      await locker.connect(account1).stake('100')
      await locker.connect(account1).stake('200')
      await locker.connect(account1).stake('300')

      // move 100 blocks forward + 2 stakes = 102% vested
      for (let index = 0; index < 100; index++) {
        await timeMachine.advanceBlock()
      }

      await locker.connect(account1).unstake('0', '100')
      const userStakes = await locker
        .connect(account1)
        .getStakes(account1.address)
      expect(userStakes.length).to.equal(2)

      // ensure stake 0 was overwritten with last stake
      expect(userStakes[0].initialBalance).to.equal(300)
      expect(userStakes[0].currentBalance).to.equal(300)
      expect(userStakes[1].initialBalance).to.equal(200)
      expect(userStakes[1].currentBalance).to.equal(200)
    })
  })

  describe('Vested', async () => {
    it('vested amounts match expected amount per block', async () => {
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

    it('vested amounts match expected amount per block with an updated vesting schedule', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await stakingToken.mock.transfer.returns(true)
      await locker
        .connect(deployer)
        .setVestingSchedule(CLIFF, PERIOD_LENGTH, 2 * PERCENT_PER_PERIOD)
      await locker.connect(account1).stake('100')
      // move 5 blocks forward - 10%
      for (let index = 0; index < 5; index++) {
        await timeMachine.advanceBlock()
      }
      const vestedAmount = await locker.vested('0', account1.address)
      expect(vestedAmount).to.equal('10')
    })

    it('multiple vested amounts match expected amount per block', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await stakingToken.mock.transfer.returns(true)
      await locker.connect(account1).stake('100')
      // 10% of first stake is unlocked
      for (let index = 0; index < CLIFF; index++) {
        await timeMachine.advanceBlock()
      }
      await locker.connect(account1).stake('160')
      // 13% of second stake is unlocked
      for (let index = 0; index < 13; index++) {
        await timeMachine.advanceBlock()
      }
      await locker.connect(account1).stake('170')
      // 3% of third stake is unlocked
      for (let index = 0; index < 3; index++) {
        await timeMachine.advanceBlock()
      }

      // every 1 block 1% is vested, user can only claim starting after 10 blocks, or 10% vested
      // 10 blocks + 1 stake + 13 blocks + 1 stake + 3 blocks = 28 total blocks passed for first stake
      // 13 blocks + 1 stake + 3 blocks = 17 total blocks passed for second stake
      // 3 blocks = 3 total blocks passed for third stake

      const vestedAmount1 = await locker.vested('0', account1.address)
      const vestedAmount2 = await locker.vested('1', account1.address)
      const vestedAmount3 = await locker.vested('2', account1.address)
      expect(vestedAmount1).to.equal('28')
      expect(vestedAmount2).to.equal('27')
      expect(vestedAmount3).to.equal('5')
    })
  })

  describe('Available to unstake', async () => {
    it('available to unstake is 0, if cliff has not passed', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await stakingToken.mock.transfer.returns(true)
      await locker.connect(account1).stake('100')
      // move 1 block before cliff
      for (let index = 0; index < CLIFF - 1; index++) {
        await timeMachine.advanceBlock()
      }
      const availableToUnstake = await locker.availableToUnstake(
        '0',
        account1.address
      )
      expect(availableToUnstake).to.equal('0')
    })

    it('available to unstake is 0, if cliff has not passed with an updated vesting schedule', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await stakingToken.mock.transfer.returns(true)
      await locker.connect(account1).stake('100')
      await locker
        .connect(deployer)
        .setVestingSchedule(CLIFF, PERIOD_LENGTH, 2 * PERCENT_PER_PERIOD)
      await locker.connect(account1).stake('100')
      // move 1 block before cliff for second stake
      for (let index = 0; index < CLIFF - 1; index++) {
        await timeMachine.advanceBlock()
      }
      const availableToUnstake = await locker.availableToUnstake(
        '1',
        account1.address
      )
      expect(availableToUnstake).to.equal('0')
    })

    it('available to unstake is > 0, if cliff has passed', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await stakingToken.mock.transfer.returns(true)
      await locker.connect(account1).stake('100')
      // move to cliff block
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

    it('available to unstake is > 0, if cliff has passed with an updated vesting schedule', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await stakingToken.mock.transfer.returns(true)
      await locker.connect(account1).stake('100')
      await locker
        .connect(deployer)
        .setVestingSchedule(CLIFF, PERIOD_LENGTH, 2 * PERCENT_PER_PERIOD)
      await locker.connect(account1).stake('100')
      // move to cliff block
      for (let index = 0; index < CLIFF; index++) {
        await timeMachine.advanceBlock()
      }
      const availableToUnstake = await locker.availableToUnstake(
        '1',
        account1.address
      )
      // every 1 block 2% is vested, user can only claim starting afater 10 blocks, or 20% vested
      expect(availableToUnstake).to.equal('20')
    })

    it('available to unstake with multiple stakes and varying passed cliffs', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await stakingToken.mock.transfer.returns(true)
      await locker.connect(account1).stake('100')
      // 10% of first stake is unlocked
      for (let index = 0; index < CLIFF; index++) {
        await timeMachine.advanceBlock()
      }
      await locker.connect(account1).stake('160')
      // 13% of second stake is unlocked
      for (let index = 0; index < 13; index++) {
        await timeMachine.advanceBlock()
      }
      await locker.connect(account1).stake('170')
      // 3% of third stake is unlocked
      for (let index = 0; index < 3; index++) {
        await timeMachine.advanceBlock()
      }

      // every 1 block 1% is vested, user can only claim starting after 10 blocks, or 10% vested
      // 10 blocks + 1 stake + 13 blocks + 1 stake + 3 blocks = 28 total blocks passed for first stake
      // 13 blocks + 1 stake + 3 blocks = 17 total blocks passed for second stake
      // 3 blocks = 3 total blocks passed for third stake

      const availableStake1 = await locker.availableToUnstake(
        '0',
        account1.address
      )
      const availableStake2 = await locker.availableToUnstake(
        '1',
        account1.address
      )
      const availableStake3 = await locker.availableToUnstake(
        '2',
        account1.address
      )
      expect(availableStake1).to.equal('28')
      expect(availableStake2).to.equal('27')
      expect(availableStake3).to.equal('0')
    })
  })

  describe('Balance of all stakes', async () => {
    it('get balance of all stakes', async () => {
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
