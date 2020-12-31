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

      const userBal = await locker.balanceOf(ownerAddress)
      equal(userBal.toString(), '50')
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

      const userBal = await locker.balanceOf(aliceAddress)
      equal(userBal.toString(), '50')
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

    it('Test Unlocking amount exceeds balance', async () => {
      const mockToken_balanceOf = await mockFungibleTokenTemplate.contract.methods
        .balanceOf(ADDRESS_ZERO)
        .encodeABI()
      await lockerToken.givenMethodReturnUint(mockToken_balanceOf, '10000000')

      const mockToken_transferFrom = await mockFungibleTokenTemplate.contract.methods
        .transferFrom(ADDRESS_ZERO, ADDRESS_ZERO, 0)
        .encodeABI()
      await lockerToken.givenMethodReturnBool(mockToken_transferFrom, true)

      await locker.lock('10')

      await reverted(locker.unlock('20'), 'SafeMath: subtraction overflow')
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

      const totalSupply = await locker.totalSupply()
      equal(totalSupply.toString(), '999990')

      const userBal = await locker.balanceOf(ownerAddress)
      equal(userBal.toString(), '999990')
    })
  })

  describe('Test set throttling percentage', async () => {
    it('Test set throttling percentage reverts', async () => {
      await reverted(
        locker.setThrottlingPercentage(ethers.constants.MaxUint256),
        'PERCENTAGE_TOO_HIGH'
      )
    })

    it('Test set throttling percentage success', async () => {
      const trx = await locker.setThrottlingPercentage('5')
      emitted(trx, 'SetThrottlingPercentage', e => {
        return e.throttlingPercentage.toString() === '5'
      })
      const throttlePercentage = await locker.throttlingPercentage()
      equal(throttlePercentage.toString(), '5')
    })
  })

  describe('Test set throttling balance', async () => {
    it('Test set throttling balance', async () => {
      const trx = await locker.setThrottlingBalance('5')
      emitted(trx, 'SetThrottlingBalance', e => {
        return e.throttlingBalance.toString() === '5'
      })
      const bal = await locker.throttlingBalance()
      equal(bal.toString(), '5')
    })
  })

  describe('Test set throttling duration', async () => {
    it('Test set throttling duration', async () => {
      const trx = await locker.setThrottlingDuration('5')
      emitted(trx, 'SetThrottlingDuration', e => {
        return e.throttlingDuration.toString() === '5'
      })
      const bal = await locker.throttlingDuration()
      equal(bal.toString(), '5')
    })
  })
})
