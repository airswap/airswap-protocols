const Staking = artifacts.require('Staking')
const ERC20PresetMinterPauser = artifacts.require('ERC20PresetMinterPauser')

const { emitted, reverted, equal } = require('@airswap/test-utils').assert
const { advanceTimeAndBlock } = require('@airswap/test-utils').time

contract('Staking', async accounts => {
  const ownerAddress = accounts[0]
  const aliceAddress = accounts[1]
  const bobAddress = accounts[2]
  const carolAddress = accounts[3]

  const SECONDS_IN_DAY = 86400

  const NAME = 'Staking'
  const SYMBOL = 'sAST'
  const DURATION = 4 * SECONDS_IN_DAY
  const CLIFF = 1 * SECONDS_IN_DAY

  let stakingToken
  let staking

  describe('Deploying...', async () => {
    it('Deployed staking token', async () => {
      stakingToken = await ERC20PresetMinterPauser.new('Fee', 'FEE')
    })

    it('Deployed Staking contract', async () => {
      staking = await Staking.new(
        stakingToken.address,
        NAME,
        SYMBOL,
        DURATION,
        CLIFF,
        {
          from: ownerAddress,
        }
      )
      equal((await staking.name()).toString(), 'Staking')
      equal((await staking.symbol()).toString(), 'sAST')
      equal((await staking.decimals()).toString(), '18')
    })

    it('Mints some tokens for Alice and Bob', async () => {
      emitted(await stakingToken.mint(aliceAddress, 100000000), 'Transfer')
      emitted(await stakingToken.mint(bobAddress, 100000000), 'Transfer')
    })
    it('Approves tokens for Alice and Bob', async () => {
      emitted(
        await stakingToken.approve(staking.address, 100000000, {
          from: aliceAddress,
        }),
        'Approval'
      )
    })
  })

  describe('Transfering and unstakeing', async () => {
    it('Alice stakes some tokens', async () => {
      emitted(
        await staking.stake(1000000, {
          from: aliceAddress,
        }),
        'Transfer'
      )
      equal((await staking.balanceOf(aliceAddress)).toString(), '1000000')
      equal((await staking.totalSupply()).toString(), '1000000')
    })
    it('Alice attempts to unstake prior to cliff', async () => {
      await reverted(
        staking.unstake([250000], {
          from: aliceAddress,
        }),
        'CLIFF_NOT_REACHED'
      )
    })
    it('Alice attempts to unstake too much after cliff', async () => {
      await advanceTimeAndBlock(CLIFF)
      await reverted(
        staking.unstake([500000], {
          from: aliceAddress,
        }),
        'AMOUNT_EXCEEDS_AVAILABLE'
      )
    })
    it('Alice unstakes a valid amount after cliff', async () => {
      emitted(
        await staking.unstake([250000], {
          from: aliceAddress,
        }),
        'Transfer'
      )
      equal((await staking.balanceOf(aliceAddress)).toString(), '750000')
    })
    it('Alice attempts to unstake too much', async () => {
      await reverted(
        staking.unstake([10000], {
          from: aliceAddress,
        }),
        'AMOUNT_EXCEEDS_AVAILABLE'
      )
    })
    it('Alice adds to her stake', async () => {
      emitted(
        await staking.extend(0, 500000, {
          from: aliceAddress,
        }),
        'Transfer'
      )
      equal((await staking.balanceOf(aliceAddress)).toString(), '1250000')
      equal((await staking.totalSupply()).toString(), '1250000')
    })
    it('Alice attempts to unstake too much', async () => {
      await advanceTimeAndBlock(CLIFF)
      await reverted(
        staking.unstake([500000], {
          from: aliceAddress,
        }),
        'AMOUNT_EXCEEDS_AVAILABLE'
      )
    })
    it('Alice multi unstake', async () => {
      await staking.stake(1000000, {
        from: aliceAddress,
      })
      await staking.stake(2000000, {
        from: aliceAddress,
      })
      await advanceTimeAndBlock(DURATION)
      emitted(
        await staking.unstake([0, 0, 2000000], {
          from: aliceAddress,
        }),
        'Transfer'
      )
      equal((await stakingToken.balanceOf(aliceAddress)).toString(), '97750000')
      equal((await staking.balanceOf(aliceAddress)).toString(), '2250000')
    })
    it('Alice multi unstake fails with out of range', async () => {
      await reverted(
        staking.unstake([0, 0, 1], {
          from: aliceAddress,
        }),
        'INDEX_OUT_OF_RANGE'
      )
      equal((await stakingToken.balanceOf(aliceAddress)).toString(), '97750000')
      equal((await staking.balanceOf(aliceAddress)).toString(), '2250000')
    })
    it('Alice multi unstake remaining', async () => {
      emitted(
        await staking.unstake([1250000, 1000000], {
          from: aliceAddress,
        }),
        'Transfer'
      )
      equal(
        (await stakingToken.balanceOf(aliceAddress)).toString(),
        '100000000'
      )
      equal((await staking.balanceOf(aliceAddress)).toString(), '0')
    })
    it('Alice stakes for Bob', async () => {
      emitted(
        await staking.stakeFor(bobAddress, 1000000, {
          from: aliceAddress,
        }),
        'Transfer'
      )
    })
    it('Bob stakes for Carol but fails for approval', async () => {
      await reverted(
        staking.stakeFor(carolAddress, 1000000, {
          from: bobAddress,
        })
      )
    })
    it('Bob approves for trade and stakes for Carol', async () => {
      emitted(
        await stakingToken.approve(staking.address, 100000000, {
          from: bobAddress,
        }),
        'Approval'
      )
      emitted(
        await staking.stakeFor(carolAddress, 1000000, {
          from: bobAddress,
        }),
        'Transfer'
      )
    })
    it('Alice extends for Carol', async () => {
      emitted(
        await staking.extendFor(0, carolAddress, 1000000, {
          from: aliceAddress,
        }),
        'Transfer'
      )
      equal((await staking.balanceOf(carolAddress)).toString(), '2000000')
    })
  })
})
