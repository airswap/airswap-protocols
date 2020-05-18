const Swap = artifacts.require('Swap')
const Types = artifacts.require('Types')
const Wrapper = artifacts.require('Wrapper')
const Delegate = artifacts.require('Delegate')
const Indexer = artifacts.require('Indexer')
const HelperMock = artifacts.require('HelperMock')
const WETH9 = artifacts.require('WETH9')
const FungibleToken = artifacts.require('FungibleToken')
const TransferHandlerRegistry = artifacts.require('TransferHandlerRegistry')
const ERC20TransferHandler = artifacts.require('ERC20TransferHandler')

const ethers = require('ethers')
const { createOrder, signOrder } = require('@airswap/utils')
const { tokenKinds } = require('@airswap/constants')
const { emptySignature } = require('@airswap/types')

const {
  emitted,
  reverted,
  equal,
  getResult,
  passes,
  ok,
} = require('@airswap/test-utils').assert
const { balances } = require('@airswap/test-utils').balances
const PROVIDER_URL = web3.currentProvider.host

let swapContract
let wrapperContract
let helperMockContract

let swapAddress
let wrapperAddress
let helperMockAddress

let wrappedSwap
let wrappedDelegate

let tokenAST
let tokenDAI
let tokenWETH

let delegate
let delegateAddress
let indexer

contract('Wrapper', async accounts => {
  const aliceAddress = accounts[0]
  const bobAddress = accounts[1]
  const carolAddress = accounts[2]
  const delegateOwner = accounts[3]

  const aliceSigner = new ethers.providers.JsonRpcProvider(
    PROVIDER_URL
  ).getSigner(aliceAddress)

  const carolSigner = new ethers.providers.JsonRpcProvider(
    PROVIDER_URL
  ).getSigner(carolAddress)

  const PROTOCOL = '0x0001'

  before('Setup', async () => {
    // link types to swap
    await Swap.link('Types', (await Types.new()).address)

    const erc20TransferHandler = await ERC20TransferHandler.new()
    const transferHandlerRegistry = await TransferHandlerRegistry.new()
    await transferHandlerRegistry.addTransferHandler(
      tokenKinds.ERC20,
      erc20TransferHandler.address
    )
    // now deploy swap
    swapContract = await Swap.new(transferHandlerRegistry.address)

    swapAddress = swapContract.address
    tokenWETH = await WETH9.new()
    wrapperContract = await Wrapper.new(swapAddress, tokenWETH.address)
    wrapperAddress = wrapperContract.address

    helperMockContract = await HelperMock.new(wrapperAddress)
    helperMockAddress = helperMockContract.address

    tokenDAI = await FungibleToken.new()
    tokenAST = await FungibleToken.new()

    indexer = await Indexer.new(tokenAST.address)
    delegate = await Delegate.new(
      swapAddress,
      indexer.address,
      delegateOwner,
      delegateOwner,
      PROTOCOL
    )
    delegateAddress = delegate.address

    wrappedSwap = wrapperContract.swap
    wrappedDelegate = wrapperContract.provideDelegateOrder
  })

  describe('Setup', async () => {
    it('Mints 1000 DAI for Alice', async () => {
      const tx = await tokenDAI.mint(aliceAddress, 1000)
      ok(await balances(aliceAddress, [[tokenDAI, 1000]]))
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
    it('Alice approves Swap to spend 1000 DAI', async () => {
      const result = await tokenDAI.approve(swapAddress, 1000, {
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

    it('Bob authorizes the Wrapper to send orders on his behalf', async () => {
      const tx = await swapContract.authorizeSender(wrapperAddress, {
        from: bobAddress,
      })
      passes(tx)
      emitted(tx, 'AuthorizeSender')
    })
  })

  describe('Test swap(): Wrap Buys', async () => {
    it('Checks that Bob take a WETH order from Alice using ETH', async () => {
      const senderAmount = 10
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
            token: tokenDAI.address,
            amount: 50,
          },
          sender: {
            wallet: bobAddress,
            token: tokenWETH.address,
            amount: 10,
          },
        }),
        aliceSigner,
        swapAddress
      )

      let result = await wrappedSwap(order, {
        from: bobAddress,
        value: senderAmount,
      })
      await passes(result)
      result = await getResult(swapContract, result.tx)
      emitted(result, 'Swap')

      ok(
        await balances(wrapperAddress, [
          [tokenDAI, 0],
          [tokenWETH, 0],
        ])
      )
      ok(await balances(aliceAddress, [[tokenWETH, 10]]))
      ok(await balances(bobAddress, [[tokenDAI, 50]]))
    })
  })

  describe('Test swap(): Unwrap Sells', async () => {
    it('Carol gets some WETH and approves on the Swap contract', async () => {
      let tx = await tokenWETH.deposit({ from: carolAddress, value: 10000 })
      passes(tx)
      emitted(tx, 'Deposit')
      tx = await tokenWETH.approve(swapAddress, 10000, { from: carolAddress })
      passes(tx)
      emitted(tx, 'Approval')
    })

    it('Alice authorizes the Wrapper to send orders on her behalf', async () => {
      const tx = await swapContract.authorizeSender(wrapperAddress, {
        from: aliceAddress,
      })
      passes(tx)
      emitted(tx, 'AuthorizeSender')
    })

    it('Alice approves the Wrapper contract to move her WETH', async () => {
      const tx = await tokenWETH.approve(wrapperAddress, 10000, {
        from: aliceAddress,
      })
      passes(tx)
      emitted(tx, 'Approval')
    })

    it('Checks that Alice receives ETH for a WETH order from Carol', async () => {
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: carolAddress,
            token: tokenWETH.address,
            amount: 10000,
          },
          sender: {
            wallet: aliceAddress,
            token: tokenDAI.address,
            amount: 100,
          },
        }),
        carolSigner,
        swapAddress
      )

      let result = await wrappedSwap(order, { from: aliceAddress })
      passes(result)
      result = await getResult(swapContract, result.tx)
      emitted(result, 'Swap')

      ok(
        await balances(wrapperAddress, [
          [tokenDAI, 0],
          [tokenWETH, 0],
        ])
      )
      ok(await balances(aliceAddress, [[tokenDAI, 850]]))
    })
  })

  describe('Test swap(): Sending ether and WETH to the WrapperContract without swap issues', async () => {
    it('Sending ether to the Wrapper Contract', async () => {
      await reverted(
        web3.eth.sendTransaction({
          to: wrapperAddress,
          from: aliceAddress,
          value: 100000,
          data: '0x0',
        }),
        'DO_NOT_SEND_ETHER'
      )

      equal(await web3.eth.getBalance(wrapperAddress), 0)
    })

    it('Sending WETH to the Wrapper Contract', async () => {
      const startingBalance = await tokenWETH.balanceOf(wrapperAddress)
      await tokenWETH.transfer(wrapperAddress, 5, { from: aliceAddress })
      ok(
        await balances(wrapperAddress, [
          [tokenWETH, startingBalance.toNumber() + 5],
        ])
      )
    })

    it('Alice approves Swap to spend 1000 DAI', async () => {
      const result = await tokenDAI.approve(swapAddress, 1000, {
        from: aliceAddress,
      })
      emitted(result, 'Approval')
    })

    it('Send order where the sender does not send the correct amount of ETH', async () => {
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
            token: tokenDAI.address,
            amount: 1,
          },
          sender: {
            wallet: bobAddress,
            token: tokenWETH.address,
            amount: 100,
          },
        }),
        aliceSigner,
        swapAddress
      )

      await reverted(
        wrappedSwap(order, {
          from: bobAddress,
          value: 200,
        }),
        'VALUE_MUST_BE_SENT'
      )
    })

    it('Send order where Bob sends Eth to Alice for DAI', async () => {
      const senderAmount = 10
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
            token: tokenDAI.address,
            amount: 50,
          },
          sender: {
            wallet: bobAddress,
            token: tokenWETH.address,
            amount: senderAmount,
          },
        }),
        aliceSigner,
        swapAddress
      )

      let result = await wrappedSwap(order, {
        from: bobAddress,
        value: senderAmount,
      })
      await passes(result)
      result = await getResult(swapContract, result.tx)
      emitted(result, 'Swap')
      equal(await web3.eth.getBalance(wrapperAddress), 0)

      // Wrapper has 5 weth from test:
      // Sending WETH to the Wrapper Contract
      ok(
        await balances(wrapperAddress, [
          [tokenDAI, 0],
          [tokenWETH, 5],
        ])
      )
    })

    it('Reverts if the unwrapped ETH is sent to a non-payable contract', async () => {
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: carolAddress,
            token: tokenWETH.address,
            amount: 100,
          },
          sender: {
            wallet: helperMockAddress,
            token: tokenDAI.address,
            amount: 100,
          },
        }),
        carolSigner,
        swapAddress
      )

      // mint the contract 100 DAI
      await tokenDAI.mint(helperMockAddress, 1000)
      ok(await balances(helperMockAddress, [[tokenDAI, 1000]]))

      // Carol gets some WETH and approves the swap contract
      let tx = await tokenWETH.deposit({ from: carolAddress, value: 10000 })
      passes(tx)
      emitted(tx, 'Deposit')
      tx = await tokenWETH.approve(swapAddress, 10000, { from: carolAddress })
      passes(tx)
      emitted(tx, 'Approval')

      // the helper contract authorizes wrapper to send orders for them
      await helperMockContract.authorizeWrapperToSend()

      // the helper contract authorizes the wrapper to move their WETH
      await helperMockContract.approveToken(
        tokenWETH.address,
        wrapperAddress,
        50000
      )

      // the helper contract approves swap to move DAI tokens
      await helperMockContract.approveToken(
        tokenDAI.address,
        swapAddress,
        50000
      )

      // Carol sends the order, via the helper and it reverts
      await reverted(helperMockContract.forwardSwap(order), 'ETH_RETURN_FAILED')
    })
  })

  describe('Test swap(): Sending nonWETH ERC20', async () => {
    it('Alice approves Swap to spend 1000 DAI', async () => {
      const result = await tokenDAI.approve(swapAddress, 1000, {
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

    it('Send order where Bob sends AST to Alice for DAI', async () => {
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
            token: tokenDAI.address,
            amount: 1,
          },
          sender: {
            wallet: bobAddress,
            token: tokenAST.address,
            amount: 100,
          },
        }),
        aliceSigner,
        swapAddress
      )

      let result = await wrappedSwap(order, {
        from: bobAddress,
        value: 0,
      })
      await passes(result)
      result = await getResult(swapContract, result.tx)
      emitted(result, 'Swap')
      equal(await web3.eth.getBalance(wrapperAddress), 0)
      ok(
        await balances(wrapperAddress, [
          [tokenAST, 0],
          [tokenDAI, 0],
          [tokenWETH, 5],
        ])
      )
    })

    it('Send order where the sender is not the sender of the order', async () => {
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
            token: tokenDAI.address,
            amount: 1,
          },
          sender: {
            wallet: bobAddress,
            token: tokenAST.address,
            amount: 100,
          },
        }),
        aliceSigner,
        swapAddress
      )

      await reverted(
        wrappedSwap(order, {
          from: carolAddress,
          value: 0,
        }),
        'MSG_SENDER_MUST_BE_ORDER_SENDER'
      )
    })

    it('Send order without WETH where ETH is incorrectly supplied', async () => {
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
            token: tokenDAI.address,
            amount: 1,
          },
          sender: {
            wallet: bobAddress,
            token: tokenAST.address,
            amount: 100,
          },
        }),
        aliceSigner,
        swapAddress
      )

      await reverted(
        wrappedSwap(order, {
          from: bobAddress,
          value: 10,
        }),
        'VALUE_MUST_BE_ZERO'
      )
    })

    it('Send order where Bob sends AST to Alice for DAI w/ authorization but without signature', async () => {
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
            token: tokenDAI.address,
            amount: 1,
          },
          sender: {
            wallet: bobAddress,
            token: tokenAST.address,
            amount: 100,
          },
        }),
        aliceSigner,
        swapAddress
      )

      order.signature.v = 0

      const result = wrappedSwap(order, {
        from: bobAddress,
        value: 0,
      })
      await reverted(result, 'SIGNATURE_MUST_BE_SENT')
    })
  })

  describe('Test provideDelegateOrder()', async () => {
    before('Setup delegate rules', async () => {
      // Delegate will trade up to 10,000 DAI for WETH, at 200 DAI/WETH
      await delegate.setRule(tokenDAI.address, tokenWETH.address, 10000, 5, 3, {
        from: delegateOwner,
      })

      // Delegate will trade up to 100 WETH for DAI, at 0.005 WETH/DAI
      await delegate.setRule(tokenWETH.address, tokenDAI.address, 100, 200, 0, {
        from: delegateOwner,
      })

      // Give the delegate owner DAI
      await tokenDAI.mint(delegateOwner, 10000)
      ok(await balances(delegateOwner, [[tokenDAI, 10000]]))

      // Give the delegate owner WETH
      await tokenWETH.deposit({ from: delegateOwner, value: 100 })
      ok(await balances(delegateOwner, [[tokenWETH, 100]]))

      // Approve the swap contracts to swap delegate's tokens
      let tx = await tokenWETH.approve(swapAddress, 100, {
        from: delegateOwner,
      })
      passes(tx)
      emitted(tx, 'Approval')
      tx = await tokenDAI.approve(swapAddress, 10000, {
        from: delegateOwner,
      })
      passes(tx)
      emitted(tx, 'Approval')
    })

    describe('Wrap Buys', async () => {
      it('Check Carol sending no ETH with order', async () => {
        const signerAmount = 1
        const order = await signOrder(
          createOrder({
            signer: {
              wallet: carolAddress,
              token: tokenWETH.address,
              amount: signerAmount,
            },
            sender: {
              wallet: delegateOwner,
              token: tokenDAI.address,
              amount: 200,
            },
          }),
          carolSigner,
          swapAddress
        )

        await reverted(
          wrappedDelegate(order, delegateAddress, {
            from: carolAddress,
            value: signerAmount + 1,
          }),
          'VALUE_MUST_BE_SENT'
        )
      })

      it('Check Carol not signing order', async () => {
        const signerAmount = 1
        const order = createOrder({
          signer: {
            wallet: carolAddress,
            token: tokenWETH.address,
            amount: signerAmount,
          },
          sender: {
            wallet: delegateOwner,
            token: tokenDAI.address,
            amount: 200,
          },
        })

        await reverted(
          wrappedDelegate(
            { ...order, signature: emptySignature },
            delegateAddress,
            {
              from: carolAddress,
              value: signerAmount,
            }
          ),
          'SIGNATURE_MUST_BE_SENT'
        )
      })

      it('Check Carol sets the wrong sender wallet', async () => {
        const signerAmount = 1
        const order = await signOrder(
          createOrder({
            signer: {
              wallet: carolAddress,
              token: tokenWETH.address,
              amount: signerAmount,
            },
            sender: {
              wallet: delegateAddress,
              token: tokenDAI.address,
              amount: 200,
            },
          }),
          carolSigner,
          swapAddress
        )

        await reverted(
          wrappedDelegate(order, delegateAddress, {
            from: carolAddress,
            value: signerAmount,
          }),
          'SENDER_WALLET_INVALID'
        )
      })

      it('Check delegate owner hasnt authorised the delegate as sender swap', async () => {
        const signerAmount = 1
        const order = await signOrder(
          createOrder({
            signer: {
              wallet: carolAddress,
              token: tokenWETH.address,
              amount: signerAmount,
            },
            sender: {
              wallet: delegateOwner,
              token: tokenDAI.address,
              amount: 200,
            },
          }),
          carolSigner,
          swapAddress
        )

        await reverted(
          wrappedDelegate(order, delegateAddress, {
            from: carolAddress,
            value: signerAmount,
          }),
          'SENDER_UNAUTHORIZED'
        )
      })

      it('Check Carol hasnt given swap approval to swap WETH', async () => {
        const signerAmount = 1
        const order = await signOrder(
          createOrder({
            signer: {
              wallet: carolAddress,
              token: tokenWETH.address,
              amount: signerAmount,
            },
            sender: {
              wallet: delegateOwner,
              token: tokenDAI.address,
              amount: 200,
            },
          }),
          carolSigner,
          swapAddress
        )

        // delegateOwner authorized the delegate to send orders
        await swapContract.authorizeSender(delegateAddress, {
          from: delegateOwner,
        })

        // carol revokes approval for swap to transfer her WETH
        await tokenWETH.approve(swapAddress, 0, {
          from: carolAddress,
        })

        await reverted(
          wrappedDelegate(order, delegateAddress, {
            from: carolAddress,
            value: signerAmount,
          })
        )
      })

      it('Check successful ETH wrap and swap through delegate contract', async () => {
        const signerAmount = 1
        const senderAmount = 200
        const order = await signOrder(
          createOrder({
            signer: {
              wallet: carolAddress,
              token: tokenWETH.address,
              amount: signerAmount,
            },
            sender: {
              wallet: delegateOwner,
              token: tokenDAI.address,
              amount: senderAmount,
            },
          }),
          carolSigner,
          swapAddress
        )

        // carol approves swap to swap WETH for her
        const tx = await tokenWETH.approve(swapAddress, 100, {
          from: carolAddress,
        })
        passes(tx)
        emitted(tx, 'Approval')

        // Carol's eth balance before
        const carolEthBefore = parseInt(await web3.eth.getBalance(carolAddress))
        // delegateOwner's DAI balance before
        const ownerDAIBefore = parseInt(await tokenDAI.balanceOf(delegateOwner))
        // delegateOwner's WETH balance before
        const ownerWETHBefore = parseInt(
          await tokenWETH.balanceOf(delegateOwner)
        )

        await passes(
          wrappedDelegate(order, delegateAddress, {
            from: aliceAddress,
            value: signerAmount,
          })
        )

        // check all balances have updated correctly
        const carolEthAfter = parseInt(await web3.eth.getBalance(carolAddress))
        const ownerDAIAfter = parseInt(await tokenDAI.balanceOf(delegateOwner))
        const ownerWETHAfter = parseInt(
          await tokenWETH.balanceOf(delegateOwner)
        )

        equal(
          carolEthBefore - parseInt(signerAmount),
          carolEthAfter,
          "Carol's ETH balance did not decrease"
        )
        equal(
          ownerDAIBefore - parseInt(senderAmount),
          ownerDAIAfter,
          "Owner's DAI balance did not decrease"
        )
        equal(
          ownerWETHBefore + parseInt(signerAmount),
          ownerWETHAfter,
          "Owner's WETH balance did not increase"
        )
      })
    })

    describe('Unwrap Sells', async () => {
      it('Check Carol sending ETH when she shouldnt', async () => {
        const signerAmount = 200
        const order = await signOrder(
          createOrder({
            signer: {
              wallet: carolAddress,
              token: tokenDAI.address,
              amount: signerAmount,
            },
            sender: {
              wallet: delegateOwner,
              token: tokenWETH.address,
              amount: 1,
            },
          }),
          carolSigner,
          swapAddress
        )

        await reverted(
          wrappedDelegate(order, delegateAddress, {
            from: carolAddress,
            value: signerAmount,
          }),
          'VALUE_MUST_BE_ZERO'
        )
      })

      it('Check Carol not signing the order', async () => {
        const order = createOrder({
          signer: {
            wallet: carolAddress,
            token: tokenDAI.address,
            amount: 200,
          },
          sender: {
            wallet: delegateOwner,
            token: tokenWETH.address,
            amount: 1,
          },
        })

        await reverted(
          wrappedDelegate(
            { ...order, signature: emptySignature },
            delegateAddress,
            {
              from: carolAddress,
            }
          ),
          'SIGNATURE_MUST_BE_SENT'
        )
      })

      it('Check Carol hasnt given swap approval to swap DAI', async () => {
        const order = await signOrder(
          createOrder({
            signer: {
              wallet: carolAddress,
              token: tokenDAI.address,
              amount: 200,
            },
            sender: {
              wallet: delegateOwner,
              token: tokenWETH.address,
              amount: 1,
            },
          }),
          carolSigner,
          swapAddress
        )

        // delegateOwner authorized the delegate to send orders
        await swapContract.authorizeSender(delegateAddress, {
          from: delegateOwner,
        })

        // carol revokes approval for swap to transfer her DAI
        await tokenDAI.approve(swapAddress, 0, {
          from: carolAddress,
        })

        await reverted(
          wrappedDelegate(order, delegateAddress, {
            from: carolAddress,
          })
        )
      })

      it('Check Carol doesnt approve wrapper to transfer weth', async () => {
        const order = await signOrder(
          createOrder({
            signer: {
              wallet: carolAddress,
              token: tokenDAI.address,
              amount: 200,
            },
            sender: {
              wallet: delegateOwner,
              token: tokenWETH.address,
              amount: 1,
            },
          }),
          carolSigner,
          swapAddress
        )

        // carol approves swap to swap DAI for her
        const tx = await tokenDAI.approve(swapAddress, 200, {
          from: carolAddress,
        })
        passes(tx)
        emitted(tx, 'Approval')

        await reverted(
          wrappedDelegate(order, delegateAddress, {
            from: aliceAddress,
          })
        )
      })

      it('Check successful ETH wrap and swap through delegate contract', async () => {
        const senderAmount = 1
        const signerAmount = 200
        const order = await signOrder(
          createOrder({
            signer: {
              wallet: carolAddress,
              token: tokenDAI.address,
              amount: signerAmount,
            },
            sender: {
              wallet: delegateOwner,
              token: tokenWETH.address,
              amount: senderAmount,
            },
          }),
          carolSigner,
          swapAddress
        )

        // carol approves wrapper to transfer WETH for her
        const tx = await tokenWETH.approve(wrapperAddress, 1, {
          from: carolAddress,
        })
        passes(tx)
        emitted(tx, 'Approval')

        // Carol's eth balance before
        const carolEthBefore = parseInt(await web3.eth.getBalance(carolAddress))
        // delegateOwner's DAI balance before
        const ownerDAIBefore = parseInt(await tokenDAI.balanceOf(delegateOwner))
        // delegateOwner's WETH balance before
        const ownerWETHBefore = parseInt(
          await tokenWETH.balanceOf(delegateOwner)
        )

        await passes(
          wrappedDelegate(order, delegateAddress, {
            from: aliceAddress,
          })
        )

        // check all balances have updated correctly
        const carolEthAfter = parseInt(await web3.eth.getBalance(carolAddress))
        const ownerDAIAfter = parseInt(await tokenDAI.balanceOf(delegateOwner))
        const ownerWETHAfter = parseInt(
          await tokenWETH.balanceOf(delegateOwner)
        )

        equal(
          carolEthBefore - parseInt(senderAmount),
          carolEthAfter,
          "Carol's ETH balance did not increase"
        )
        equal(
          ownerDAIBefore + parseInt(signerAmount),
          ownerDAIAfter,
          "Owner's DAI balance did not increase"
        )
        equal(
          ownerWETHBefore - parseInt(senderAmount),
          ownerWETHAfter,
          "Owner's WETH balance did not decrease"
        )
      })
    })
  })
})
