const Swap = artifacts.require('Swap')
const Types = artifacts.require('Types')
const Indexer = artifacts.require('Indexer')
const Delegate = artifacts.require('Delegate')
const Validator = artifacts.require('Validator')
const TransferHandlerRegistry = artifacts.require('TransferHandlerRegistry')
const ERC20TransferHandler = artifacts.require('ERC20TransferHandler')
const FungibleToken = artifacts.require('FungibleToken')
const Wrapper = artifacts.require('Wrapper')
const WETH9 = artifacts.require('WETH9')

const ethers = require('ethers')
const { tokenKinds } = require('@airswap/constants')
const { createOrder, signOrder } = require('@airswap/utils')
const {
  emitted,
  equal,
  getResult,
  ok,
  passes,
} = require('@airswap/test-utils').assert
const { allowances, balances } = require('@airswap/test-utils').balances
const PROVIDER_URL = web3.currentProvider.host

contract('DelegateValidator', async accounts => {
  const aliceAddress = accounts[0]
  const bobAddress = accounts[1]
  const aliceTradeWallet = accounts[4]
  const aliceSigner = new ethers.providers.JsonRpcProvider(
    PROVIDER_URL
  ).getSigner(aliceAddress)
  const bobSigner = new ethers.providers.JsonRpcProvider(
    PROVIDER_URL
  ).getSigner(bobAddress)
  const PROTOCOL = '0x0002'
  const UNKNOWN_KIND = '0x72bf82a0'
  let validator
  let aliceDelegate
  let bobDelegate
  let swapContract
  let swapAddress
  let wrapperAddress
  let wrapperContract

  let indexer

  let tokenAST
  let tokenDAI
  let tokenWETH
  let typesLib
  let errorCodes

  describe('Deploying...', async () => {
    it('Deployed Swap contract', async () => {
      typesLib = await Types.new()
      await Swap.link('Types', typesLib.address)

      const erc20TransferHandler = await ERC20TransferHandler.new()
      const transferHandlerRegistry = await TransferHandlerRegistry.new()
      await transferHandlerRegistry.addTransferHandler(
        tokenKinds.ERC20,
        erc20TransferHandler.address
      )

      // now deploy swap
      swapContract = await Swap.new(transferHandlerRegistry.address)
      swapAddress = swapContract.address
    })

    it('Deployed test contract "WETH"', async () => {
      tokenWETH = await WETH9.new()
    })

    it('Deployed Validator contract', async () => {
      await Validator.link('Types', typesLib.address)
      validator = await Validator.new(tokenWETH.address)
    })

    it('Deployed test contract "AST"', async () => {
      tokenAST = await FungibleToken.new()
    })

    it('Deployed test contract "DAI"', async () => {
      tokenDAI = await FungibleToken.new()
    })

    it('Deployed Indexer token with AST as staking and AST/DAI and AST/WETH index created', async () => {
      indexer = await Indexer.new(tokenAST.address)
      await indexer.createIndex(tokenAST.address, tokenDAI.address, PROTOCOL)
      await indexer.createIndex(tokenAST.address, tokenWETH.address, PROTOCOL)
    })

    it('Deployed Delegate for Alice address AST indexer', async () => {
      aliceDelegate = await Delegate.new(
        swapAddress,
        indexer.address,
        aliceAddress,
        aliceTradeWallet,
        PROTOCOL
      )
    })

    it('Deployed Delegate for Bob address AST indexer', async () => {
      bobDelegate = await Delegate.new(
        swapAddress,
        indexer.address,
        bobAddress,
        bobAddress,
        PROTOCOL
      )
    })

    it('Deployed Wrapper contract', async () => {
      wrapperContract = await Wrapper.new(swapAddress, tokenWETH.address)
      wrapperAddress = wrapperContract.address
    })
  })
  describe('Minting...', async () => {
    it('Mints 1000 AST for Alice Trade Wallet', async () => {
      emitted(await tokenAST.mint(aliceTradeWallet, 1000), 'Transfer')
      ok(
        await balances(aliceTradeWallet, [
          [tokenAST, 1000],
          [tokenDAI, 0],
        ]),
        'Alice balances are incorrect'
      )
    })

    it('Mints 1000 DAI for Bob', async () => {
      emitted(await tokenDAI.mint(bobAddress, 1000), 'Transfer')
      ok(
        await balances(bobAddress, [
          [tokenAST, 0],
          [tokenDAI, 1000],
        ]),
        'Bob balances are incorrect'
      )
    })
  })

  describe('Approving...', async () => {
    it('Checks approvals (Alice 400 AST and 0 DAI, Bob 0 AST and 1000 DAI)', async () => {
      emitted(
        await tokenAST.approve(swapAddress, 400, { from: aliceTradeWallet }),
        'Approval'
      )
      emitted(
        await tokenDAI.approve(swapAddress, 1000, { from: bobAddress }),
        'Approval'
      )
      ok(
        await allowances(aliceTradeWallet, swapAddress, [
          [tokenAST, 400],
          [tokenDAI, 0],
        ])
      )
      ok(
        await allowances(bobAddress, swapAddress, [
          [tokenAST, 0],
          [tokenDAI, 1000],
        ])
      )
    })
  })

  describe('Delegate Swaps interacting with Alice Delegate', async () => {
    let order

    before(
      'Bob creates and signs an order for Alice (200 AST for 50 DAI)',
      async () => {
        order = await signOrder(
          createOrder({
            sender: {
              wallet: aliceTradeWallet,
              token: tokenAST.address,
              amount: 200,
            },
            signer: {
              wallet: bobAddress,
              token: tokenDAI.address,
              amount: 50,
            },
          }),
          bobSigner,
          swapAddress
        )
      }
    )

    it('Checks fillable swap order to delegate without a rule', async () => {
      const checkerOutput = await validator.checkDelegate.call(
        order,
        aliceDelegate.address,
        {
          from: bobAddress,
        }
      )
      equal(checkerOutput[0], 4)
      equal(web3.utils.toUtf8(checkerOutput[1][0]), 'TOKEN_PAIR_INACTIVE')
      equal(web3.utils.toUtf8(checkerOutput[1][1]), 'ORDER_AMOUNT_EXCEEDS_MAX')
      equal(web3.utils.toUtf8(checkerOutput[1][2]), 'DELEGATE_UNABLE_TO_PRICE')
      equal(web3.utils.toUtf8(checkerOutput[1][3]), 'SENDER_UNAUTHORIZED')
      equal(checkerOutput[0], 4)
    })

    it('Checks maximum delegate error generation for swap delegate', async () => {
      const selfOrder = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
            token: tokenAST.address,
            amount: 200,
            kind: UNKNOWN_KIND,
          },
          sender: {
            wallet: bobAddress,
            token: tokenAST.address,
            amount: 50,
            kind: UNKNOWN_KIND,
          },
        }),
        bobSigner,
        swapAddress
      )

      selfOrder.signature.v = 0

      errorCodes = await validator.checkDelegate.call(
        selfOrder,
        aliceDelegate.address,
        {
          from: bobAddress,
        }
      )
      equal(errorCodes[0].toNumber(), 11)
      equal(web3.utils.toUtf8(errorCodes[1][0]), 'SIGNER_UNAUTHORIZED')
      equal(web3.utils.toUtf8(errorCodes[1][1]), 'SENDER_TOKEN_KIND_UNKNOWN')
      equal(web3.utils.toUtf8(errorCodes[1][2]), 'SIGNER_TOKEN_KIND_UNKNOWN')
      equal(web3.utils.toUtf8(errorCodes[1][3]), 'SIGNATURE_MUST_BE_SENT')
      equal(web3.utils.toUtf8(errorCodes[1][4]), 'SENDER_WALLET_INVALID')
      equal(web3.utils.toUtf8(errorCodes[1][5]), 'SIGNER_KIND_MUST_BE_ERC20')
      equal(web3.utils.toUtf8(errorCodes[1][6]), 'SENDER_KIND_MUST_BE_ERC20')
      equal(web3.utils.toUtf8(errorCodes[1][7]), 'TOKEN_PAIR_INACTIVE')
      equal(web3.utils.toUtf8(errorCodes[1][8]), 'ORDER_AMOUNT_EXCEEDS_MAX')
      equal(web3.utils.toUtf8(errorCodes[1][9]), 'DELEGATE_UNABLE_TO_PRICE')
      equal(web3.utils.toUtf8(errorCodes[1][10]), 'SENDER_UNAUTHORIZED')
    })

    it('Create a rule and ensure appropriate approvals gets zero error codes', async () => {
      const order = await signOrder(
        createOrder({
          sender: {
            wallet: aliceTradeWallet,
            token: tokenAST.address,
            amount: 200,
          },
          signer: {
            wallet: bobAddress,
            token: tokenDAI.address,
            amount: 50,
          },
        }),
        bobSigner,
        swapAddress
      )

      // create a rule for AST/DAI for Alice delegate by Alice
      await aliceDelegate.setRule(
        tokenAST.address,
        tokenDAI.address,
        1000,
        25,
        2,
        { from: aliceAddress }
      )

      // Alice's trade wallet authorizes aliceDelegate swap to send orders
      // on its behalf to Swap
      await swapContract.authorizeSender(aliceDelegate.address, {
        from: aliceTradeWallet,
      })

      errorCodes = await validator.checkDelegate.call(
        order,
        aliceDelegate.address,
        {
          from: bobAddress,
        }
      )
      equal(errorCodes[0], 0)
      // ensure that the order then succeeds
      emitted(
        await aliceDelegate.provideOrder(order, { from: bobAddress }),
        'ProvideOrder'
      )
    })

    it('Create a rule and ensure appropriate approvals but put in an invalid price', async () => {
      const order = await signOrder(
        createOrder({
          sender: {
            wallet: aliceTradeWallet,
            token: tokenAST.address,
            amount: 200,
          },
          signer: {
            wallet: bobAddress,
            token: tokenDAI.address,
            amount: 5000,
          },
        }),
        bobSigner,
        swapAddress
      )

      // Alice's trade wallet authorizes aliceDelegate swap to send orders
      // on its behalf to Swap
      await swapContract.authorizeSender(aliceDelegate.address, {
        from: aliceTradeWallet,
      })

      errorCodes = await validator.checkDelegate.call(
        order,
        aliceDelegate.address,
        {
          from: bobAddress,
        }
      )
      equal(errorCodes[0], 3)
      equal(web3.utils.toUtf8(errorCodes[1][0]), 'SIGNER_BALANCE_LOW')
      equal(web3.utils.toUtf8(errorCodes[1][1]), 'SIGNER_ALLOWANCE_LOW')
      equal(web3.utils.toUtf8(errorCodes[1][2]), 'DELEGATE_UNABLE_TO_PRICE')
    })
  })

  describe('Bob interacting with Alice Delegate through a Wrapper contract', async () => {
    it('Checks wrapper specific errors for swap delegate', async () => {
      const order = await signOrder(
        createOrder({
          sender: {
            wallet: aliceTradeWallet,
            token: tokenWETH.address,
            amount: 200,
            kind: tokenKinds.ERC20,
          },
          signer: {
            wallet: bobAddress,
            token: tokenWETH.address,
            amount: '200000000000000000000',
            kind: tokenKinds.ERC20,
          },
        }),
        aliceSigner,
        swapAddress
      )

      order.signature.v = 0

      errorCodes = await validator.checkWrappedDelegate.call(
        order,
        aliceDelegate.address,
        wrapperAddress,
        {
          from: bobAddress,
        }
      )
      equal(errorCodes[0].toNumber(), 10)
      equal(web3.utils.toUtf8(errorCodes[1][0]), 'SIGNER_UNAUTHORIZED')
      equal(web3.utils.toUtf8(errorCodes[1][1]), 'SIGNATURE_MUST_BE_SENT')
      equal(web3.utils.toUtf8(errorCodes[1][2]), 'TOKEN_PAIR_INACTIVE')
      equal(web3.utils.toUtf8(errorCodes[1][3]), 'ORDER_AMOUNT_EXCEEDS_MAX')
      equal(web3.utils.toUtf8(errorCodes[1][4]), 'DELEGATE_UNABLE_TO_PRICE')
      equal(web3.utils.toUtf8(errorCodes[1][5]), 'SENDER_BALANCE_LOW')
      equal(web3.utils.toUtf8(errorCodes[1][6]), 'SENDER_ALLOWANCE_LOW')
      equal(web3.utils.toUtf8(errorCodes[1][7]), 'SIGNER_ETHER_LOW')
      equal(web3.utils.toUtf8(errorCodes[1][8]), 'SIGNER_ALLOWANCE_LOW')
      equal(web3.utils.toUtf8(errorCodes[1][9]), 'SIGNER_WRAPPER_ALLOWANCE_LOW')
    })

    it('Create a rule and ensure appropriate approvals gets zero error codes', async () => {
      const order = await signOrder(
        createOrder({
          sender: {
            wallet: aliceTradeWallet,
            token: tokenAST.address,
            amount: 200,
          },
          signer: {
            wallet: bobAddress,
            token: tokenWETH.address,
            amount: 50,
          },
        }),
        bobSigner,
        swapAddress
      )

      // create a rule for AST/DAI for Alice delegate by Alice
      await aliceDelegate.setRule(
        tokenAST.address,
        tokenWETH.address,
        1000,
        25,
        2,
        { from: aliceAddress }
      )

      // Alice's trade wallet authorizes aliceDelegate swap to send orders
      // on its behalf to Swap
      await swapContract.authorizeSender(aliceDelegate.address, {
        from: aliceTradeWallet,
      })

      // Bob approves Swap to transfer WETH
      await tokenWETH.approve(swapAddress, 50, {
        from: bobAddress,
      })

      errorCodes = await validator.checkWrappedDelegate.call(
        order,
        aliceDelegate.address,
        wrapperAddress,
        {
          from: bobAddress,
        }
      )
      equal(errorCodes[0], 0)

      let result = await wrapperContract.provideDelegateOrder(
        order,
        aliceDelegate.address,
        { from: bobAddress, value: 50 }
      )
      passes(result)
      result = await getResult(aliceDelegate, result.tx)
      emitted(result, 'ProvideOrder')
    })

    it('Checks inserting unknown kind outputs error', async () => {
      const order = await signOrder(
        createOrder({
          sender: {
            wallet: aliceTradeWallet,
            token: tokenAST.address,
            amount: 50,
            kind: UNKNOWN_KIND,
          },
          signer: {
            wallet: bobAddress,
            token: tokenWETH.address,
            amount: 10,
            kind: UNKNOWN_KIND,
          },
        }),
        bobSigner,
        swapAddress
      )

      await swapContract.authorizeSender(aliceDelegate.address, {
        from: aliceTradeWallet,
      })

      const errorCodes = await validator.checkWrappedDelegate.call(
        order,
        aliceDelegate.address,
        wrapperAddress,
        { from: bobAddress }
      )
      equal(errorCodes[0], 3)
      equal(web3.utils.toUtf8(errorCodes[1][0]), 'SIGNER_KIND_MUST_BE_ERC20')
      equal(web3.utils.toUtf8(errorCodes[1][1]), 'SENDER_KIND_MUST_BE_ERC20')
      equal(web3.utils.toUtf8(errorCodes[1][2]), 'PRICE_INVALID')
    })

    it('Checks malformed order errors out', async () => {
      const order = await signOrder(
        createOrder({
          sender: {
            wallet: aliceTradeWallet,
            token: tokenAST.address,
            amount: 200,
            kind: tokenKinds.ERC721,
          },
          signer: {
            wallet: bobAddress,
            token: tokenWETH.address,
            amount: 50,
            kind: tokenKinds.ERC721,
          },
        }),
        bobSigner,
        swapAddress
      )

      errorCodes = await validator.checkWrappedDelegate.call(
        order,
        aliceDelegate.address,
        wrapperAddress,
        {
          from: bobAddress,
        }
      )
      equal(errorCodes[0], 4)
      equal(web3.utils.toUtf8(errorCodes[1][0]), 'SENDER_INVALID_AMOUNT')
      equal(web3.utils.toUtf8(errorCodes[1][1]), 'SIGNER_INVALID_AMOUNT')
      equal(web3.utils.toUtf8(errorCodes[1][2]), 'SIGNER_KIND_MUST_BE_ERC20')
      equal(web3.utils.toUtf8(errorCodes[1][3]), 'SENDER_KIND_MUST_BE_ERC20')
    })
  })

  describe('Alice interacting with Bob WETH Delegate through a Wrapper contract', async () => {
    it('Checks balance issues for weth delegate', async () => {
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
            token: tokenAST.address,
            amount: 200,
            kind: tokenKinds.ERC20,
          },
          sender: {
            wallet: bobAddress,
            token: tokenWETH.address,
            amount: 2000,
            kind: tokenKinds.ERC20,
          },
        }),
        aliceSigner,
        swapAddress
      )

      // create a rule for AST/DAI for Alice delegate by Alice
      await bobDelegate.setRule(
        tokenWETH.address,
        tokenAST.address,
        1000,
        25,
        2,
        { from: bobAddress }
      )

      // Alice's trade wallet authorizes aliceDelegate swap to send orders
      // on its behalf to Swap
      await swapContract.authorizeSender(bobDelegate.address, {
        from: bobAddress,
      })

      // Bob approves Swap to transfer WETH
      await tokenWETH.approve(swapAddress, 50, {
        from: bobAddress,
      })

      // Alice approves Swap to transfer WETH
      await tokenWETH.approve(wrapperAddress, 2000, {
        from: aliceAddress,
      })

      errorCodes = await validator.checkWrappedDelegate.call(
        order,
        bobDelegate.address,
        wrapperAddress,
        {
          from: aliceAddress,
        }
      )
      equal(errorCodes[0].toNumber(), 6)
      equal(web3.utils.toUtf8(errorCodes[1][0]), 'ORDER_AMOUNT_EXCEEDS_MAX')
      equal(web3.utils.toUtf8(errorCodes[1][1]), 'PRICE_INVALID')
      equal(web3.utils.toUtf8(errorCodes[1][2]), 'SENDER_BALANCE_LOW')
      equal(web3.utils.toUtf8(errorCodes[1][3]), 'SENDER_ALLOWANCE_LOW')
      equal(web3.utils.toUtf8(errorCodes[1][4]), 'SIGNER_BALANCE_LOW')
      equal(web3.utils.toUtf8(errorCodes[1][5]), 'SIGNER_ALLOWANCE_LOW')
    })

    it('Checks balance issues for weth delegate', async () => {
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
            token: tokenAST.address,
            amount: 20,
            kind: tokenKinds.ERC20,
          },
          sender: {
            wallet: bobAddress,
            token: tokenWETH.address,
            amount: 20,
            kind: tokenKinds.ERC20,
          },
        }),
        aliceSigner,
        swapAddress
      )

      // create a rule for AST/DAI for Alice delegate by Alice
      await bobDelegate.setRule(
        tokenWETH.address,
        tokenAST.address,
        1000,
        25,
        2,
        { from: bobAddress }
      )

      // mint 20 AST for signer (Alice)
      emitted(await tokenAST.mint(aliceAddress, 20), 'Transfer')

      // Alice's trade wallet authorizes aliceDelegate swap to send orders
      // on its behalf to Swap
      await swapContract.authorizeSender(bobDelegate.address, {
        from: bobAddress,
      })

      // Alice approves Swap to transfer AST
      await tokenAST.approve(swapAddress, 20, {
        from: aliceAddress,
      })

      // Bob approves Swap to transfer WETH
      await tokenWETH.approve(swapAddress, 50, {
        from: bobAddress,
      })

      await tokenWETH.deposit({ from: bobAddress, value: 50 })

      // Alice approves Swap to transfer WETH
      await tokenWETH.approve(wrapperAddress, 50, {
        from: aliceAddress,
      })

      errorCodes = await validator.checkWrappedDelegate.call(
        order,
        bobDelegate.address,
        wrapperAddress,
        {
          from: aliceAddress,
        }
      )
      equal(errorCodes[0].toNumber(), 0)
    })
  })
})
