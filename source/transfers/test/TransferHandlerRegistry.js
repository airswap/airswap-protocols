const FungibleToken = artifacts.require('FungibleToken')
const NonFungibleToken = artifacts.require('NonFungibleToken')
const AdaptedKittyCore = artifacts.require('AdaptedKittyERC721')
const TransferHandlerRegistry = artifacts.require('TransferHandlerRegistry')
const KittyCoreTransferHandler = artifacts.require('KittyCoreTransferHandler')
const MintableERC1155Token = artifacts.require('MintableERC1155Token')
const ERC20TransferHandler = artifacts.require('ERC20TransferHandler')
const ERC721TransferHandler = artifacts.require('ERC721TransferHandler')
const ERC1155TransferHandler = artifacts.require('ERC1155TransferHandler')
const { emitted, reverted, ok, equal } = require('@airswap/test-utils').assert
const { allowances, balances } = require('@airswap/test-utils').balances
const { tokenKinds } = require('@airswap/constants')

contract('TransferHandlerRegistry', async accounts => {
  const aliceAddress = accounts[0]
  const bobAddress = accounts[1]
  const carolAddress = accounts[2]
  let tokenAST
  let tokenTicket
  let tokenKitty
  let tokenERC1155

  let transferHandlerRegistry

  let erc20TransferHandlerAddress
  let erc721TransferHandlerAddress
  let erc1155TransferHandlerAddress
  let kittyCoreHandlerAddress

  let erc20TransferHandler
  let erc721TransferHandler
  let erc1155TransferHandler
  let kittyCoreHandler

  describe('Deploying...', async () => {
    it('Deployed TransferHandlerRegistry contract', async () => {
      transferHandlerRegistry = await TransferHandlerRegistry.new()
    })

    it('Deployed test contract "AST"', async () => {
      tokenAST = await FungibleToken.new()
    })
    it('Deployed test contract "MintableERC1155Token"', async () => {
      tokenERC1155 = await MintableERC1155Token.new()
    })

    it('Test adding transferHandler by non-owner reverts', async () => {
      const kittyCoreHandler = await KittyCoreTransferHandler.new()

      // failed to add kittyCore by bob since non-owner
      reverted(
        transferHandlerRegistry.addTransferHandler(
          tokenKinds.CKITTY,
          kittyCoreHandler.address,
          { from: bobAddress }
        ),
        'Ownable: caller is not the owner'
      )
    })

    it('Set up TokenRegistry', async () => {
      kittyCoreHandler = await KittyCoreTransferHandler.new()
      erc20TransferHandler = await ERC20TransferHandler.new()
      erc721TransferHandler = await ERC721TransferHandler.new()
      erc1155TransferHandler = await ERC1155TransferHandler.new()
      kittyCoreHandlerAddress = kittyCoreHandler.address
      erc20TransferHandlerAddress = erc20TransferHandler.address
      erc721TransferHandlerAddress = erc721TransferHandler.address
      erc1155TransferHandlerAddress = erc1155TransferHandler.address

      // add all 4 of these contracts into the TokenRegistry
      await transferHandlerRegistry.addTransferHandler(
        tokenKinds.CKITTY,
        kittyCoreHandler.address
      )
      await transferHandlerRegistry.addTransferHandler(
        tokenKinds.ERC20,
        erc20TransferHandler.address
      )
      await transferHandlerRegistry.addTransferHandler(
        tokenKinds.ERC721,
        erc721TransferHandler.address
      )
      await transferHandlerRegistry.addTransferHandler(
        tokenKinds.ERC1155,
        erc1155TransferHandler.address
      )
    })
  })

  describe('Minting ERC20 tokens (AST)...', async () => {
    it('Mints 1000 AST for Alice', async () => {
      emitted(await tokenAST.mint(aliceAddress, 1000), 'Transfer')
      ok(
        await balances(aliceAddress, [[tokenAST, 1000]]),
        'Alice balances are incorrect'
      )
    })
  })

  describe('Approving ERC20 tokens (AST)...', async () => {
    it('Checks approvals (Alice 250 AST', async () => {
      emitted(
        await tokenAST.approve(erc20TransferHandlerAddress, 250, {
          from: aliceAddress,
        }),
        'Approval'
      )
      ok(
        await allowances(aliceAddress, erc20TransferHandlerAddress, [
          [tokenAST, 250],
        ])
      )
    })
  })

  describe('ERC20 TransferHandler', async () => {
    before(
      'Carol initiates a transfer of AST tokens from Alice to Bob',
      async () => {
        const handlerAddress = await transferHandlerRegistry.transferHandlers.call(
          tokenKinds.ERC20
        )
        equal(
          handlerAddress,
          erc20TransferHandlerAddress,
          'Kind matches ERC20 interface id'
        )

        ok(
          await erc20TransferHandler.transferTokens(
            aliceAddress,
            bobAddress,
            200,
            0,
            tokenAST.address,
            { from: carolAddress }
          )
        )
      }
    )

    it('Checks balances and allowances for Alice and Bob...', async () => {
      ok(
        await balances(aliceAddress, [[tokenAST, 800]]),
        'Alice balances are incorrect'
      )
      ok(
        await balances(bobAddress, [[tokenAST, 200]]),
        'Bob balances are incorrect'
      )

      ok(
        await allowances(aliceAddress, erc20TransferHandlerAddress, [
          [tokenAST, 50],
        ])
      )
      ok(
        await allowances(bobAddress, erc20TransferHandlerAddress, [
          [tokenAST, 0],
        ])
      )
    })

    it('Checks that Alice cannot trade 200 AST more than allowance of 50 AST', async () => {
      await reverted(
        erc20TransferHandler.transferTokens(
          aliceAddress,
          bobAddress,
          200,
          0,
          tokenAST.address,
          { from: carolAddress }
        )
      )
    })

    it('Checks remaining balances and approvals were not updated in failed transfer', async () => {
      ok(
        await balances(aliceAddress, [[tokenAST, 800]]),
        'Alice balances are incorrect'
      )
      ok(
        await balances(bobAddress, [[tokenAST, 200]]),
        'Bob balances are incorrect'
      )
      // Alice and Bob swapped 200 AST for 50 DAI above, therefore
      // Alice's 200 AST approval has gone down to 50 AST
      // Bob's 1000 DAI approval has decreased by 50
      ok(
        await allowances(aliceAddress, erc20TransferHandlerAddress, [
          [tokenAST, 50],
        ])
      )
      ok(
        await allowances(bobAddress, erc20TransferHandlerAddress, [
          [tokenAST, 0],
        ])
      )
    })

    it('Adding an id with ERC20TransferHandler will cause revert', async () => {
      await reverted(
        erc20TransferHandler.transferTokens(
          aliceAddress,
          bobAddress,
          200,
          15,
          tokenAST.address,
          { from: carolAddress }
        ),
        'ID_INVALID'
      )
    })
  })

  describe('ERC721 and CKitty TransferHandler', async () => {
    it('Deployed test ERC721 contract "ConcertTicket"', async () => {
      tokenTicket = await NonFungibleToken.new()
    })

    it('Deployed test contract "CKITTY"', async () => {
      tokenKitty = await AdaptedKittyCore.new()
    })

    it('Carol initiates an ERC721 transfer of ConcertTicket #121 tokens from Alice to Bob', async () => {
      // give alice token 121, she approves swap
      emitted(await tokenTicket.mint(aliceAddress, 121), 'NFTTransfer')
      emitted(
        await tokenTicket.approve(erc721TransferHandlerAddress, 121, {
          from: aliceAddress,
        }),
        'NFTApproval'
      )

      const handlerAddress = await transferHandlerRegistry.transferHandlers.call(
        tokenKinds.ERC721
      )
      equal(
        handlerAddress,
        erc721TransferHandlerAddress,
        'Kind does not match ERC721 interface id'
      )

      ok(
        await erc721TransferHandler.transferTokens(
          aliceAddress,
          bobAddress,
          0,
          121,
          tokenTicket.address,
          { from: carolAddress }
        )
      )

      ok(
        await balances(bobAddress, [[tokenTicket, 1]]),
        'Bob balances are incorrect'
      )
    })

    it('Carol fails to perform transfer of ConcertTicket #121 from Bob to Alice when an amount is set', async () => {
      emitted(
        await tokenTicket.approve(erc721TransferHandlerAddress, 121, {
          from: bobAddress,
        }),
        'NFTApproval'
      )

      await reverted(
        erc721TransferHandler.transferTokens(
          bobAddress,
          aliceAddress,
          100,
          54321,
          tokenTicket.address,
          { from: carolAddress }
        ),
        'AMOUNT_INVALID'
      )
    })

    it('Mints a kitty collectible (#54321) for Bob', async () => {
      emitted(await tokenKitty.mint(bobAddress, 54321), 'NFTKittyTransfer')
      ok(
        await balances(bobAddress, [[tokenKitty, 1]]),
        'Bob balances are incorrect'
      )
    })

    it('Bob approves KittyCoreHandler to transfer his kitty collectible', async () => {
      emitted(
        await tokenKitty.approve(kittyCoreHandlerAddress, 54321, {
          from: bobAddress,
        }),
        'NFTKittyApproval'
      )
    })

    it('Carol fails to perform transfer of CKITTY collectable #54321 from Bob to Alice when an amount is set', async () => {
      const handlerAddress = await transferHandlerRegistry.transferHandlers.call(
        tokenKinds.CKITTY
      )
      equal(
        handlerAddress,
        kittyCoreHandlerAddress,
        'Kind does not match CKITTY'
      )

      await reverted(
        kittyCoreHandler.transferTokens(
          bobAddress,
          aliceAddress,
          100,
          54321,
          tokenKitty.address,
          { from: carolAddress }
        ),
        'AMOUNT_INVALID'
      )
    })

    it('Carol initiates a transfer of CKITTY collectable #54321 from Bob to Alice', async () => {
      ok(
        await kittyCoreHandler.transferTokens(
          bobAddress,
          aliceAddress,
          0,
          54321,
          tokenKitty.address,
          { from: carolAddress }
        )
      )

      ok(
        await balances(aliceAddress, [[tokenKitty, 1]]),
        'Alice balances are incorrect'
      )
    })
  })

  describe('ERC1155 TransferHandler', async () => {
    it('Mints 100 of Dragon game token (#10) for Alice', async () => {
      emitted(await tokenERC1155.mint(aliceAddress, 10, 100), 'TransferSingle')

      const aliceDragonBalance = await tokenERC1155.balanceOf.call(
        aliceAddress,
        10
      )
      equal(aliceDragonBalance, 100)
    })

    it('Check the Dragon game token (#10) balance prior to transfer', async () => {
      equal(
        await tokenERC1155.balanceOf.call(bobAddress, 10),
        0,
        'Bob balances are incorrect'
      )

      equal(
        await tokenERC1155.balanceOf.call(aliceAddress, 10),
        100,
        'Alice balances are incorrect'
      )
    })

    it('Alice approves ERC115TransferHandler to transfer all the her ERC1155 tokens', async () => {
      emitted(
        await tokenERC1155.setApprovalForAll(
          erc1155TransferHandlerAddress,
          true,
          {
            from: aliceAddress,
          }
        ),
        'ApprovalForAll'
      )
    })

    it('Carol initiates an ERC1155 transfer of Dragon game token (#10) from Alice to Bob', async () => {
      const handlerAddress = await transferHandlerRegistry.transferHandlers.call(
        tokenKinds.ERC1155
      )
      equal(
        handlerAddress,
        erc1155TransferHandlerAddress,
        'Kind does not match ERC1155 interface id'
      )

      ok(
        await erc1155TransferHandler.transferTokens(
          aliceAddress,
          bobAddress,
          50,
          10,
          tokenERC1155.address,
          { from: carolAddress }
        )
      )

      const aliceDragonBalance = await tokenERC1155.balanceOf.call(
        aliceAddress,
        10
      )
      equal(aliceDragonBalance, 50)

      const bobDragonBalance = await tokenERC1155.balanceOf.call(bobAddress, 10)
      equal(bobDragonBalance, 50)
    })
  })
})
