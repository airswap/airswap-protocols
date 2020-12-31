const { ethers } = require('ethers')
const Locker = artifacts.require('Locker')
const ERC20PresetMinterPauser = artifacts.require('ERC20PresetMinterPauser')
const MockContract = artifacts.require('MockContract')
const { ADDRESS_ZERO } = require('@airswap/constants')
const { takeSnapshot, revertToSnapshot } = require('@airswap/test-utils').time
const { emitted, reverted, equal } = require('@airswap/test-utils').assert

contract('Locker Unit Tests', async accounts => {
  const ownerAddress = accounts[0]
  const aliceAddress = accounts[1]
  const bobAddress = accounts[2]

  const SECONDS_IN_DAY = 86400
  const THROTTLING_PERCENTAGE = 10
  const THROTTLING_DURATION = 7 * SECONDS_IN_DAY
  const THROTTLING_BALANCE = 100

  let lockerToken
  let locker
  let mockFungibleTokenTemplate
  let snapshotId

  beforeEach(async () => {
    const snapshot = await takeSnapshot()
    snapshotId = snapshot['result']
  })

  afterEach(async () => {
    await revertToSnapshot(snapshotId)
  })

  before(async () => {
    lockerToken = await MockContract.new()
    mockFungibleTokenTemplate = await ERC20PresetMinterPauser.new('Fee', 'FEE')

    locker = await Locker.new(
      lockerToken.address,
      'Locker',
      'LCK',
      4,
      THROTTLING_PERCENTAGE,
      THROTTLING_DURATION,
      THROTTLING_BALANCE,
      {
        from: ownerAddress,
      }
    )
  })

  describe('Test Constructor', async () => {
    it('Test Constructor successful', async () => {
      const instance = await Locker.new(
        lockerToken.address,
        'Locker',
        'LCK',
        4,
        THROTTLING_PERCENTAGE,
        THROTTLING_DURATION,
        THROTTLING_BALANCE,
        {
          from: ownerAddress,
        }
      )
      equal((await instance.name()).toString(), 'Locker')
      equal((await instance.symbol()).toString(), 'LCK')
      equal((await instance.decimals()).toString(), '4')
      equal((await instance.totalSupply()).toString(), '0')
      equal(await instance.token(), lockerToken.address)
      equal(
        (await instance.throttlingPercentage()).toString(),
        THROTTLING_PERCENTAGE
      )
      equal(
        (await instance.throttlingDuration()).toString(),
        THROTTLING_DURATION
      )
      equal((await instance.throttlingBalance()).toString(), THROTTLING_BALANCE)
    })

    it('Test Constructor reverts', async () => {
      await reverted(
        Locker.new(
          lockerToken.address,
          'Locker',
          'LCK',
          4,
          101,
          THROTTLING_DURATION,
          THROTTLING_BALANCE,
          {
            from: ownerAddress,
          }
        ),
        'PERCENTAGE_TOO_HIGH'
      )
    })
  })

  describe('Test Locking', async () => {
    it('Test Locking reverts overflow protection', async () => {
      await reverted(
        locker.lock(ethers.constants.MaxUint256.toString()),
        'OVERFLOW_PROTECTION'
      )
    })

    it('Test Locking reverts insufficient balance', async () => {
      await reverted(locker.lock('10'), 'BALANCE_INSUFFICIENT')
    })

    it('Test successful locking', async () => {
      const mockToken_balanceOf = await mockFungibleTokenTemplate.contract.methods
        .balanceOf(ADDRESS_ZERO)
        .encodeABI()
      await lockerToken.givenMethodReturnUint(mockToken_balanceOf, '100')

      const mockToken_transferFrom = await mockFungibleTokenTemplate.contract.methods
        .transferFrom(ADDRESS_ZERO, ADDRESS_ZERO, 0)
        .encodeABI()
      await lockerToken.givenMethodReturnBool(mockToken_transferFrom, true)

      const tx = await locker.lock('50')
      emitted(tx, 'Lock', e => {
        return e.participant === ownerAddress && e.amount.toString() === '50'
      })

      const totalSupply = await locker.totalSupply()
      equal(totalSupply.toString(), '50')
    })

    it('Test successful locking for', async () => {
      const mockToken_balanceOf = await mockFungibleTokenTemplate.contract.methods
        .balanceOf(ADDRESS_ZERO)
        .encodeABI()
      await lockerToken.givenMethodReturnUint(mockToken_balanceOf, '100')

      const mockToken_transferFrom = await mockFungibleTokenTemplate.contract.methods
        .transferFrom(ADDRESS_ZERO, ADDRESS_ZERO, 0)
        .encodeABI()
      await lockerToken.givenMethodReturnBool(mockToken_transferFrom, true)

      const tx = await locker.lockFor(aliceAddress, '50')
      emitted(tx, 'Lock', e => {
        return e.participant === aliceAddress && e.amount.toString() === '50'
      })
    })
  })

  describe('Test Unlocking', async () => {
    it('Test Unlocking amount exceeds limit', async () => {
      const mockToken_balanceOf = await mockFungibleTokenTemplate.contract.methods
        .balanceOf(ADDRESS_ZERO)
        .encodeABI()
      await lockerToken.givenMethodReturnUint(mockToken_balanceOf, '10000000')

      const mockToken_transferFrom = await mockFungibleTokenTemplate.contract.methods
        .transferFrom(ADDRESS_ZERO, ADDRESS_ZERO, 0)
        .encodeABI()
      await lockerToken.givenMethodReturnBool(mockToken_transferFrom, true)

      await locker.lock('1000000')

      await reverted(
        locker.unlock(ethers.constants.MaxUint256.div(2).toString()),
        'AMOUNT_EXCEEDS_LIMIT'
      )
    })

    it('Test Unlocking succeeds', async () => {
      const mockToken_balanceOf = await mockFungibleTokenTemplate.contract.methods
        .balanceOf(ADDRESS_ZERO)
        .encodeABI()
      await lockerToken.givenMethodReturnUint(mockToken_balanceOf, '10000000')

      const mockToken_transferFrom = await mockFungibleTokenTemplate.contract.methods
        .transferFrom(ADDRESS_ZERO, ADDRESS_ZERO, 0)
        .encodeABI()
      await lockerToken.givenMethodReturnBool(mockToken_transferFrom, true)

      const mockToken_transfer = await mockFungibleTokenTemplate.contract.methods
        .transfer(ADDRESS_ZERO, 0)
        .encodeABI()
      await lockerToken.givenMethodReturnBool(mockToken_transfer, true)

      await locker.lock('1000000')

      const trx = await locker.unlock('10')

      emitted(trx, 'Unlock', e => {
        return e.participant === ownerAddress && e.amount.toString() === '10'
      })
    })
  })

  //   it('Mints some tokens for Alice and Bob', async () => {
  //     emitted(await lockerToken.mint(aliceAddress, 100000000), 'Transfer')
  //     emitted(await lockerToken.mint(bobAddress, 100000000), 'Transfer')
  //   })
  //   it('Approves tokens for Alice and Bob', async () => {
  //     emitted(
  //       await lockerToken.approve(locker.address, 100000000, {
  //         from: aliceAddress,
  //       }),
  //       'Approval'
  //     )
  //     emitted(
  //       await lockerToken.approve(locker.address, 100000000, {
  //         from: bobAddress,
  //       }),
  //       'Approval'
  //     )
  //   })
  // })

  // describe('Locking and unlocking', async () => {
  //   it('Alice locks some tokens', async () => {
  //     emitted(
  //       await locker.lock(1000000, {
  //         from: aliceAddress,
  //       }),
  //       'Lock'
  //     )
  //     equal((await locker.balanceOf(aliceAddress)).toString(), '1000000')
  //     equal((await locker.totalSupply()).toString(), '1000000')
  //   })
  //   it('Alice attempts to unlock too many tokens', async () => {
  //     await reverted(
  //       locker.unlock(100001, {
  //         from: aliceAddress,
  //       }),
  //       'AMOUNT_EXCEEDS_LIMIT'
  //     )
  //   })
  //   it('Alice attempts to unlock 10% of her tokens', async () => {
  //     emitted(
  //       await locker.unlock(100000, {
  //         from: aliceAddress,
  //       }),
  //       'Unlock'
  //     )
  //     equal((await locker.balanceOf(aliceAddress)).toString(), '900000')
  //     equal((await locker.totalSupply()).toString(), '900000')
  //   })
  //   it('Bob locks some tokens', async () => {
  //     emitted(
  //       await locker.lock(500000, {
  //         from: bobAddress,
  //       }),
  //       'Lock'
  //     )
  //     equal((await locker.balanceOf(bobAddress)).toString(), '500000')
  //     equal((await locker.totalSupply()).toString(), '1400000')
  //   })
  //   it('Bob tries to lock more than he has', async () => {
  //     await reverted(
  //       locker.lock(100000000, {
  //         from: bobAddress,
  //       }),
  //       'BALANCE_INSUFFICIENT'
  //     )
  //   })
  //   it('Alice locks some tokens for Bob', async () => {
  //     emitted(
  //       await locker.lockFor(bobAddress, 200000, {
  //         from: aliceAddress,
  //       }),
  //       'Lock'
  //     )
  //     equal((await locker.balanceOf(bobAddress)).toString(), '700000')
  //     equal((await locker.totalSupply()).toString(), '1600000')
  //   })
  //   it('Alice tries to lock more than she has for Bob', async () => {
  //     await reverted(
  //       locker.lockFor(bobAddress, 100000000, {
  //         from: aliceAddress,
  //       }),
  //       'BALANCE_INSUFFICIENT'
  //     )
  //   })
  //   it('Updates percentage, duration, and lowest', async () => {
  //     emitted(
  //       await locker.setThrottlingPercentage(100, {
  //         from: ownerAddress,
  //       }),
  //       'SetThrottlingPercentage'
  //     )
  //     emitted(
  //       await locker.setThrottlingDuration(SECONDS_IN_DAY, {
  //         from: ownerAddress,
  //       }),
  //       'SetThrottlingDuration'
  //     )
  //     emitted(
  //       await locker.setThrottlingBalance(100000000, {
  //         from: ownerAddress,
  //       }),
  //       'SetThrottlingBalance'
  //     )
  //   })
  //   it('Alice tries to unlock more than she has locked', async () => {
  //     await reverted(
  //       locker.unlock(100000000, {
  //         from: aliceAddress,
  //       }),
  //       'BALANCE_INSUFFICIENT'
  //     )
  //   })
})
