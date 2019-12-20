const Swap = artifacts.require('Swap')
const Types = artifacts.require('Types')
const FungibleToken = artifacts.require('FungibleToken')
const NonFungibleToken = artifacts.require('NonFungibleToken')
const OMGToken = artifacts.require('OMGToken')
const TransferHandlerRegistry = artifacts.require('TransferHandlerRegistry')
const KittyCoreTransferHandler = artifacts.require('KittyCoreTransferHandler')
const MintableERC1155Token = artifacts.require('MintableERC1155Token')
const ERC20TransferHandler = artifacts.require('ERC20TransferHandler')
const ERC721TransferHandler = artifacts.require('ERC721TransferHandler')
const ERC1155TransferHandler = artifacts.require('ERC1155TransferHandler')
const { emitted, reverted, ok, equal } = require('@airswap/test-utils').assert
const { allowances, balances } = require('@airswap/test-utils').balances
const { orders, signatures } = require('@airswap/order-utils')
const {
  ERC20_INTERFACE_ID,
  ERC721_INTERFACE_ID,
  ERC1155_INTERFACE_ID,
  GANACHE_PROVIDER,
  EMPTY_ADDRESS,
} = require('@airswap/order-utils').constants

contract('TransferHandlerRegistry', async accounts => {
  const aliceAddress = accounts[0]
  const bobAddress = accounts[1]
  const carolAddress = accounts[2]
  const CKITTY_KIND = '0x9a20483d'
  const UNKNOWN_KIND = '0xffffffff'
  let swapContract
  let swapAddress
  let tokenAST
  let tokenDAI
  let tokenOMG
  let tokenTicket
  let tokenKitty
  let tokenERC1155

  let transferHandlerRegistry

  let swap

  describe('Deploying...', async () => {
    it('Deployed Swap contract', async () => {
      transferHandlerRegistry = await TransferHandlerRegistry.new()
      const typesLib = await Types.new()
      await Swap.link('Types', typesLib.address)
      swapContract = await Swap.new(transferHandlerRegistry.address)
      swapAddress = swapContract.address

      swap = swapContract.swap

      orders.setVerifyingContract(swapAddress)
    })

    it('Deployed test contract "AST"', async () => {
      tokenAST = await FungibleToken.new()
    })

    it('Deployed test contract "DAI"', async () => {
      tokenDAI = await FungibleToken.new()
    })

    it('Deployed test contract "OMG"', async () => {
      tokenOMG = await OMGToken.new()
    })

    it('Deployed test contract "MintableERC1155Token"', async () => {
      tokenERC1155 = await MintableERC1155Token.new()
    })

    it('Set up TokenRegistry', async () => {
      const kittyCore = await KittyCoreTransferHandler.new()
      const erc20TransferHandler = await ERC20TransferHandler.new()
      const erc721TransferHandler = await ERC721TransferHandler.new()
      const erc1155TransferHandler = await ERC1155TransferHandler.new()

      // add all 4 of these contracts into the TokenRegistry
      await transferHandlerRegistry.addTransferHandler(
        CKITTY_KIND,
        kittyCore.address
      )
      await transferHandlerRegistry.addTransferHandler(
        ERC20_INTERFACE_ID,
        erc20TransferHandler.address
      )
      await transferHandlerRegistry.addTransferHandler(
        ERC721_INTERFACE_ID,
        erc721TransferHandler.address
      )
      await transferHandlerRegistry.addTransferHandler(
        ERC1155_INTERFACE_ID,
        erc1155TransferHandler.address
      )
    })
  })

  describe('Minting ERC20 tokens (AST, DAI, and OMG)...', async () => {
    it('Mints 1000 AST for Alice', async () => {
      emitted(await tokenAST.mint(aliceAddress, 1000), 'Transfer')
      ok(
        await balances(aliceAddress, [
          [tokenAST, 1000],
          [tokenDAI, 0],
        ]),
        'Alice balances are incorrect'
      )
    })

    it('Mints 1000 OMG for Alice', async () => {
      emitted(
        await tokenOMG.mint(aliceAddress, 1000, { from: aliceAddress }),
        'Mint'
      )
      ok(
        await balances(aliceAddress, [
          [tokenAST, 1000],
          [tokenOMG, 1000],
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

  describe('Approving ERC20 tokens (AST and DAI)...', async () => {
    it('Checks approvals (Alice 250 AST, 200 OMG, and 0 DAI, Bob 0 AST and 1000 DAI)', async () => {
      emitted(
        await tokenAST.approve(swapAddress, 250, { from: aliceAddress }),
        'Approval'
      )
      emitted(
        await tokenOMG.approve(swapAddress, 200, { from: aliceAddress }),
        'Approval'
      )
      emitted(
        await tokenDAI.approve(swapAddress, 1000, { from: bobAddress }),
        'Approval'
      )
      ok(
        await allowances(aliceAddress, swapAddress, [
          [tokenAST, 250],
          [tokenDAI, 0],
          [tokenOMG, 200],
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

  describe('Swaps (Fungible)', async () => {
    let _order

    before('Alice creates an order for Bob (200 AST for 50 DAI)', async () => {
      _order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 200,
        },
        sender: {
          wallet: bobAddress,
          token: tokenDAI.address,
          amount: 50,
        },
      })

      _order.signature = await signatures.getWeb3Signature(
        _order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )
    })

    it('Checks that Bob can swap with Alice (200 AST for 50 DAI)', async () => {
      emitted(await swap(_order, { from: bobAddress }), 'Swap')
    })

    it('Checks balances and allowances for Alice and Bob...', async () => {
      ok(
        await balances(aliceAddress, [
          [tokenAST, 800],
          [tokenDAI, 50],
        ]),
        'Alice balances are incorrect'
      )
      ok(
        await balances(bobAddress, [
          [tokenAST, 200],
          [tokenDAI, 950],
        ]),
        'Bob balances are incorrect'
      )

      ok(
        await allowances(aliceAddress, swapAddress, [
          [tokenAST, 50],
          [tokenDAI, 0],
          [tokenOMG, 200],
        ])
      )
      ok(
        await allowances(bobAddress, swapAddress, [
          [tokenAST, 0],
          [tokenDAI, 950],
        ])
      )
    })

    it('Checks that Alice cannot trade 200 AST more than allowance of 50 AST', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 200,
        },
      })

      await reverted(swap(order, { from: bobAddress }))
    })

    it('Checks that Bob can not trade more than 950 DAI balance he holds', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: bobAddress,
          token: tokenDAI.address,
          amount: 1000,
        },
        sender: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 1,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        bobAddress,
        swapAddress,
        GANACHE_PROVIDER
      )

      await reverted(swap(order, { from: aliceAddress }), 'TRANSFER_FAILED')
    })

    it('Checks remaining balances and approvals were not updated in failed trades', async () => {
      ok(
        await balances(aliceAddress, [
          [tokenAST, 800],
          [tokenDAI, 50],
        ]),
        'Alice balances are incorrect'
      )
      ok(
        await balances(bobAddress, [
          [tokenAST, 200],
          [tokenDAI, 950],
        ]),
        'Bob balances are incorrect'
      )
      // Alice and Bob swapped 200 AST for 50 DAI above, therefore
      // Alice's 200 AST approval has gone down to 50 AST
      // Bob's 1000 DAI approval has decreased by 50
      ok(
        await allowances(aliceAddress, swapAddress, [
          [tokenAST, 50],
          [tokenDAI, 0],
        ])
      )
      ok(
        await allowances(bobAddress, swapAddress, [
          [tokenAST, 0],
          [tokenDAI, 950],
        ])
      )
    })

    it('Adding an id with Fungible token will cause revert', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 1,
          id: 30,
        },
        sender: {
          wallet: bobAddress,
          token: tokenDAI.address,
          amount: 1,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )

      await reverted(swap(order, { from: bobAddress }), 'TRANSFER_FAILED')
    })

    it('Checks that adding an affiliate address still swaps', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 1,
        },
        sender: {
          wallet: bobAddress,
          token: tokenDAI.address,
          amount: 1,
        },
        affiliate: {
          wallet: carolAddress,
          token: EMPTY_ADDRESS,
          amount: 0,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )

      emitted(await swap(order, { from: bobAddress }), 'Swap')
    })

    it('Transfers tokens back for future tests', async () => {
      // now transfer the tokens back to leave balances unchanged for future tests
      await tokenDAI.transfer(bobAddress, 1, { from: aliceAddress })
      await tokenAST.transfer(aliceAddress, 1, { from: bobAddress })

      // previous balances unchanged
      ok(
        await balances(aliceAddress, [
          [tokenAST, 800],
          [tokenDAI, 50],
        ]),
        'Alice balances are incorrect'
      )
      ok(
        await balances(bobAddress, [
          [tokenAST, 200],
          [tokenDAI, 950],
        ]),
        'Bob balances are incorrect'
      )

      // increase allowances again
      await tokenAST.approve(swapAddress, 50, { from: aliceAddress })
      await tokenDAI.approve(swapAddress, 950, { from: bobAddress })

      ok(
        await allowances(aliceAddress, swapAddress, [
          [tokenAST, 50],
          [tokenDAI, 0],
        ])
      )
      ok(
        await allowances(bobAddress, swapAddress, [
          [tokenAST, 0],
          [tokenDAI, 950],
        ])
      )
    })
  })

  describe('Swaps (Non-standard Fungible)', async () => {
    let _order

    before('Alice creates an order for Bob (200 OMG for 50 DAI)', async () => {
      _order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenOMG.address,
          amount: 200,
        },
        sender: {
          wallet: bobAddress,
          token: tokenDAI.address,
          amount: 50,
        },
      })

      _order.signature = await signatures.getWeb3Signature(
        _order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )
    })

    it('Checks that Bob can swap with Alice (200 OMG for 50 DAI)', async () => {
      emitted(await swap(_order, { from: bobAddress }), 'Swap')
    })

    it('Checks balances...', async () => {
      ok(
        await balances(aliceAddress, [
          [tokenOMG, 800],
          [tokenDAI, 100],
        ]),
        'Alice balances are incorrect'
      )
      ok(
        await balances(bobAddress, [
          [tokenOMG, 200],
          [tokenDAI, 900],
        ]),
        'Bob balances are incorrect'
      )
    })

    it('Checks that Bob cannot take the same order again (200 OMG for 50 DAI)', async () => {
      await reverted(
        swap(_order, { from: bobAddress }),
        'ORDER_TAKEN_OR_CANCELLED'
      )
    })

    it('Checks balances and approvals...', async () => {
      ok(
        await balances(aliceAddress, [
          [tokenOMG, 800],
          [tokenDAI, 100],
        ]),
        'Alice balances are incorrect'
      )
      ok(
        await balances(bobAddress, [
          [tokenOMG, 200],
          [tokenDAI, 900],
        ]),
        'Bob balances are incorrect'
      )
      ok(
        await allowances(aliceAddress, swapAddress, [
          [tokenOMG, 0],
          [tokenDAI, 0],
        ])
      )
    })

    it('Checks that Alice cannot trade 200 OMG when allowance is 0', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenOMG.address,
          amount: 200,
        },
        sender: {
          wallet: bobAddress,
          token: tokenDAI.address,
          amount: 10,
        },
      })

      await reverted(swap(order, { from: bobAddress }))
    })

    it('Checks that Bob can not trade more OMG tokens than he holds', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: bobAddress,
          token: tokenDAI.address,
          amount: 1000,
        },
        sender: {
          wallet: aliceAddress,
        },
      })
      await reverted(swap(order, { from: aliceAddress }))
    })

    it('Checks remaining balances and approvals', async () => {
      ok(
        await balances(aliceAddress, [
          [tokenOMG, 800],
          [tokenDAI, 100],
        ]),
        'Alice balances are incorrect'
      )
      ok(
        await balances(bobAddress, [
          [tokenOMG, 200],
          [tokenDAI, 900],
        ]),
        'Bob balances are incorrect'
      )
      ok(
        await allowances(aliceAddress, swapAddress, [
          [tokenOMG, 0],
          [tokenDAI, 0],
        ])
      )
      ok(
        await allowances(bobAddress, swapAddress, [
          [tokenOMG, 0],
          [tokenDAI, 900],
        ])
      )
    })
  })

  describe('Deploying NFT tokens...', async () => {
    it('Deployed test contract "ConcertTicket"', async () => {
      tokenTicket = await NonFungibleToken.new()
    })

    it('Deployed test contract "Collectible"', async () => {
      tokenKitty = await NonFungibleToken.new()
    })
  })

  describe('Swaps with Fees', async () => {
    it('Checks that Carol gets paid 50 AST for facilitating a trade between Alice and Bob', async () => {
      // increase allowances again
      await tokenAST.approve(swapAddress, 150, { from: aliceAddress })

      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 100,
        },
        sender: {
          wallet: bobAddress,
          token: tokenDAI.address,
          amount: 50,
        },
        affiliate: {
          wallet: carolAddress,
          token: tokenAST.address,
          amount: 50,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )

      emitted(await swap(order, { from: bobAddress }), 'Swap')
    })

    it('Checks balances...', async () => {
      ok(
        await balances(aliceAddress, [
          [tokenAST, 650],
          [tokenDAI, 150],
        ]),
        'Alice balances are incorrect'
      )
      ok(
        await balances(bobAddress, [
          [tokenAST, 300],
          [tokenDAI, 850],
        ]),
        'Bob balances are incorrect'
      )
      ok(
        await balances(carolAddress, [
          [tokenAST, 50],
          [tokenDAI, 0],
        ]),
        'Carol balances are incorrect'
      )
    })

    it('Checks that Carol gets paid token ticket (#121) for facilitating a trade between Alice and Bob', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 1,
        },
        sender: {
          wallet: bobAddress,
          token: tokenDAI.address,
          amount: 1,
        },
        affiliate: {
          wallet: carolAddress,
          token: tokenTicket.address,
          id: 121,
          kind: ERC721_INTERFACE_ID,
        },
      })

      // give alice token 121, she approves swap
      emitted(await tokenTicket.mint(aliceAddress, 121), 'NFTTransfer')
      emitted(
        await tokenTicket.approve(swapAddress, 121, { from: aliceAddress }),
        'NFTApproval'
      )

      await tokenAST.approve(swapAddress, 1, { from: aliceAddress })

      ok(
        await balances(aliceAddress, [[tokenTicket, 1]]),
        'Alice balances are incorrect'
      )
      ok(
        await balances(carolAddress, [[tokenTicket, 0]]),
        'Carol balances are incorrect'
      )

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )

      emitted(await swap(order, { from: bobAddress }), 'Swap')

      ok(
        await balances(aliceAddress, [[tokenTicket, 0]]),
        'Alice balances are incorrect'
      )
      ok(
        await balances(carolAddress, [[tokenTicket, 1]]),
        'Carol balances are incorrect'
      )
    })
  })

  describe('Minting ERC721 Tokens', async () => {
    it('Mints a concert ticket (#12345) for Alice', async () => {
      emitted(await tokenTicket.mint(aliceAddress, 12345), 'NFTTransfer')
      ok(
        await balances(aliceAddress, [[tokenTicket, 1]]),
        'Alice balances are incorrect'
      )
    })

    it('Mints a kitty collectible (#54321) for Bob', async () => {
      emitted(await tokenKitty.mint(bobAddress, 54321), 'NFTTransfer')
      ok(
        await balances(bobAddress, [[tokenKitty, 1]]),
        'Bob balances are incorrect'
      )
    })
  })

  describe('Swaps (Non-Fungible) with unknown kind', async () => {
    it('Alice approves Swap to transfer her concert ticket', async () => {
      emitted(
        await tokenTicket.approve(swapAddress, 12345, { from: aliceAddress }),
        'NFTApproval'
      )
    })

    it('Alice sends Bob with an unknown kind for 100 DAI', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenTicket.address,
          id: 12345,
          kind: UNKNOWN_KIND,
        },
        sender: {
          wallet: bobAddress,
          token: tokenDAI.address,
          param: 100,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )

      await reverted(
        swap(order, { from: bobAddress }),
        'UNKNOWN_TRANSFER_HANDLER'
      )
    })
  })

  describe('Swaps (Non-Fungible)', async () => {
    it('Alice approves Swap to transfer her concert ticket', async () => {
      emitted(
        await tokenTicket.approve(swapAddress, 12345, { from: aliceAddress }),
        'NFTApproval'
      )
    })

    it('Bob cannot buy Ticket #12345 from Alice if she sends id and amount in Party struct', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenTicket.address,
          id: 12345,
          amount: 100,
          kind: ERC721_INTERFACE_ID,
        },
        sender: {
          wallet: bobAddress,
          token: tokenDAI.address,
          amount: 100,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )

      await reverted(swap(order, { from: bobAddress }), 'TRANSFER_FAILED')
    })

    it('Bob buys Ticket #12345 from Alice for 100 DAI', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenTicket.address,
          id: 12345,
          kind: ERC721_INTERFACE_ID,
        },
        sender: {
          wallet: bobAddress,
          token: tokenDAI.address,
          param: 100,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )

      emitted(await swap(order, { from: bobAddress }), 'Swap')
    })

    it('Bob approves Swap to transfer his kitty collectible', async () => {
      emitted(
        await tokenKitty.approve(swapAddress, 54321, { from: bobAddress }),
        'NFTApproval'
      )
    })

    it('Alice cannot buy Kitty #54321 from Bob for 50 AST if Kitty amount specified', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 50,
        },
        sender: {
          wallet: bobAddress,
          token: tokenKitty.address,
          id: 54321,
          amount: 1000,
          kind: CKITTY_KIND,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )

      await tokenAST.approve(swapAddress, 50, { from: aliceAddress })
      await reverted(swap(order, { from: bobAddress }))
    })

    it('Alice buys Kitty #54321 from Bob for 50 AST', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 50,
        },
        sender: {
          wallet: bobAddress,
          token: tokenKitty.address,
          id: 54321,
          kind: CKITTY_KIND,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )

      await tokenAST.approve(swapAddress, 50, { from: aliceAddress })
      emitted(await swap(order, { from: bobAddress }), 'Swap')
    })

    it('Alice approves Swap to transfer her kitty collectible', async () => {
      emitted(
        await tokenKitty.approve(swapAddress, 54321, { from: aliceAddress }),
        'NFTApproval'
      )
    })

    it('Checks that Carol gets paid Kitty #54321 for facilitating a trade between Alice and Bob', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 50,
        },
        sender: {
          wallet: bobAddress,
          token: tokenDAI.address,
          amount: 50,
        },
        affiliate: {
          wallet: carolAddress,
          token: tokenKitty.address,
          id: 54321,
          kind: CKITTY_KIND,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )
      await tokenAST.approve(swapAddress, 50, { from: aliceAddress })

      emitted(await swap(order, { from: bobAddress }), 'Swap')
    })
  })

  describe('Minting ERC1155 Tokens', async () => {
    it('Mints 100 of Dragon game token (#10) for Alice', async () => {
      emitted(await tokenERC1155.mint(aliceAddress, 10, 100), 'TransferSingle')

      const aliceDragonBalance = await tokenERC1155.balanceOf.call(
        aliceAddress,
        10
      )
      equal(aliceDragonBalance, 100)
    })

    it('Mints 100 of Dragon game token (#15) for Bob', async () => {
      emitted(await tokenERC1155.mint(bobAddress, 15, 200), 'TransferSingle')

      const bobDragonBalance = await tokenERC1155.balanceOf.call(bobAddress, 15)
      equal(bobDragonBalance, 200)
    })
  })

  describe('Swaps (ERC-1155)', async () => {
    it('Alice approves Swap to transfer all the her ERC1155 tokens', async () => {
      emitted(
        await tokenERC1155.setApprovalForAll(swapAddress, true, {
          from: aliceAddress,
        }),
        'ApprovalForAll'
      )
    })

    it('Bob cannot sell 5 Dragon Token (#15) to Alice when he did not approve them', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 50,
        },
        sender: {
          wallet: bobAddress,
          token: tokenERC1155.address,
          id: 15,
          amount: 5,
          kind: ERC1155_INTERFACE_ID,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )

      await reverted(swap(order, { from: bobAddress }))
    })

    it('Bob buys 50 Dragon Token (#10) from Alice when she sends id and amount in Party struct', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenERC1155.address,
          id: 10,
          amount: 50,
          kind: ERC1155_INTERFACE_ID,
        },
        sender: {
          wallet: bobAddress,
          token: tokenDAI.address,
          amount: 100,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )

      emitted(await swap(order, { from: bobAddress }), 'Swap')
    })

    it('Checks that Carol gets paid 10 Dragon Token (#10) for facilitating a fungible token transfer trade between Alice and Bob', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 50,
        },
        sender: {
          wallet: bobAddress,
          token: tokenDAI.address,
          amount: 50,
        },
        affiliate: {
          wallet: carolAddress,
          token: tokenERC1155.address,
          id: 10,
          amount: 10,
          kind: ERC1155_INTERFACE_ID,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )

      await tokenAST.approve(swapAddress, 50, { from: aliceAddress })
      emitted(await swap(order, { from: bobAddress }), 'Swap')
    })

    it('Check the balances after ERC1155 token transfers', async () => {
      ok(
        await balances(aliceAddress, [
          [tokenAST, 499],
          [tokenDAI, 351],
        ]),
        'Alice balances are incorrect'
      )

      // check that Bob received 50 Dragon tokens from Alice
      equal(
        await tokenERC1155.balanceOf.call(bobAddress, 10),
        50,
        'Bob balances are incorrect'
      )

      // check that Carol received 10 Dragon tokens from Alice
      equal(
        await tokenERC1155.balanceOf.call(carolAddress, 10),
        10,
        'Carol balances are incorrect'
      )

      // check that Alice has only 40 Dragon tokens left
      equal(
        await tokenERC1155.balanceOf.call(aliceAddress, 10),
        40,
        'Alice balances are incorrect'
      )
      // check bob's ERC20 balances post transfers
      ok(
        await balances(bobAddress, [
          [tokenAST, 451],
          [tokenDAI, 649],
        ]),
        'Bob balances are incorrect'
      )
      ok(
        await balances(carolAddress, [
          [tokenAST, 50],
          [tokenDAI, 0],
        ]),
        'Carol balances are incorrect'
      )
    })
  })
})
