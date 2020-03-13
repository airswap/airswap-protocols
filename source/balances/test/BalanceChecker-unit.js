const BalanceChecker = artifacts.require('BalanceChecker')
const FungibleToken = artifacts.require('FungibleToken')
const MockContract = artifacts.require('MockContract')
const WETH9 = artifacts.require('WETH9')

const { equal, notEqual, reverted } = require('@airswap/test-utils').assert
const { takeSnapshot, revertToSnapshot } = require('@airswap/test-utils').time
const { ADDRESS_ZERO } = require('@airswap/constants')

contract('BalanceChecker Unit Tests', async accounts => {
  const owner = accounts[0]
  const mockSender = accounts[1]
  const mockSigner = accounts[2]
  const mockSpender = accounts[3]
  const BALANCE = '50000'
  const ALLOWANCE = '100000'
  const WETH_BALANCE = '7000000000000000000'
  const WETH_ALLOWANCE = '500000000000000000000'
  let balanceChecker
  let wethTemplate
  let fungibleTokenTemplate
  let mockFT
  let mockWeth
  let mock_balance
  let mock_allowance
  let mock_transfer
  let snapshotId
  let weth_balance
  let weth_approve
  let weth_allowance

  beforeEach(async () => {
    const snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapshot(snapshotId)
  })

  async function setupMockWeth() {
    mockWeth = await MockContract.new()

    wethTemplate = await WETH9.new()

    //mock the weth.approve method
    weth_approve = wethTemplate.contract.methods
      .approve(ADDRESS_ZERO, 0)
      .encodeABI()
    await mockWeth.givenMethodReturnBool(weth_approve, true)

    // mock the weth.allowance method
    weth_allowance = wethTemplate.contract.methods
      .allowance(ADDRESS_ZERO, ADDRESS_ZERO)
      .encodeABI()
    await mockWeth.givenMethodReturnUint(weth_allowance, WETH_ALLOWANCE)

    // mock the weth.balanceOf method
    weth_balance = wethTemplate.contract.methods
      .balanceOf(ADDRESS_ZERO)
      .encodeABI()
    await mockWeth.givenMethodReturnUint(weth_balance, WETH_BALANCE)
  }

  async function setupMockFungibleToken() {
    mockFT = await MockContract.new()
    fungibleTokenTemplate = await FungibleToken.new()

    mock_transfer = fungibleTokenTemplate.contract.methods
      .transfer(ADDRESS_ZERO, 0)
      .encodeABI()
    await mockFT.givenMethodReturnBool(mock_transfer, true)

    mock_balance = fungibleTokenTemplate.contract.methods
      .balanceOf(ADDRESS_ZERO)
      .encodeABI()
    await mockFT.givenMethodReturnUint(mock_balance, BALANCE)

    // mock the weth.allowance method
    mock_allowance = fungibleTokenTemplate.contract.methods
      .allowance(ADDRESS_ZERO, ADDRESS_ZERO)
      .encodeABI()
    await mockFT.givenMethodReturnUint(mock_allowance, ALLOWANCE)
  }

  before('deploy BalanceChecker', async () => {
    await setupMockWeth()
    await setupMockFungibleToken()
    balanceChecker = await BalanceChecker.new()
  })

  describe('Test initial values', async () => {
    it('Test initial owner', async () => {
      equal(await balanceChecker.owner.call(), owner, 'owner is incorrect')
    })

    it('Test fallback function revert', async () => {
      await reverted(
        web3.eth.sendTransaction({
          from: owner,
          to: balanceChecker.address,
          value: 1,
        })
      )
    })
  })

  describe('Test walletBalances', async () => {
    it('Test wallet balance', async () => {
      const balances = await balanceChecker.walletBalances.call(mockSender, [
        mockFT.address,
        mockFT.address,
        ADDRESS_ZERO,
      ])
      equal(balances.length, 3, 'balances array length is incorrect')
      equal(balances[0].toNumber(), BALANCE, 'balance is incorrect')
      equal(balances[1].toNumber(), BALANCE, 'balance is incorrect')
      notEqual(balances[2].toString(), '0', 'balance is incorrect')
    })

    it('Test with empty token array', async () => {
      await reverted(balanceChecker.walletBalances.call(mockSender, []))
    })

    it('Test with non-contract token array', async () => {
      const balances = await balanceChecker.walletBalances.call(mockSender, [
        mockSigner,
      ])
      equal(balances[0], 0, 'balances array is empty')
    })

    it('Test with non token contract array', async () => {
      const balances = await balanceChecker.walletBalances.call(mockSender, [
        balanceChecker.address,
      ])
      equal(balances[0], 0, 'balances array is empty')
    })
  })

  describe('Test walletAllowances', async () => {
    it('Test wallet allowance', async () => {
      const allowances = await balanceChecker.walletAllowances.call(
        mockSender,
        mockSpender,
        [mockFT.address, mockFT.address]
      )
      equal(allowances.length, 2, 'allowances array length is incorrect')
      equal(allowances[0], ALLOWANCE, 'allowance is incorrect')
      equal(allowances[1], ALLOWANCE, 'allowance is incorrect')
    })

    it('Test with empty token array', async () => {
      await reverted(
        balanceChecker.walletAllowances.call(mockSender, mockSpender, [])
      )
    })

    it('Test with non-contract token array', async () => {
      const allowances = await balanceChecker.walletAllowances.call(
        mockSender,
        mockSpender,
        [mockSigner]
      )
      equal(allowances[0], 0, 'allowances array is empty')
    })

    it('Test with non token contract array', async () => {
      const allowances = await balanceChecker.walletAllowances.call(
        mockSender,
        mockSpender,
        [balanceChecker.address]
      )
      equal(allowances[0], 0, 'allowances array is empty')
    })
  })

  describe('Test allAllowancesForManyAccounts', async () => {
    it('Test multiple allowances', async () => {
      const allowances = await balanceChecker.allAllowancesForManyAccounts.call(
        [mockSender, mockSender, mockSender],
        mockSpender,
        [mockFT.address, mockWeth.address]
      )
      equal(allowances.length, 6, 'allowance array length is incorrect')
      equal(allowances[0], ALLOWANCE, 'allowance is incorrect')
      equal(allowances[1], WETH_ALLOWANCE, 'weth allowance is incorrect')
      equal(allowances[2], ALLOWANCE, 'allowance is incorrect')
      equal(allowances[3], WETH_ALLOWANCE, 'weth allowance is incorrect')
      equal(allowances[4], ALLOWANCE, 'allowance is incorrect')
      equal(allowances[5], WETH_ALLOWANCE, 'weth allowance is incorrect')
    })

    it('Test with empty sender and empty token array', async () => {
      const allowances = await balanceChecker.allAllowancesForManyAccounts.call(
        [],
        mockSpender,
        []
      )
      equal(allowances.length, 0, 'allowances should be empty')
    })
  })

  describe('Test allBalancesForManyAccounts', async () => {
    it('Test multiple balances', async () => {
      const balances = await balanceChecker.allBalancesForManyAccounts.call(
        [mockSender, mockSender, mockSender],
        [mockFT.address, mockWeth.address, ADDRESS_ZERO]
      )
      equal(balances.length, 9, 'balance array length is incorrect')
      equal(balances[0], BALANCE, 'balance is incorrect')
      equal(balances[1], WETH_BALANCE, 'weth balance is incorrect')
      notEqual(balances[2].toString(), '0', 'balance is incorrect')
      equal(balances[3], BALANCE, 'weth balance is incorrect')
      equal(balances[4], WETH_BALANCE, 'weth balance is incorrect')
      notEqual(balances[5], '0', 'balance is incorrect')
      equal(balances[6], BALANCE, 'weth balance is incorrect')
      equal(balances[7], WETH_BALANCE, 'balance is incorrect')
      notEqual(balances[8], '0', 'weth balance is incorrect')
    })

    it('Test with empty sender and token array', async () => {
      const balances = await balanceChecker.allBalancesForManyAccounts.call(
        [],
        []
      )
      equal(balances.length, 0, 'balances should be empty')
    })
  })
})
