const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
const BN = ethers.BigNumber
const { deployMockContract } = waffle
const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json')

describe('Staking Unit', () => {
  let snapshotId
  let deployer
  let account1
  let account2
  let token
  let stakingFactory
  let staking
  const CLIFF = 10 // time in seconds
  const DURATION = 100 // time in seconds

  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot')
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  before(async () => {
    ;[deployer, account1, account2] = await ethers.getSigners()
    token = await deployMockContract(deployer, IERC20.abi)
    stakingFactory = await ethers.getContractFactory('Staking')
    staking = await stakingFactory.deploy(
      token.address,
      'Staked AST',
      'sAST',
      DURATION,
      CLIFF
    )
    await staking.deployed()
  })

  describe('Default Values', async () => {
    it('constructor sets default values', async () => {
      const owner = await staking.owner()
      const tokenAddress = await staking.token()
      const cliff = await staking.cliff()
      const duration = await staking.duration()

      expect(owner).to.equal(deployer.address)
      expect(tokenAddress).to.equal(token.address)
      expect(cliff).to.equal(CLIFF)
      expect(duration).to.equal(DURATION)
    })
  })

  describe('Set Metadata', async () => {
    it('non owner cannot set metadata', async () => {
      await expect(
        staking.connect(account1).setMetaData('Staked AST2', 'sAST2')
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('owner can set metadata', async () => {
      await staking.connect(deployer).setMetaData('Staked AST2', 'sAST2')

      const name = await staking.name()
      const symbol = await staking.symbol()
      expect(name).to.equal('Staked AST2')
      expect(symbol).to.equal('sAST2')
    })
  })

  describe('Set Vesting Schedule', async () => {
    it('non owner cannot set vesting schedule', async () => {
      await expect(
        staking.connect(account1).setVesting(0, 0)
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('owner can set vesting schedule', async () => {
      await staking.connect(deployer).setVesting(2 * DURATION, CLIFF)

      const cliff = await staking.cliff()
      const duration = await staking.duration()
      expect(cliff).to.equal(CLIFF)
      expect(duration).to.equal(2 * DURATION)
    })
  })

  describe('Stake', async () => {
    it('successful staking', async () => {
      await token.mock.transferFrom.returns(true)
      await staking.connect(account1).stake('100')
      const block = await ethers.provider.getBlock()
      const userStakes = await staking
        .connect(account1)
        .getStakes(account1.address)
      expect(userStakes.length).to.equal(1)
      expect(userStakes[0].initial).to.equal(100)
      expect(userStakes[0].balance).to.equal(100)
      expect(userStakes[0].cliff).to.equal(CLIFF)
      expect(userStakes[0].timestamp).to.equal(block.timestamp)
    })

    it('successful staking for', async () => {
      await token.mock.transferFrom.returns(true)
      await staking.connect(account1).stakeFor(account2.address, '170')
      const userStakes = await staking
        .connect(account1)
        .getStakes(account2.address)
      const block = await ethers.provider.getBlock()
      expect(userStakes.length).to.equal(1)
      expect(userStakes[0].initial).to.equal(170)
      expect(userStakes[0].balance).to.equal(170)
      expect(userStakes[0].cliff).to.equal(CLIFF)
      expect(userStakes[0].duration).to.equal(DURATION)
      expect(userStakes[0].timestamp).to.equal(block.timestamp)
    })

    it('successful multiple stakes', async () => {
      await token.mock.transferFrom.returns(true)
      await staking.connect(account1).stake('100')
      const block0 = await ethers.provider.getBlock()
      await staking.connect(account1).stake('140')
      const block1 = await ethers.provider.getBlock()
      const userStakes = await staking
        .connect(account1)
        .getStakes(account1.address)
      expect(userStakes.length).to.equal(2)

      expect(userStakes[0].initial).to.equal(100)
      expect(userStakes[0].balance).to.equal(100)
      expect(userStakes[0].cliff).to.equal(CLIFF)
      expect(userStakes[0].duration).to.equal(DURATION)
      expect(userStakes[0].timestamp).to.equal(block0.timestamp)

      expect(userStakes[1].initial).to.equal(140)
      expect(userStakes[1].balance).to.equal(140)
      expect(userStakes[1].cliff).to.equal(CLIFF)
      expect(userStakes[1].duration).to.equal(DURATION)
      expect(userStakes[1].timestamp).to.equal(block1.timestamp)
    })

    it('successful multiple stakes with an updated vesting schedule', async () => {
      await token.mock.transferFrom.returns(true)
      await staking.connect(account1).stake('100')
      const block0 = await ethers.provider.getBlock()
      await staking.connect(deployer).setVesting(DURATION * 2, CLIFF)
      await staking.connect(account1).stake('140')
      const block1 = await ethers.provider.getBlock()

      const userStakes = await staking
        .connect(account1)
        .getStakes(account1.address)
      expect(userStakes.length).to.equal(2)

      expect(userStakes[0].initial).to.equal(100)
      expect(userStakes[0].balance).to.equal(100)
      expect(userStakes[0].cliff).to.equal(CLIFF)
      expect(userStakes[0].duration).to.equal(DURATION)
      expect(userStakes[0].timestamp).to.equal(block0.timestamp)

      expect(userStakes[1].initial).to.equal(140)
      expect(userStakes[1].balance).to.equal(140)
      expect(userStakes[1].cliff).to.equal(CLIFF)
      expect(userStakes[1].duration).to.equal(DURATION * 2)
      expect(userStakes[1].timestamp).to.equal(block1.timestamp)
    })

    it('successful multiple stake fors', async () => {
      await token.mock.transferFrom.returns(true)
      await staking.connect(account1).stakeFor(account2.address, '100')
      const block0 = await ethers.provider.getBlock()
      await staking.connect(account1).stakeFor(account2.address, '140')
      const block1 = await ethers.provider.getBlock()
      const userStakes = await staking
        .connect(account1)
        .getStakes(account2.address)
      expect(userStakes.length).to.equal(2)

      expect(userStakes[0].initial).to.equal(100)
      expect(userStakes[0].balance).to.equal(100)
      expect(userStakes[0].cliff).to.equal(CLIFF)
      expect(userStakes[0].duration).to.equal(DURATION)
      expect(userStakes[0].timestamp).to.equal(block0.timestamp)

      expect(userStakes[1].initial).to.equal(140)
      expect(userStakes[1].balance).to.equal(140)
      expect(userStakes[1].cliff).to.equal(CLIFF)
      expect(userStakes[1].duration).to.equal(DURATION)
      expect(userStakes[1].timestamp).to.equal(block1.timestamp)
    })

    it('unsuccessful staking', async () => {
      await token.mock.transferFrom.revertsWithReason('Insufficient Funds')
      await expect(staking.connect(account1).stake('100')).to.be.revertedWith(
        'Insufficient Funds'
      )
    })

    it('unsuccessful staking when amount is 0', async () => {
      await expect(staking.connect(account1).stake('0')).to.be.revertedWith(
        'AMOUNT_INVALID'
      )
    })

    it('unsuccessful extend stake when amount is 0', async () => {
      await token.mock.transferFrom.returns(true)
      await expect(
        staking.connect(account1).extend('0', '0')
      ).to.be.revertedWith('AMOUNT_INVALID')
    })

    it('unsuccessful extend stake when no stakes made', async () => {
      await token.mock.transferFrom.returns(true)
      await expect(staking.connect(account1).extend('0', '100')).to.be.reverted
    })

    it('successful extend stake stake has been made', async () => {
      await token.mock.transferFrom.returns(true)
      await staking.connect(account1).stake('100')
      const block = await ethers.provider.getBlock()
      await staking.connect(account1).extend('0', '120')

      const userStakes = await staking
        .connect(account1)
        .getStakes(account1.address)
      expect(userStakes.length).to.equal(1)

      expect(userStakes[0].initial).to.equal(220)
      expect(userStakes[0].balance).to.equal(220)
      expect(userStakes[0].cliff).to.equal(CLIFF)
      expect(userStakes[0].duration).to.equal(DURATION)
      expect(userStakes[0].timestamp).to.equal(block.timestamp)
    })

    it('successful extend stake and timestamp updates to appropriate value', async () => {
      await token.mock.transferFrom.returns(true)
      await staking.connect(account1).stake('100')
      const block0 = await ethers.provider.getBlock()

      // move 100000 seconds forward
      await ethers.provider.send('evm_mine', [block0.timestamp + CLIFF])

      const blockNewTime = await ethers.provider.getBlockNumber()
      const blockNewTimeInfo = await ethers.provider.getBlock(blockNewTime)
      await staking.connect(account1).extend('0', '120')

      const userStakes = await staking
        .connect(account1)
        .getStakes(account1.address)
      expect(userStakes.length).to.equal(1)

      expect(userStakes[0].initial).to.equal(220)
      expect(userStakes[0].balance).to.equal(220)
      expect(userStakes[0].cliff).to.equal(CLIFF)
      expect(userStakes[0].duration).to.equal(DURATION)

      // check if timestamp was updated appropriately
      const diff = BN.from(blockNewTimeInfo.timestamp).sub(block0.timestamp)
      const product = BN.from(120).mul(diff)
      const quotient = product.div(BN.from(220))
      // + 1 because number rounds up to nearest whole
      const sum = BN.from(block0.timestamp).add(BN.from(quotient)).add(1)
      expect(userStakes[0].timestamp).to.equal(sum)
    })

    it('successful extend creates a new stake due to existing being fully vested', async () => {
      await token.mock.transferFrom.returns(true)
      await staking.connect(account1).stake('100')
      const block0 = await ethers.provider.getBlock()

      // advance to fully vest
      await ethers.provider.send('evm_mine', [block0.timestamp + DURATION])
      await staking.connect(account1).extend('0', '120')

      const userStakes = await staking
        .connect(account1)
        .getStakes(account1.address)
      expect(userStakes.length).to.equal(2)

      expect(userStakes[1].initial).to.equal(120)
      expect(userStakes[1].balance).to.equal(120)
      expect(userStakes[1].cliff).to.equal(CLIFF)
      expect(userStakes[1].duration).to.equal(DURATION)

      // check if timestamp was updated appropriately
      const block1 = await ethers.provider.getBlock()
      expect(userStakes[1].timestamp).to.equal(block1.timestamp)
    })

    it('unsuccessful extendFor when amount <= 0', async () => {
      await expect(
        staking.connect(account1).extendFor('0', account2.address, '0')
      ).to.be.revertedWith('AMOUNT_INVALID')
    })

    it('unsuccessful extendFor when user extending for has no take at selected index', async () => {
      await expect(
        staking.connect(account1).extendFor('0', account2.address, '0')
      ).to.be.reverted
    })

    it('successful extendFor when existing stake is not fully vested', async () => {
      await token.mock.transferFrom.returns(true)
      await staking.connect(account2).stake('100')
      await expect(
        staking.connect(account1).extendFor('0', account2.address, '1')
      ).to.not.be.reverted

      const userStakes = await staking
        .connect(account1)
        .getStakes(account2.address)
      expect(userStakes.length).to.equal(1)

      expect(userStakes[0].initial).to.equal(101)
      expect(userStakes[0].balance).to.equal(101)
      expect(userStakes[0].cliff).to.equal(CLIFF)
      expect(userStakes[0].duration).to.equal(DURATION)
    })

    it('successful extendFor when existing stake is fully vested', async () => {
      await token.mock.transferFrom.returns(true)
      await staking.connect(account2).stake('100')

      // move 10 seconds forward - 100% vested
      for (let index = 0; index < 100; index++) {
        await ethers.provider.send('evm_mine')
      }

      await expect(
        staking.connect(account1).extendFor('0', account2.address, '1')
      ).to.not.be.reverted

      //if the first stake is fully vested a second stake is created
      const userStakes = await staking
        .connect(account1)
        .getStakes(account2.address)
      expect(userStakes.length).to.equal(2)

      expect(userStakes[1].initial).to.equal(1)
      expect(userStakes[1].balance).to.equal(1)
      expect(userStakes[1].cliff).to.equal(CLIFF)
      expect(userStakes[1].duration).to.equal(DURATION)
    })
  })

  describe('Unstake', async () => {
    it('unstaking fails when cliff has not passed', async () => {
      await token.mock.transferFrom.returns(true)
      await token.mock.transfer.returns(true)
      await staking.connect(account1).stake('100')
      await expect(
        staking.connect(account1).unstake(['50'])
      ).to.be.revertedWith('CLIFF_NOT_REACHED')
    })

    it('unstaking fails when attempting to claim more than is available', async () => {
      await token.mock.transferFrom.returns(true)
      await token.mock.transfer.returns(true)
      await staking.connect(account1).stake('100')

      const block = await ethers.provider.getBlock()
      await ethers.provider.send('evm_mine', [block['timestamp'] + CLIFF])

      await expect(
        staking.connect(account1).unstake(['100'])
      ).to.be.revertedWith('AMOUNT_EXCEEDS_AVAILABLE')
    })

    it('successful unstaking', async () => {
      await token.mock.transferFrom.returns(true)
      await token.mock.transfer.returns(true)
      await staking.connect(account1).stake('100')

      // move 10 seconds forward - 10% vested
      for (let index = 0; index < 10; index++) {
        await ethers.provider.send('evm_mine')
      }

      await staking.connect(account1).unstake(['10'])
      const userStakes = await staking
        .connect(account1)
        .getStakes(account1.address)
      expect(userStakes.length).to.equal(1)
      expect(userStakes[0].initial).to.equal(100)
      expect(userStakes[0].balance).to.equal(90)
    })

    it('successful unstaking with updated vesting schedule', async () => {
      await token.mock.transferFrom.returns(true)
      await token.mock.transfer.returns(true)
      await staking.connect(account1).stake('100')
      await staking.connect(deployer).setVesting(DURATION * 2, CLIFF)
      await staking.connect(account1).stake('100')

      // move 10 seconds forward - 20% vested for second stake
      for (let index = 0; index < 10; index++) {
        await ethers.provider.send('evm_mine')
      }

      await staking.connect(account1).unstake(['0', '5'])
      const userStakes = await staking
        .connect(account1)
        .getStakes(account1.address)
      expect(userStakes.length).to.equal(2)
      expect(userStakes[1].initial).to.equal(100)
      expect(userStakes[1].balance).to.equal(95)
    })

    it('successful unstaking and removal of stake', async () => {
      await token.mock.transferFrom.returns(true)
      await token.mock.transfer.returns(true)
      await staking.connect(account1).stake('100')
      await staking.connect(account1).stake('200')
      const block0 = await ethers.provider.getBlock()
      await staking.connect(account1).stake('300')
      const block1 = await ethers.provider.getBlock()

      // move 100 seconds forward + 2 stakes = 102% vested
      for (let index = 0; index < 100; index++) {
        await ethers.provider.send('evm_mine')
      }

      await staking.connect(account1).unstake(['100'])
      const userStakes = await staking
        .connect(account1)
        .getStakes(account1.address)
      expect(userStakes.length).to.equal(2)

      // ensure stake 0 was overwritten with last stake
      expect(userStakes[0].initial).to.equal(300)
      expect(userStakes[0].balance).to.equal(300)
      expect(userStakes[0].timestamp).to.equal(block1.timestamp)
      expect(userStakes[1].initial).to.equal(200)
      expect(userStakes[1].balance).to.equal(200)
      expect(userStakes[1].timestamp).to.equal(block0.timestamp)
    })
  })

  describe('Vested', async () => {
    it('vested amounts match expected amount per block', async () => {
      await token.mock.transferFrom.returns(true)
      await token.mock.transfer.returns(true)
      await staking.connect(account1).stake('100')

      const block = await ethers.provider.getBlock()
      await ethers.provider.send('evm_mine', [block['timestamp'] + 5])

      const vestedAmount = await staking.vested(account1.address, '0')
      expect(vestedAmount).to.equal('5')
    })

    it('vested amounts match expected amount per block with an updated vesting schedule', async () => {
      await token.mock.transferFrom.returns(true)
      await token.mock.transfer.returns(true)
      await staking.connect(deployer).setVesting(DURATION * 2, CLIFF)
      await staking.connect(account1).stake('100')

      const block = await ethers.provider.getBlock()
      await ethers.provider.send('evm_mine', [block['timestamp'] + 20])

      const vestedAmount = await staking.vested(account1.address, '0')
      expect(vestedAmount).to.equal('10')
    })

    it('multiple vested amounts match expected amount per block', async () => {
      await token.mock.transferFrom.returns(true)
      await token.mock.transfer.returns(true)
      await staking.connect(account1).stake('100')
      // 10% of first stake is unlocked
      for (let index = 0; index < CLIFF; index++) {
        await ethers.provider.send('evm_mine')
      }
      await staking.connect(account1).stake('160')
      // 13% of second stake is unlocked
      for (let index = 0; index < 13; index++) {
        await ethers.provider.send('evm_mine')
      }
      await staking.connect(account1).stake('170')
      // 3% of third stake is unlocked
      for (let index = 0; index < 3; index++) {
        await ethers.provider.send('evm_mine')
      }

      // every 1 block 1% is vested, user can only claim starting after 10 blocks, or 10% vested
      // 10 blocks + 1 stake + 13 blocks + 1 stake + 3 blocks = 28 total blocks passed for first stake
      // 13 blocks + 1 stake + 3 blocks = 17 total blocks passed for second stake
      // 3 blocks = 3 total blocks passed for third stake

      const vestedAmount1 = await staking.vested(account1.address, '0')
      const vestedAmount2 = await staking.vested(account1.address, '1')
      const vestedAmount3 = await staking.vested(account1.address, '2')
      expect(vestedAmount1).to.equal('28')
      expect(vestedAmount2).to.equal('27')
      expect(vestedAmount3).to.equal('5')
    })
  })

  describe('Available to unstake', async () => {
    it('available to unstake is 0, if cliff has not passed', async () => {
      await token.mock.transferFrom.returns(true)
      await token.mock.transfer.returns(true)
      await staking.connect(account1).stake('100')

      const block = await ethers.provider.getBlock()
      await ethers.provider.send('evm_mine', [block['timestamp'] + CLIFF - 1])

      const available = await staking.available(account1.address, '0')
      expect(available).to.equal('0')
    })

    it('available to unstake is 0, if cliff has not passed with an updated vesting schedule', async () => {
      await token.mock.transferFrom.returns(true)
      await token.mock.transfer.returns(true)
      await staking.connect(account1).stake('100')
      await staking.connect(deployer).setVesting(DURATION, CLIFF)
      await staking.connect(account1).stake('100')
      // move 1 block before cliff for second stake
      for (let index = 0; index < CLIFF - 1; index++) {
        await ethers.provider.send('evm_mine')
      }
      const available = await staking.available(account1.address, '1')
      expect(available).to.equal('0')
    })

    it('available to unstake is > 0, if cliff has passed', async () => {
      await token.mock.transferFrom.returns(true)
      await token.mock.transfer.returns(true)
      await staking.connect(account1).stake('100')

      const block = await ethers.provider.getBlock()
      await ethers.provider.send('evm_mine', [block['timestamp'] + CLIFF])

      const available = await staking.available(account1.address, '0')
      // every 1 block 1% is vested, user can only claim starting afater 10 blocks, or 10% vested
      expect(available).to.equal('10')
    })

    it('available to unstake is > 0, if cliff has passed with an updated vesting schedule', async () => {
      await token.mock.transferFrom.returns(true)
      await token.mock.transfer.returns(true)
      await staking.connect(account1).stake('100')
      await staking.connect(deployer).setVesting(DURATION, CLIFF)
      await staking.connect(account1).stake('100')

      const block = await ethers.provider.getBlock()
      await ethers.provider.send('evm_mine', [block['timestamp'] + CLIFF])

      const available = await staking.available(account1.address, '1')
      // every 1 block 2% is vested, user can only claim starting afater 10 blocks, or 20% vested
      expect(available).to.equal('10')
    })

    it('available to unstake with multiple stakes and varying passed cliffs', async () => {
      await token.mock.transferFrom.returns(true)
      await token.mock.transfer.returns(true)
      await staking.connect(account1).stake('100')
      // 10% of first stake is unlocked
      for (let index = 0; index < CLIFF; index++) {
        await ethers.provider.send('evm_mine')
      }
      await staking.connect(account1).stake('160')
      // 13% of second stake is unlocked
      for (let index = 0; index < 13; index++) {
        await ethers.provider.send('evm_mine')
      }
      await staking.connect(account1).stake('170')
      // 3% of third stake is unlocked
      for (let index = 0; index < 3; index++) {
        await ethers.provider.send('evm_mine')
      }

      // every 1 block 1% is vested, user can only claim starting after 10 blocks, or 10% vested
      // 10 blocks + 1 stake + 13 blocks + 1 stake + 3 blocks = 28 total blocks passed for first stake
      // 13 blocks + 1 stake + 3 blocks = 17 total blocks passed for second stake
      // 3 blocks = 3 total blocks passed for third stake

      const availableStake1 = await staking.available(account1.address, '0')
      const availableStake2 = await staking.available(account1.address, '1')
      const availableStake3 = await staking.available(account1.address, '2')
      expect(availableStake1).to.equal('28')
      expect(availableStake2).to.equal('27')
      expect(availableStake3).to.equal('0')
    })
  })

  describe('Balance of all stakes', async () => {
    it('get balance of all stakes', async () => {
      await token.mock.transferFrom.returns(true)
      await token.mock.transfer.returns(true)
      // stake 400 over 4 blocks
      for (let index = 0; index < 4; index++) {
        await staking.connect(account1).stake('100')
      }
      const balance = await staking
        .connect(account1)
        .balanceOf(account1.address)
      expect(balance).to.equal('400')
    })
  })
})
