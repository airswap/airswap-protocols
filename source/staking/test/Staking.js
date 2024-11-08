const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
const BN = ethers.BigNumber
const { deployMockContract } = waffle
const IERC20 = require('@openzeppelin/contracts/build/contracts/ERC20.json')

describe('Staking Unit', () => {
  let snapshotId
  let deployer
  let account1
  let account2
  let token
  let stakingFactory
  let staking
  const DEFAULTDURATION = 100 // time in seconds
  const DEFAULTDELAY = 10

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
      'Staked AST',
      'sAST',
      token.address,
      DEFAULTDURATION,
      DEFAULTDELAY
    )
    await staking.deployed()
  })

  describe('Default Values', async () => {
    it('constructor sets default values', async () => {
      const owner = await staking.owner()
      const name = await staking.name()
      const symbol = await staking.symbol()
      const tokenAddress = await staking.stakingToken()
      const defaultduration = await staking.stakeDuration()

      expect(owner).to.equal(deployer.address)
      expect(name).to.equal('Staked AST')
      expect(symbol).to.equal('sAST')
      expect(tokenAddress).to.equal(token.address)
      expect(defaultduration).to.equal(DEFAULTDURATION)
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

    it('successful demicals call', async () => {
      await token.mock.decimals.returns('6')
      const decimals = await staking.connect(deployer).decimals()
      expect(decimals).to.equal(6)
    })
  })

  describe('Set stake duration and stakes unlock', async () => {
    it('non-owner cannot set stake duration', async () => {
      await staking
        .connect(deployer)
        .scheduleDurationChange(2 * DEFAULTDURATION, DEFAULTDELAY)

      // move 10 seconds forward
      await ethers.provider.send('evm_increaseTime', [10])
      await ethers.provider.send('evm_mine')

      await expect(
        staking.connect(account1).completeDurationChange()
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('non-owner cannot schedule a duration change', async () => {
      await expect(
        staking
          .connect(account1)
          .scheduleDurationChange(2 * DEFAULTDURATION, DEFAULTDELAY)
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('owner cannot reset stake duration during timelock', async () => {
      await staking
        .connect(deployer)
        .scheduleDurationChange(2 * DEFAULTDURATION, DEFAULTDELAY)

      await expect(
        staking.connect(deployer).completeDurationChange()
      ).to.be.revertedWith('Timelocked')
    })

    it('owner can set stake duration', async () => {
      await expect(
        await staking
          .connect(deployer)
          .scheduleDurationChange(2 * DEFAULTDURATION, DEFAULTDELAY)
      ).to.emit(staking, 'ScheduleDurationChange')

      // move 10 seconds forward
      await ethers.provider.send('evm_increaseTime', [10])
      await ethers.provider.send('evm_mine')

      await expect(
        await staking.connect(deployer).completeDurationChange()
      ).to.emit(staking, 'CompleteDurationChange')

      const defaultduration = await staking.stakeDuration()
      expect(defaultduration).to.equal(2 * DEFAULTDURATION)
    })

    it('owner cannot set timelock to be less than minimum delay', async () => {
      await expect(
        staking.connect(deployer).scheduleDurationChange(2 * DEFAULTDURATION, 0)
      )
        .to.be.revertedWith('DelayInvalid')
        .withArgs(0)
    })

    it('owner cannot reschedule timelock duration change', async () => {
      await expect(
        await staking
          .connect(deployer)
          .scheduleDurationChange(2 * DEFAULTDURATION, DEFAULTDELAY)
      ).to.emit(staking, 'ScheduleDurationChange')

      await expect(
        staking
          .connect(deployer)
          .scheduleDurationChange(2 * DEFAULTDURATION, DEFAULTDELAY)
      ).to.be.revertedWith('TimelockActive')
    })

    it('Owner cannot set stake duration to zero', async () => {
      await expect(
        staking.connect(deployer).scheduleDurationChange(0, DEFAULTDELAY)
      )
        .to.be.revertedWith('DurationInvalid')
        .withArgs(0)
    })

    it('Owner cannot set stake duration with canceled timelock', async () => {
      await staking
        .connect(deployer)
        .scheduleDurationChange(2 * DEFAULTDURATION, DEFAULTDELAY)

      expect(await staking.connect(deployer).cancelDurationChange()).to.emit(
        staking,
        'CancelDurationChange'
      )

      // move 10 seconds forward
      await ethers.provider.send('evm_increaseTime', [10])
      await ethers.provider.send('evm_mine')

      await expect(
        staking.connect(deployer).completeDurationChange()
      ).to.be.revertedWith('TimelockInactive')
    })

    it('Non-owner cannot cancel a duration change', async () => {
      await expect(
        staking.connect(account1).cancelDurationChange()
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('Owner cannot cancel timelock before it is set', async () => {
      expect(
        staking.connect(deployer).cancelDurationChange()
      ).to.be.revertedWith('TimelockInactive')
    })

    it('Only the admin can set unlock', async () => {
      expect(staking.connect(account1).setUnlocked(true)).to.be.revertedWith(
        'Unauthorized'
      )
    })
  })

  describe('Stake', async () => {
    it('successful staking', async () => {
      await token.mock.transferFrom.returns(true)
      await staking.connect(account1).stake('100')
      const block = await ethers.provider.getBlock()
      const userStake = await staking.connect(account1).stakes(account1.address)
      expect(userStake.balance).to.equal(100)
      expect(userStake.start).to.equal(block.timestamp)
    })

    it('successful staking for', async () => {
      await token.mock.transferFrom.returns(true)
      await staking.connect(account1).stakeFor(account2.address, '170')
      const userStake = await staking.connect(account1).stakes(account2.address)
      const block = await ethers.provider.getBlock()
      expect(userStake.balance).to.equal(170)
      expect(userStake.start).to.equal(block.timestamp)
    })

    it('unsuccessful staking', async () => {
      await token.mock.transferFrom.returns(false)
      await expect(staking.connect(account1).stake('100')).to.be.revertedWith(
        'SafeERC20: ERC20 operation did not succeed'
      )
    })

    it('unsuccessful staking when amount is 0', async () => {
      await expect(staking.connect(account1).stake('0'))
        .to.be.revertedWith('AmountInvalid')
        .withArgs(0)
    })

    it('unsuccessful extend stake when amount is 0', async () => {
      await token.mock.transferFrom.returns(true)
      await staking.connect(account1).stake('100')
      await expect(staking.connect(account1).stake('0'))
        .to.be.revertedWith('AmountInvalid')
        .withArgs(0)
    })

    it('successful extend stake when stake has been made', async () => {
      await token.mock.transferFrom.returns(true)
      await staking.connect(account1).stake('100')
      await staking.connect(account1).stake('120')

      const userStake = await staking.connect(account1).stakes(account1.address)

      const block = await ethers.provider.getBlock()

      expect(userStake.balance).to.equal(220)
      expect(userStake.start).to.equal(block.timestamp)
    })

    it('successful extend stake and timestamp updates to appropriate value', async () => {
      await token.mock.transferFrom.returns(true)
      await staking.connect(account1).stake('100')
      const block0 = await ethers.provider.getBlock()

      // move 100 seconds forward
      await ethers.provider.send('evm_mine', [block0.timestamp + 100])

      await staking.connect(account1).stake('120')

      const userStake = await staking.connect(account1).stakes(account1.address)

      const blockNewTime = await ethers.provider.getBlockNumber()
      const blockNewTimeInfo = await ethers.provider.getBlock(blockNewTime)

      expect(userStake.balance).to.equal(220)

      // check if timestamp was updated appropriately
      const diff = BN.from(blockNewTimeInfo.timestamp).sub(block0.timestamp)
      const product = BN.from(120).mul(diff)
      const quotient = product.div(BN.from(220))
      // + 1 because number rounds up to nearest whole
      const sum = BN.from(block0.timestamp).add(BN.from(quotient)).add(1)
      expect(userStake.start).to.equal(sum)
    })

    it('unsuccessful stakeFor when user staking for with an amount of 0', async () => {
      await expect(staking.connect(account1).stakeFor(account2.address, '0'))
        .to.be.revertedWith('AmountInvalid')
        .withArgs(0)
    })

    it('successful stakeFor when existing stake is not fully unstakeable', async () => {
      await token.mock.transferFrom.returns(true)
      await staking.connect(account2).stake('100')
      await expect(staking.connect(account1).stakeFor(account2.address, '1')).to
        .not.be.reverted

      const userStake = await staking.connect(account1).stakes(account2.address)

      expect(userStake.balance).to.equal(101)
    })

    it('successful stakeFor when existing stake is fully unstakeable', async () => {
      await token.mock.transferFrom.returns(true)
      await staking.connect(account2).stake('100')

      // move 10 seconds forward - 100% unstakeable
      await ethers.provider.send('evm_increaseTime', [10])
      await ethers.provider.send('evm_mine')

      await expect(staking.connect(account1).stakeFor(account2.address, '1')).to
        .not.be.reverted

      const userStake = await staking.connect(account1).stakes(account2.address)

      expect(userStake.balance).to.equal(101)
    })
  })

  describe('Unstake', async () => {
    it('unstaking fails when attempting to claim more than is available', async () => {
      await token.mock.transferFrom.returns(true)
      await token.mock.transfer.returns(true)
      await staking.connect(account1).stake('100')

      const block = await ethers.provider.getBlock()
      await ethers.provider.send('evm_mine', [block.timestamp + 10])

      await expect(staking.connect(account1).unstake('12'))
        .to.be.revertedWith('AmountInvalid')
        .withArgs(12)
    })

    it('successful full unstaking', async () => {
      await token.mock.transferFrom.returns(true)
      await token.mock.transfer.returns(true)
      await staking.connect(account1).stake('100')

      // move 100 seconds forward - 100% unstakeable
      await ethers.provider.send('evm_increaseTime', [100])
      await ethers.provider.send('evm_mine')

      await staking.connect(account1).unstake('100')
      const userStake = await staking.connect(account1).stakes(account1.address)

      expect(userStake.balance).to.equal(0)
    })

    it('fails attempting to unstake zero', async () => {
      await token.mock.transferFrom.returns(true)
      await token.mock.transfer.returns(true)
      await staking.connect(account1).stake('100')
      await expect(staking.connect(account1).unstake('0'))
        .to.be.revertedWith('AmountInvalid')
        .withArgs(0)
    })

    it('successful partial unstaking', async () => {
      await token.mock.transferFrom.returns(true)
      await token.mock.transfer.returns(true)
      await staking.connect(account1).stake('100')

      // move 10 seconds forward - 10% unstakeable
      await ethers.provider.send('evm_increaseTime', [10])
      await ethers.provider.send('evm_mine')

      await staking.connect(account1).unstake('10')
      const userStake = await staking.connect(account1).stakes(account1.address)

      expect(userStake.balance).to.equal(90)
    })

    it('successful successive maximum unstaking', async () => {
      await token.mock.transferFrom.returns(true)
      await token.mock.transfer.returns(true)
      await staking.connect(account1).stake('100')

      // move 10 seconds forward - 10% unstakeable
      await ethers.provider.send('evm_increaseTime', [10])
      await ethers.provider.send('evm_mine')

      await staking.connect(account1).unstake('11')
      const userStake = await staking.connect(account1).stakes(account1.address)

      expect(userStake.balance).to.equal(89)

      // move 20 seconds forward - 20% unstakeable
      await ethers.provider.send('evm_increaseTime', [20])
      await ethers.provider.send('evm_mine')
      await staking.connect(account1).unstake('21')
      const userStake2 = await staking
        .connect(account1)
        .stakes(account1.address)

      expect(userStake2.balance).to.equal(68)
    })

    it('successful partial unstaking after stake maturity', async () => {
      await token.mock.transferFrom.returns(true)
      await token.mock.transfer.returns(true)
      await staking.connect(account1).stake('100')

      // move 1000 seconds forward - 100% unstakeable
      await ethers.provider.send('evm_increaseTime', [999])
      await ethers.provider.send('evm_mine')

      await staking.connect(account1).unstake('10')
      const userStake = await staking.connect(account1).stakes(account1.address)

      expect(userStake.balance).to.equal(90)

      await staking.connect(account1).unstake('10')
      const userStake2 = await staking
        .connect(account1)
        .stakes(account1.address)

      expect(userStake2.balance).to.equal(80)
    })

    it('successful unstake after partial unstake and restake', async () => {
      await token.mock.transferFrom.returns(true)
      await token.mock.transfer.returns(true)
      await staking.connect(account1).stake('100')

      // move 1000 seconds forward - 100% unstakeable
      await ethers.provider.send('evm_increaseTime', [1000])
      await ethers.provider.send('evm_mine')

      // Unstake 10
      await staking.connect(account1).unstake('10')
      const userStake = await staking.connect(account1).stakes(account1.address)

      expect(userStake.balance).to.equal(90)

      // Stake 100
      await staking.connect(account1).stake('100')

      const userStake2 = await staking
        .connect(account1)
        .stakes(account1.address)

      expect(userStake2.balance).to.equal(190)

      // Unstake remainder of unstakable amount
      await staking.connect(account1).unstake('90')

      const userStake3 = await staking
        .connect(account1)
        .stakes(account1.address)

      expect(userStake3.balance).to.equal(100)

      // Cannot unstake the new amount immediately
      await expect(staking.connect(account1).unstake('10'))
        .to.be.revertedWith('AmountInvalid')
        .withArgs(10)

      // move 10 seconds forward - 10% unstakeable
      await ethers.provider.send('evm_increaseTime', [10])
      await ethers.provider.send('evm_mine')

      await staking.connect(account1).unstake('10')
      const userStake4 = await staking
        .connect(account1)
        .stakes(account1.address)

      expect(userStake4.balance).to.equal(90)
    })

    it('successful extended stake and successful unstaking', async () => {
      await token.mock.transferFrom.returns(true)
      await token.mock.transfer.returns(true)
      await staking.connect(account1).stake('100')
      await staking.connect(account1).stake('100')

      const initialUserStake = await staking
        .connect(account1)
        .stakes(account1.address)

      // move 10 seconds forward - 10% unstakeable
      await ethers.provider.send('evm_increaseTime', [10])
      await ethers.provider.send('evm_mine')

      await staking.connect(account1).unstake('10')
      const currentuserStake = await staking
        .connect(account1)
        .stakes(account1.address)

      expect(initialUserStake.balance).to.equal(200)
      expect(currentuserStake.balance).to.equal(190)
    })

    it('successful full unstake when unlocked', async () => {
      await token.mock.transferFrom.returns(true)
      await token.mock.transfer.returns(true)
      await staking.connect(account1).stake('100')

      await expect(staking.connect(account1).unstake('100')).to.be.revertedWith(
        'AmountInvalid'
      )
      await staking.connect(deployer).setUnlocked(true)

      await staking.connect(account1).unstake('100')
      const userStake = await staking.connect(account1).stakes(account1.address)

      expect(userStake.balance).to.equal(0)
    })
  })

  describe('Available to unstake', async () => {
    it('available to unstake is > 0, if time has passed', async () => {
      await token.mock.transferFrom.returns(true)
      await token.mock.transfer.returns(true)
      await staking.connect(account1).stake('100')

      const block = await ethers.provider.getBlock()
      await ethers.provider.send('evm_mine', [block.timestamp + 10])

      const available = await staking.available(account1.address)
      // every 1 block 1% is unstakeable, user can only claim starting afater 10 blocks, or 10% unstakeable
      expect(available).to.equal('10')
    })

    it('available to unstake is > 0, if time has passed with an updated stake duration', async () => {
      await token.mock.transferFrom.returns(true)
      await token.mock.transfer.returns(true)
      await staking.connect(account1).stake('100')

      const block = await ethers.provider.getBlock()
      await ethers.provider.send('evm_mine', [block.timestamp + 10])

      await staking.connect(account1).stake('100')

      const available = await staking.available(account1.address)

      // every 1 block 2% is unstakeable
      expect(available).to.equal('10')
    })

    it('the available balance should update', async () => {
      await token.mock.transferFrom.returns(true)
      await token.mock.transfer.returns(true)
      await staking.connect(account1).stake('100')

      const block = await ethers.provider.getBlock()
      await ethers.provider.send('evm_mine', [block.timestamp + 10])

      await staking.connect(account1).unstake('10')
      const available = await staking.available(account1.address)
      expect(available).to.equal('1')
    })

    it('the previous available balance should be maintained when not entirely unstaked', async () => {
      await token.mock.transferFrom.returns(true)
      await token.mock.transfer.returns(true)
      await staking.connect(account1).stake('100')

      const block = await ethers.provider.getBlock()
      // With a duration of 100, increasing the timestamp by 10 will unlock 10% of the staked balance
      await ethers.provider.send('evm_mine', [block.timestamp + 10])

      // We withdraw 2
      await staking.connect(account1).unstake('2')

      // The unstaking operation mine a new block with a timestamp increased by 1 hence a new balance of 9 and not 8
      const available = await staking.available(account1.address)
      expect(available).to.equal('9')
    })
  })

  describe('Delegate', async () => {
    it('delegate can be set', async () => {
      await expect(
        await staking.connect(account1).proposeDelegate(account2.address)
      ).to.emit(staking, 'ProposeDelegate')
      expect(
        await staking.connect(account1).proposedDelegates(account1.address)
      ).to.equal(account2.address)
      await expect(
        await staking.connect(account2).acceptDelegateProposal(account1.address)
      ).to.emit(staking, 'SetDelegate')
      expect(
        await staking.connect(account1).delegateStakers(account2.address)
      ).to.equal(account1.address)
      expect(
        await staking.connect(account1).stakerDelegates(account1.address)
      ).to.equal(account2.address)
      expect(
        await staking.connect(account1).proposedDelegates(account1.address)
      ).to.equal('0x0000000000000000000000000000000000000000')
    })

    it('unsuccessful delegate set if already a delegate', async () => {
      await staking.connect(account1).proposeDelegate(account2.address)
      await staking.connect(account2).acceptDelegateProposal(account1.address)
      await expect(staking.connect(deployer).proposeDelegate(account2.address))
        .to.be.revertedWith('DelegateTaken')
        .withArgs(account2.address)
    })

    it('unsuccessful delegate proposed if already delegating', async () => {
      await staking.connect(account1).proposeDelegate(account2.address)
      await staking.connect(account2).acceptDelegateProposal(account1.address)
      await expect(staking.connect(account1).proposeDelegate(deployer.address))
        .to.be.revertedWith('SenderHasDelegate')
        .withArgs(account1.address, deployer.address)
    })

    it('unsuccessful delegate set if already delegating', async () => {
      await staking.connect(account1).proposeDelegate(account2.address)
      await staking.connect(deployer).proposeDelegate(account2.address)
      await staking.connect(account2).acceptDelegateProposal(account1.address)
      await expect(
        staking.connect(account2).acceptDelegateProposal(deployer.address)
      )
        .to.be.revertedWith('DelegateTaken')
        .withArgs(deployer.address)
    })

    it('unsuccessful delegate set if delegate already staking', async () => {
      await token.mock.transferFrom.returns(true)
      await staking.connect(account2).stake('100')
      await expect(staking.connect(account1).proposeDelegate(account2.address))
        .to.be.revertedWith('DelegateStaked')
        .withArgs(account2.address)
    })

    it('unsuccessful delegate set if delegate stakes after proposal', async () => {
      await token.mock.transferFrom.returns(true)
      staking.connect(account1).proposeDelegate(account2.address)
      await staking.connect(account2).stake('100')
      await expect(
        staking.connect(account2).acceptDelegateProposal(account1.address)
      )
        .to.be.revertedWith('DelegateStaked')
        .withArgs(account1.address)
    })

    it('unsuccessful delegate set if not proposed', async () => {
      await expect(
        staking.connect(account2).acceptDelegateProposal(account1.address)
      )
        .to.be.revertedWith('DelegateNotProposed')
        .withArgs(account1.address)
    })

    it('delegate can be removed', async () => {
      const zeroAddress = '0x0000000000000000000000000000000000000000'
      await staking.connect(account1).proposeDelegate(account2.address)
      await staking.connect(account2).acceptDelegateProposal(account1.address)
      await staking.connect(account1).unsetDelegate(account2.address)
      expect(
        await staking.connect(account1).delegateStakers(account2.address)
      ).to.equal(zeroAddress)
      expect(
        await staking.connect(account1).stakerDelegates(account1.address)
      ).to.equal(zeroAddress)
    })

    it('unsuccessful delegate removed if not set as delegate', async () => {
      await expect(staking.connect(account1).unsetDelegate(account2.address))
        .to.be.revertedWith('DelegateNotSet')
        .withArgs(account2.address)
    })

    it('successful staking with delegate', async () => {
      await token.mock.transferFrom.returns(true)
      await staking.connect(account1).proposeDelegate(account2.address)
      await staking.connect(account2).acceptDelegateProposal(account1.address)
      await staking.connect(account2).stake('100')
      const block = await ethers.provider.getBlock()
      const userStake = await staking.connect(account2).stakes(account1.address)

      expect(userStake.balance).to.equal(100)
      expect(userStake.start).to.equal(block.timestamp)
    })

    it('successful staking for with delegate', async () => {
      await token.mock.transferFrom.returns(true)
      await staking.connect(account1).proposeDelegate(account2.address)
      await staking.connect(account2).acceptDelegateProposal(account1.address)
      await staking.connect(account1).stakeFor(account2.address, '100')
      const block = await ethers.provider.getBlock()
      const userStake = await staking.connect(account2).stakes(account1.address)
      expect(userStake.balance).to.equal(100)
      expect(userStake.start).to.equal(block.timestamp)
    })

    it('successful unstaking with delegate', async () => {
      await token.mock.transferFrom.returns(true)
      await token.mock.transfer.returns(true)
      await staking.connect(account1).proposeDelegate(account2.address)
      await staking.connect(account2).acceptDelegateProposal(account1.address)
      await staking.connect(account2).stake('100')

      // move 10 seconds forward - 10% unstakeable
      await ethers.provider.send('evm_increaseTime', [10])
      await ethers.provider.send('evm_mine')

      const initialuserStake = await staking
        .connect(account2)
        .stakes(account1.address)
      await staking.connect(account2).unstake('10')
      const currentuserStake = await staking
        .connect(account2)
        .stakes(account1.address)

      expect(initialuserStake.balance).to.equal(100)
      expect(currentuserStake.balance).to.equal(90)
    })

    it('successful extended stake and successful unstaking with delegate', async () => {
      await token.mock.transferFrom.returns(true)
      await token.mock.transfer.returns(true)
      await staking.connect(account1).proposeDelegate(account2.address)
      await staking.connect(account2).acceptDelegateProposal(account1.address)
      await staking.connect(account2).stake('100')
      await staking.connect(account2).stake('100')

      const initialUserStake = await staking
        .connect(account2)
        .stakes(account1.address)

      // move 10 seconds forward - 10% unstakeable
      await ethers.provider.send('evm_increaseTime', [10])
      await ethers.provider.send('evm_mine')

      await staking.connect(account1).unstake('10')
      const currentuserStake = await staking
        .connect(account2)
        .stakes(account1.address)

      expect(initialUserStake.balance).to.equal(200)
      expect(currentuserStake.balance).to.equal(190)
    })
  })

  describe('Balance of all stakes', async () => {
    it('get balance of all stakes', async () => {
      await token.mock.transferFrom.returns(true)
      await token.mock.transfer.returns(true)
      // stake 400 over 4 blocks
      await staking.connect(account1).stake('100')

      for (let index = 0; index < 3; index++) {
        await staking.connect(account1).stake('100')
      }
      const balance = await staking
        .connect(account1)
        .balanceOf(account1.address)
      expect(balance).to.equal('400')
    })

    it('get total supply of all stakes', async () => {
      await token.mock.transferFrom.returns(true)
      await token.mock.transfer.returns(true)

      // stake 400 over 4 blocks
      await staking.connect(account1).stake('100')

      for (let index = 0; index < 3; index++) {
        await staking.connect(account1).stake('100')
      }

      await staking.connect(account2).stake('100')

      const totalStakes =
        (await staking.connect(account1).balanceOf(account1.address)) +
        (await staking.connect(account2).balanceOf(account2.address))

      await token.mock.balanceOf.returns(totalStakes)

      const totalSupply = await staking.connect(account1).totalSupply()
      expect(totalSupply).to.equal(totalStakes)
    })
  })
})
