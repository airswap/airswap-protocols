const Swap = artifacts.require('Swap')
const Types = artifacts.require('Types')
const BalanceChecker = artifacts.require('BalanceChecker')
const WETH9 = artifacts.require('WETH9')
const FungibleToken = artifacts.require('FungibleToken')
const TransferHandlerRegistry = artifacts.require('TransferHandlerRegistry')
const { ADDRESS_ZERO } = require('@airswap/constants')

const { emitted, reverted, passes, ok } = require('@airswap/test-utils').assert
const { balances } = require('@airswap/test-utils').balances

contract('Balance Checker', async accounts => {
  const owner = accounts[0]
  const aliceAddress = accounts[1]
  const bobAddress = accounts[2]
  let balanceCheckerContract
  let balanceCheckerAddress

  let swapContract
  let swapAddress

  let tokenAST
  let tokenWETH

  before('Setup', async () => {
    await Swap.link('Types', (await Types.new()).address)

    const transferHandlerRegistry = await TransferHandlerRegistry.new()
    // now deploy swap
    swapContract = await Swap.new(transferHandlerRegistry.address)
    swapAddress = swapContract.address

    // deploy balance checker contract
    balanceCheckerContract = await BalanceChecker.new()

    balanceCheckerAddress = balanceCheckerContract.address
    tokenWETH = await WETH9.new()
    tokenAST = await FungibleToken.new()
  })

  describe('Setup', async () => {
    it('Mints 50 AST for Alice', async () => {
      const tx = await tokenAST.mint(aliceAddress, 50)
      ok(await balances(aliceAddress, [[tokenAST, 50]]))
      emitted(tx, 'Transfer')
      passes(tx)
    })

    it('Mints 1000 AST for Bob', async () => {
      const tx = await tokenAST.mint(bobAddress, 1000)
      ok(await balances(bobAddress, [[tokenAST, 1000]]))
      emitted(tx, 'Transfer')
      passes(tx)
    })
  })

  describe('Approving...', async () => {
    it('Alice approves Swap to spend 50 AST', async () => {
      const result = await tokenAST.approve(swapAddress, 100, {
        from: aliceAddress,
      })
      emitted(result, 'Approval')
    })

    it('Bob approves Swap to spend 1000 AST', async () => {
      const result = await tokenAST.approve(swapAddress, 1000, {
        from: bobAddress,
      })
      emitted(result, 'Approval')
    })

    it('Bob approves Swap to spend 1000 WETH', async () => {
      const result = await tokenWETH.approve(swapAddress, 1000, {
        from: bobAddress,
      })
      emitted(result, 'Approval')
    })
  })

  describe('Transfer 50 AST to BalanceChecker...', async () => {
    it('Alice transfers 50 AST to balance checker', async () => {
      const result = await tokenAST.transfer(balanceCheckerAddress, 50, {
        from: aliceAddress,
      })
      emitted(result, 'Transfer')
    })

    it('Owner tries to withdraw from address(0x0) from BalanceChecker', async () => {
      await reverted(
        balanceCheckerContract.withdrawToken(ADDRESS_ZERO, 50, {
          from: owner,
        })
      )
    })

    it('Owner withdraws the tokens from BalanceChecker', async () => {
      await balanceCheckerContract.withdrawToken(tokenAST.address, 50, {
        from: owner,
      })
    })

    it('Owner now has 50 AST tokens in wallet', async () => {
      ok(await balances(owner, [[tokenAST, 50]]))
      ok(await balances(balanceCheckerAddress, [[tokenAST, 0]]))
    })
  })

  describe('Withdraw ETH from BalanceChecker...', async () => {
    it('Non-Owner calls withdraw on BalanceChecker', async () => {
      await reverted(
        balanceCheckerContract.withdraw({
          from: aliceAddress,
        })
      )
    })

    it('Owner calls withdraw on BalanceChecker', async () => {
      const result = await balanceCheckerContract.withdraw({
        from: owner,
      })

      passes(result)
    })
  })

  describe('Owner can perform destruct BalanceChecker...', async () => {
    it('Non-Owner calls destruct on BalanceChecker', async () => {
      await reverted(
        balanceCheckerContract.destruct(owner, {
          from: aliceAddress,
        })
      )
    })

    it('Owner calls destruct on BalanceChecker', async () => {
      const result = await balanceCheckerContract.destruct(owner, {
        from: owner,
      })
      passes(result)
    })
  })
})
