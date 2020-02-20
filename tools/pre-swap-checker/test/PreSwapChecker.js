const Swap = artifacts.require('Swap')
const Wrapper = artifacts.require('Wrapper')
const Types = artifacts.require('Types')
const MintableERC1155 = artifacts.require('MintableERC1155Token')
const FungibleToken = artifacts.require('FungibleToken')
const NonFungibleToken = artifacts.require('NonFungibleToken')
const AdaptedKittyERC721 = artifacts.require('AdaptedKittyERC721')
const WETH9 = artifacts.require('WETH9')
const PreSwapChecker = artifacts.require('PreSwapChecker')
const TransferHandlerRegistry = artifacts.require('TransferHandlerRegistry')
const ERC20TransferHandler = artifacts.require('ERC20TransferHandler')
const ERC721TransferHandler = artifacts.require('ERC721TransferHandler')
const ERC1155TransferHandler = artifacts.require('ERC1155TransferHandler')
const KittyCoreTransferHandler = artifacts.require('KittyCoreTransferHandler')
const {
  emitted,
  equal,
  getResult,
  passes,
  reverted,
  ok,
} = require('@airswap/test-utils').assert
const { allowances, balances } = require('@airswap/test-utils').balances
const { getLatestTimestamp } = require('@airswap/test-utils').time
const { orders, signatures } = require('@airswap/order-utils')
const {
  EMPTY_ADDRESS,
  ERC20_INTERFACE_ID,
  ERC721_INTERFACE_ID,
  ERC1155_INTERFACE_ID,
  CK_INTERFACE_ID,
  GANACHE_PROVIDER,
} = require('@airswap/order-utils').constants

contract('PreSwapChecker', async accounts => {
  const aliceAddress = accounts[0]
  const bobAddress = accounts[1]
  const eveAddress = '0x9d2fB0BCC90C6F3Fa3a98D2C760623a4F6Ee59b4'
  const evePrivKey = Buffer.from(
    '4934d4ff925f39f91e3729fbce52ef12f25fdf93e014e291350f7d314c1a096b',
    'hex'
  )
  const FAKE_TRANSFER_HANDLER = '0xFFFFF'
  const UNKNOWN_KIND = '0x9999'
  let preSwapChecker
  let swapContract
  let swapAddress
  let wrapperContract
  let wrapperAddress
  let tokenAST
  let tokenDAI
  let godsUnchained
  let cryptoKitties
  let typesLib
  let tokenWETH
  let erc1155

  let swap
  let cancelUpTo
  let errorCodes

  describe('Deploying...', async () => {
    it('Deployed Swap contract', async () => {
      typesLib = await Types.new()
      await Swap.link('Types', typesLib.address)

      const erc20TransferHandler = await ERC20TransferHandler.new()
      const erc721TransferHandler = await ERC721TransferHandler.new()
      const erc1155TransferHandler = await ERC1155TransferHandler.new()
      const kittyCoreTransferHandler = await KittyCoreTransferHandler.new()
      const transferHandlerRegistry = await TransferHandlerRegistry.new()
      await transferHandlerRegistry.addTransferHandler(
        ERC20_INTERFACE_ID,
        erc20TransferHandler.address
      )
      await transferHandlerRegistry.addTransferHandler(
        ERC721_INTERFACE_ID,
        erc721TransferHandler.address
      )
      await transferHandlerRegistry.addTransferHandler(
        CK_INTERFACE_ID,
        kittyCoreTransferHandler.address
      )
      await transferHandlerRegistry.addTransferHandler(
        ERC1155_INTERFACE_ID,
        erc1155TransferHandler.address
      )

      // adding a bad transfer handler
      await transferHandlerRegistry.addTransferHandler(
        FAKE_TRANSFER_HANDLER,
        accounts[5]
      )
      // now deploy swap
      swapContract = await Swap.new(transferHandlerRegistry.address)
      swapAddress = swapContract.address

      swap = swapContract.swap
      cancelUpTo = swapContract.methods['cancelUpTo(uint256)']

      orders.setVerifyingContract(swapAddress)
    })

    it('Deployed Wrapper contract', async () => {
      tokenWETH = await WETH9.new()
      wrapperContract = await Wrapper.new(swapAddress, tokenWETH.address)
      wrapperAddress = wrapperContract.address
    })

    it('Deployed SwapChecker contract', async () => {
      await PreSwapChecker.link('Types', typesLib.address)
      preSwapChecker = await PreSwapChecker.new(tokenWETH.address)
    })

    it('Deployed test contract "AST"', async () => {
      tokenAST = await FungibleToken.new()
    })

    it('Deployed test contract "DAI"', async () => {
      tokenDAI = await FungibleToken.new()
    })
  })

  describe('Minting...', async () => {
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
    it('Checks approvals (Alice 250 AST and 0 DAI, Bob 100 WETH and 1000 DAI)', async () => {
      emitted(
        await tokenAST.approve(swapAddress, 250, { from: aliceAddress }),
        'Approval'
      )
      emitted(
        await tokenDAI.approve(swapAddress, 1000, { from: bobAddress }),
        'Approval'
      )

      emitted(
        await tokenWETH.approve(swapAddress, 100, { from: bobAddress }),
        'Approval'
      )
      ok(
        await allowances(aliceAddress, swapAddress, [
          [tokenAST, 250],
          [tokenDAI, 0],
        ])
      )
      ok(
        await allowances(bobAddress, swapAddress, [
          [tokenAST, 0],
          [tokenDAI, 1000],
          [tokenWETH, 100],
        ])
      )
    })
  })

  describe('Swaps (Fungible)', async () => {
    let order

    before('Alice creates an order for Bob (200 AST for 50 DAI)', async () => {
      order = await orders.getOrder({
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

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )
    })

    it('Checks fillable order is empty error array', async () => {
      const checkerOutput = await preSwapChecker.checkSwap.call(order, {
        from: bobAddress,
      })
      equal(checkerOutput[0], 0)
      equal(checkerOutput[1][0].substring(0, 42), EMPTY_ADDRESS)
    })

    it('Checks that Alice cannot swap with herself (200 AST for 50 AST)', async () => {
      const selfOrder = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 200,
        },
        sender: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 50,
        },
      })

      errorCodes = await preSwapChecker.checkSwap.call(selfOrder, {
        from: bobAddress,
      })

      const error = web3.utils.toUtf8(errorCodes[1][0])
      const error1 = web3.utils.toUtf8(errorCodes[1][1])
      equal(error, 'SELF_TRANSFER_INVALID')
      equal(error1, 'SIGNER_UNAUTHORIZED')
      equal(errorCodes[0], 2)
    })

    it('Checks error messages for invalid balances and approvals', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 200000,
        },
        sender: {
          wallet: bobAddress,
          token: tokenAST.address,
          amount: 200000,
        },
      })

      errorCodes = await preSwapChecker.checkSwap.call(order, {
        from: bobAddress,
      })
      equal(errorCodes[0], 5)
      equal(web3.utils.toUtf8(errorCodes[1][0]), 'SIGNER_UNAUTHORIZED')
      equal(web3.utils.toUtf8(errorCodes[1][1]), 'SENDER_BALANCE_LOW')
      equal(web3.utils.toUtf8(errorCodes[1][2]), 'SENDER_ALLOWANCE_LOW')
      equal(web3.utils.toUtf8(errorCodes[1][3]), 'SIGNER_BALANCE_LOW')
      equal(web3.utils.toUtf8(errorCodes[1][4]), 'SIGNER_ALLOWANCE_LOW')
    })

    it('Checks filled order emits error', async () => {
      // filled default order
      emitted(await swap(order, { from: bobAddress }), 'Swap')

      // Try to check if this order can be filled a second time
      errorCodes = await preSwapChecker.checkSwap.call(order, {
        from: bobAddress,
      })
      equal(errorCodes[0], 2)
      equal(web3.utils.toUtf8(errorCodes[1][0]), 'ORDER_TAKEN_OR_CANCELLED')
      equal(web3.utils.toUtf8(errorCodes[1][1]), 'SIGNER_ALLOWANCE_LOW')
    })

    it('Checks expired, low nonced, and invalid sig order emits error', async () => {
      emitted(await cancelUpTo(10, { from: aliceAddress }), 'CancelUpTo')

      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 20,
        },
        sender: {
          wallet: bobAddress,
          token: tokenDAI.address,
          amount: 5,
        },
        expiry: (await getLatestTimestamp()) - 10, // expired time
        nonce: 5, // nonce below minimum threshold
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )
      // add an invalid signature
      order.signature.v = 3

      // Try to check if this order can be filled a second time
      errorCodes = await preSwapChecker.checkSwap.call(order, {
        from: bobAddress,
      })
      equal(errorCodes[0], 3)
      equal(web3.utils.toUtf8(errorCodes[1][0]), 'ORDER_EXPIRED')
      equal(web3.utils.toUtf8(errorCodes[1][1]), 'NONCE_TOO_LOW')
      equal(web3.utils.toUtf8(errorCodes[1][2]), 'SIGNATURE_INVALID')
    })

    it('Alice authorizes Carol to make orders on her behalf', async () => {
      emitted(
        await swapContract.authorizeSigner(eveAddress, {
          from: aliceAddress,
        }),
        'AuthorizeSigner'
      )
    })

    it('Check from a different approved signer and empty sender address', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 20,
        },
        sender: {
          wallet: EMPTY_ADDRESS,
          token: tokenDAI.address,
          amount: 50000,
        },
      })

      order.signature = signatures.getPrivateKeySignature(
        order,
        evePrivKey,
        swapAddress
      )

      order.signature.signatory = eveAddress

      errorCodes = await preSwapChecker.checkSwap.call(order, {
        from: bobAddress,
      })
      equal(errorCodes[0], 0)
      equal(errorCodes[1][0].substring(0, 42), EMPTY_ADDRESS)
    })
  })

  describe('Deploying non-fungible token...', async () => {
    it('Deployed test contract "Collectible"', async () => {
      godsUnchained = await NonFungibleToken.new()
    })
  })

  describe('Minting and testing non-fungible token...', async () => {
    it('Mints a NFT collectible (#54321) for Bob', async () => {
      emitted(await godsUnchained.mint(bobAddress, 54321), 'NFTTransfer')
      ok(
        await balances(bobAddress, [[godsUnchained, 1]]),
        'Bob balances are incorrect'
      )
    })

    it('Alice tries to buy non-owned NFT #54320 from Bob for 50 AST causes revert', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 50,
        },
        sender: {
          wallet: bobAddress,
          token: godsUnchained.address,
          id: 54320,
          kind: ERC721_INTERFACE_ID,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )
      await reverted(
        preSwapChecker.checkSwap.call(order, { from: bobAddress }),
        'revert ERC721: owner query for nonexistent token'
      )
    })

    it('Alice tries to buy non-approved NFT #54321 from Bob for 50 AST', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 50,
        },
        sender: {
          wallet: bobAddress,
          token: godsUnchained.address,
          id: 54321,
          kind: ERC721_INTERFACE_ID,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )

      order.signature.version = '0x99' // incorrect version

      errorCodes = await preSwapChecker.checkSwap.call(order, {
        from: bobAddress,
      })
      equal(errorCodes[0], 2)
      equal(web3.utils.toUtf8(errorCodes[1][0]), 'SIGNATURE_INVALID')
      equal(web3.utils.toUtf8(errorCodes[1][1]), 'SENDER_ALLOWANCE_LOW')
    })
  })

  describe('Deploying cryptokitties...', async () => {
    it('Deployed test contract "Collectible"', async () => {
      cryptoKitties = await AdaptedKittyERC721.new()
    })
  })

  describe('Minting and testing cryptokitties...', async () => {
    it('Mints a kitty collectible (#123) for Bob and (#1) for Alice', async () => {
      emitted(await cryptoKitties.mint(bobAddress, 123), 'NFTKittyTransfer')
      emitted(await cryptoKitties.mint(aliceAddress, 1), 'NFTKittyTransfer')
      ok(
        await balances(bobAddress, [[cryptoKitties, 1]]),
        'Bob balances are incorrect'
      )
    })

    it('Alice tries to buy non-owned Kitty #124 from Bob for 50 AST causes revert', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 50,
        },
        sender: {
          wallet: bobAddress,
          token: cryptoKitties.address,
          id: 124,
          kind: CK_INTERFACE_ID,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )
      await reverted(
        preSwapChecker.checkSwap.call(order, { from: bobAddress }),
        'revert ERC721: owner query for nonexistent token'
      )
    })

    it('Alice tries to buy a token that Bob doesnt own', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 50,
        },
        sender: {
          wallet: bobAddress,
          token: cryptoKitties.address,
          id: 1,
          kind: CK_INTERFACE_ID,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )

      errorCodes = await preSwapChecker.checkSwap.call(order, {
        from: bobAddress,
      })
      equal(errorCodes[0], 2)
      equal(web3.utils.toUtf8(errorCodes[1][0]), 'SENDER_BALANCE_LOW')
      equal(web3.utils.toUtf8(errorCodes[1][1]), 'SENDER_ALLOWANCE_LOW')
    })

    it('Alice tries to buy non-approved Kitty #123 from Bob for 50 AST', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 50,
        },
        sender: {
          wallet: bobAddress,
          token: cryptoKitties.address,
          id: 123,
          kind: CK_INTERFACE_ID,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )

      order.signature.version = '0x99' // incorrect version

      errorCodes = await preSwapChecker.checkSwap.call(order, {
        from: bobAddress,
      })
      equal(errorCodes[0], 2)
      equal(web3.utils.toUtf8(errorCodes[1][0]), 'SIGNATURE_INVALID')
      equal(web3.utils.toUtf8(errorCodes[1][1]), 'SENDER_ALLOWANCE_LOW')
    })
  })

  describe('Deploying ERC1155...', async () => {
    it('Deployed test ERC1155 Contract', async () => {
      erc1155 = await MintableERC1155.new()
    })
  })

  describe('Minting and testing ERC1155', async () => {
    it('Mints an ERC1155 collectable for Bob and Alice', async () => {
      await erc1155.mint(bobAddress, 1234, 100)
      await erc1155.mint(aliceAddress, 3412, 1000)
    })
  })

  describe('Swaps (Unknown token kind but valid ERC-20 tokens)', async () => {
    let order

    it('Alice creates an order for Bob (200 AST for 50 DAI) with unknown kind', async () => {
      order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 200,
          kind: UNKNOWN_KIND,
        },
        sender: {
          wallet: bobAddress,
          token: tokenDAI.address,
          amount: 50,
          kind: UNKNOWN_KIND,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )
    })

    it('Checks malformed order errors out', async () => {
      errorCodes = await preSwapChecker.checkSwap.call(order, {
        from: bobAddress,
      })
      equal(errorCodes[0], 2)
      equal(web3.utils.toUtf8(errorCodes[1][0]), 'SENDER_TOKEN_KIND_UNKNOWN')
      equal(web3.utils.toUtf8(errorCodes[1][1]), 'SIGNER_TOKEN_KIND_UNKNOWN')
    })
  })

  describe('Swaps (ERC20 token kind and invalid token addresses)', async () => {
    let order

    it('Alice creates an order for Bob (200 non-contract address for 50 non-contract address) will revert', async () => {
      order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: aliceAddress,
          amount: 200,
          kind: ERC20_INTERFACE_ID,
        },
        sender: {
          wallet: bobAddress,
          token: bobAddress,
          amount: 50,
          kind: ERC20_INTERFACE_ID,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )
    })

    it('Checks malformed order reverts out', async () => {
      await reverted(
        preSwapChecker.checkSwap.call(order, {
          from: bobAddress,
        })
      )
    })
  })

  describe('Swaps (ERC721 kind and invalid interface token addresses)', async () => {
    let order

    it('Alice creates an order for Bob for incorrect kind will output errors and skip balance checks', async () => {
      order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: aliceAddress,
          amount: 200,
          kind: ERC721_INTERFACE_ID,
        },
        sender: {
          wallet: bobAddress,
          token: bobAddress,
          amount: 50,
          kind: ERC721_INTERFACE_ID,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )
    })

    it('Checks malformed order errors out', async () => {
      errorCodes = await preSwapChecker.checkSwap.call(order, {
        from: bobAddress,
      })
      equal(errorCodes[0], 4)
      equal(web3.utils.toUtf8(errorCodes[1][0]), 'SENDER_INVALID_AMOUNT')
      equal(web3.utils.toUtf8(errorCodes[1][1]), 'SIGNER_INVALID_AMOUNT')
      equal(web3.utils.toUtf8(errorCodes[1][2]), 'SENDER_TOKEN_KIND_MISMATCH')
      equal(web3.utils.toUtf8(errorCodes[1][3]), 'SIGNER_TOKEN_KIND_MISMATCH')
    })
  })

  describe('Swaps (ERC20 kind and ids filled in order)', async () => {
    let order

    it('Alice creates an order for Bob for kind with invalid ids', async () => {
      order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenAST.address,
          id: 200,
          amount: 200,
          kind: ERC20_INTERFACE_ID,
        },
        sender: {
          wallet: bobAddress,
          token: tokenDAI.address,
          id: 50,
          amount: 50,
          kind: ERC20_INTERFACE_ID,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )
    })

    it('Checks malformed order errors out', async () => {
      errorCodes = await preSwapChecker.checkSwap.call(order, {
        from: bobAddress,
      })
      equal(errorCodes[0], 3)
      equal(web3.utils.toUtf8(errorCodes[1][0]), 'SENDER_INVALID_ID')
      equal(web3.utils.toUtf8(errorCodes[1][1]), 'SIGNER_INVALID_ID')
      equal(web3.utils.toUtf8(errorCodes[1][2]), 'SIGNER_ALLOWANCE_LOW')
    })
  })

  describe('Swaps (ERC20 kind) and invalid validator and signature', async () => {
    let order

    it('Alice creates an order for Bob for kind with invalid validator address', async () => {
      order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenAST.address,
          id: 200,
          amount: 200,
          kind: ERC20_INTERFACE_ID,
        },
        sender: {
          wallet: bobAddress,
          token: tokenDAI.address,
          id: 50,
          amount: 50,
          kind: ERC20_INTERFACE_ID,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )
      order.signature.validator = EMPTY_ADDRESS
    })

    it('Checks malformed order errors out from invalid validator', async () => {
      errorCodes = await preSwapChecker.checkSwap.call(order, {
        from: bobAddress,
      })
      equal(errorCodes[0], 6)
      equal(web3.utils.toUtf8(errorCodes[1][0]), 'VALIDATOR_INVALID')
      equal(web3.utils.toUtf8(errorCodes[1][1]), 'SENDER_INVALID_ID')
      equal(web3.utils.toUtf8(errorCodes[1][2]), 'SIGNER_INVALID_ID')
      equal(web3.utils.toUtf8(errorCodes[1][3]), 'SIGNATURE_INVALID')
      equal(web3.utils.toUtf8(errorCodes[1][4]), 'SENDER_TOKEN_KIND_UNKNOWN')
      equal(web3.utils.toUtf8(errorCodes[1][5]), 'SIGNER_TOKEN_KIND_UNKNOWN')
    })
  })

  describe('Wrapper Buys on Swap (Fungible)', async () => {
    it('Checks that valid order has zero errors with WETH on sender wallet', async () => {
      // Bob take a WETH for DAI order from Alice using ETH
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 50,
        },
        sender: {
          wallet: bobAddress,
          token: tokenWETH.address,
          amount: 10,
        },
      })

      // Bob authorizes swap to send orders on his behalf
      // function also checks that msg.sender == order.sender.wallet
      await swapContract.authorizeSender(wrapperAddress, {
        from: bobAddress,
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )

      const errorCodes = await preSwapChecker.checkWrappedSwap.call(
        order,
        bobAddress,
        wrapperAddress,
        { from: bobAddress }
      )

      equal(errorCodes[0], 0)
      equal(errorCodes[1][0].substring(0, 42), EMPTY_ADDRESS)
    })

    it('Checks errors out with lack of balances and allowance on wrapper', async () => {
      // Bob take a WETH for DAI order from Alice using ETH
      const order = await orders.getOrder({
        sender: {
          wallet: aliceAddress,
          token: tokenDAI.address,
          amount: 50000,
        },
        signer: {
          wallet: bobAddress,
          token: tokenWETH.address,
          amount: 10,
        },
      })

      const errorCodes = await preSwapChecker.checkWrappedSwap.call(
        order,
        bobAddress,
        wrapperAddress,
        { from: bobAddress }
      )

      equal(errorCodes[0], 8)
      equal(web3.utils.toUtf8(errorCodes[1][0]), 'SIGNER_UNAUTHORIZED')
      equal(
        web3.utils.toUtf8(errorCodes[1][1]),
        'MSG_SENDER_MUST_BE_ORDER_SENDER'
      )
      equal(web3.utils.toUtf8(errorCodes[1][2]), 'SENDER_UNAUTHORIZED')
      equal(web3.utils.toUtf8(errorCodes[1][3]), 'SIGNATURE_MUST_BE_SENT')
      equal(web3.utils.toUtf8(errorCodes[1][4]), 'SENDER_WRAPPER_ALLOWANCE_LOW')
      equal(web3.utils.toUtf8(errorCodes[1][5]), 'SENDER_BALANCE_LOW')
      equal(web3.utils.toUtf8(errorCodes[1][6]), 'SENDER_ALLOWANCE_LOW')
      equal(web3.utils.toUtf8(errorCodes[1][7]), 'SIGNER_BALANCE_LOW')
    })

    it('Checks errors out with invalid validator address', async () => {
      // Bob take a WETH for DAI order from Alice using ETH
      const order = await orders.getOrder({
        sender: {
          wallet: aliceAddress,
          token: tokenDAI.address,
          amount: 50000,
        },
        signer: {
          wallet: bobAddress,
          token: tokenWETH.address,
          amount: 10,
        },
      })

      order.signature.validator = EMPTY_ADDRESS

      const errorCodes = await preSwapChecker.checkWrappedSwap.call(
        order,
        bobAddress,
        wrapperAddress,
        { from: bobAddress }
      )

      equal(errorCodes[0], 6)
      equal(web3.utils.toUtf8(errorCodes[1][0]), 'VALIDATOR_INVALID')
      equal(
        web3.utils.toUtf8(errorCodes[1][1]),
        'MSG_SENDER_MUST_BE_ORDER_SENDER'
      )
      equal(web3.utils.toUtf8(errorCodes[1][2]), 'SIGNATURE_MUST_BE_SENT')
      equal(web3.utils.toUtf8(errorCodes[1][3]), 'SENDER_WRAPPER_ALLOWANCE_LOW')
      equal(web3.utils.toUtf8(errorCodes[1][4]), 'SENDER_TOKEN_KIND_UNKNOWN')
      equal(web3.utils.toUtf8(errorCodes[1][5]), 'SIGNER_TOKEN_KIND_UNKNOWN')
    })

    it('Adding approval allows for zero errors and successful fill of order signer WETH', async () => {
      // Bob take a WETH for DAI order from Alice using ETH
      const order = await orders.getOrder({
        sender: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 50,
        },
        signer: {
          wallet: bobAddress,
          token: tokenWETH.address,
          amount: 10,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        bobAddress,
        swapAddress,
        GANACHE_PROVIDER
      )

      // Ensure bob has sufficient WETH
      await tokenWETH.deposit({ from: bobAddress, value: 10 })

      // Alice authorizes swap to send orders on his behalf
      // function also checks that msg.sender == order.sender.wallet
      await swapContract.authorizeSender(wrapperAddress, {
        from: aliceAddress,
      })

      emitted(
        await tokenWETH.approve(wrapperAddress, 10, { from: aliceAddress }),
        'Approval'
      )

      const errorCodes = await preSwapChecker.checkWrappedSwap.call(
        order,
        aliceAddress,
        wrapperAddress,
        { from: aliceAddress }
      )
      equal(errorCodes[0], 0)

      // Received zero exceptions so can send to wrapper and have a successful fill
      const result = await wrapperContract.swap(order, { from: aliceAddress })
      passes(result)
    })

    it('Checks that valid order has zero errors with WETH on sender wallet', async () => {
      // Bob take a WETH for DAI order from Alice using ETH
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 50,
        },
        sender: {
          wallet: bobAddress,
          token: tokenWETH.address,
          amount: 10,
        },
      })

      // Bob authorizes swap to send orders on his behalf
      // function also checks that msg.sender == order.sender.wallet
      await swapContract.authorizeSender(wrapperAddress, {
        from: bobAddress,
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )

      const errorCodes = await preSwapChecker.checkWrappedSwap.call(
        order,
        bobAddress,
        wrapperAddress,
        { from: bobAddress }
      )
      equal(errorCodes[0], 1)
      equal(web3.utils.toUtf8(errorCodes[1][0]), 'SIGNER_ALLOWANCE_LOW')

      emitted(
        await tokenAST.approve(swapAddress, 50, { from: aliceAddress }),
        'Approval'
      )

      // Received zero exceptions so can send to wrapper and have a successful fill
      const result = wrapperContract.swap(order, {
        from: bobAddress,
        value: 10,
      })
      passes(await result)
    })

    it('Checks that massive ETH trade will error if invalid balance', async () => {
      // Bob take a WETH for DAI order from Alice using ETH
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenDAI.address,
          amount: '50',
        },
        sender: {
          wallet: bobAddress,
          token: tokenWETH.address,
          amount: '100000000000000000000000',
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )

      const errorCodes = await preSwapChecker.checkWrappedSwap.call(
        order,
        bobAddress,
        wrapperAddress,
        { from: bobAddress }
      )
      equal(errorCodes[0], 3)
      equal(web3.utils.toUtf8(errorCodes[1][0]), 'SENDER_ETHER_LOW')
      equal(web3.utils.toUtf8(errorCodes[1][1]), 'SENDER_ALLOWANCE_LOW')
      equal(web3.utils.toUtf8(errorCodes[1][2]), 'SIGNER_ALLOWANCE_LOW')
    })
  })

  describe('Wrapper Receive ETH on Swap (Fungible)', async () => {
    it('Checks errors out with lack of allowance on wrapper', async () => {
      const order = await orders.getOrder({
        sender: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 50,
        },
        signer: {
          wallet: bobAddress,
          token: tokenWETH.address,
          amount: 10,
        },
      })

      const errorCodes = await preSwapChecker.checkWrappedSwap.call(
        order,
        aliceAddress,
        wrapperAddress,
        { from: aliceAddress }
      )

      equal(errorCodes[0], 5)
      equal(web3.utils.toUtf8(errorCodes[1][0]), 'SIGNER_UNAUTHORIZED')
      equal(web3.utils.toUtf8(errorCodes[1][1]), 'SIGNATURE_MUST_BE_SENT')
      equal(web3.utils.toUtf8(errorCodes[1][2]), 'SENDER_WRAPPER_ALLOWANCE_LOW')
      equal(web3.utils.toUtf8(errorCodes[1][3]), 'SENDER_ALLOWANCE_LOW')
      equal(web3.utils.toUtf8(errorCodes[1][4]), 'SIGNER_BALANCE_LOW')
    })

    it('Checks sending empty address on sender does not break preswapchecker', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 50,
        },
        sender: {
          wallet: EMPTY_ADDRESS,
          token: tokenWETH.address,
          amount: 10,
        },
      })

      const errorCodes = await preSwapChecker.checkWrappedSwap.call(
        order,
        aliceAddress,
        wrapperAddress,
        { from: aliceAddress }
      )

      equal(errorCodes[0], 5)
      equal(web3.utils.toUtf8(errorCodes[1][0]), 'SIGNER_UNAUTHORIZED')
      equal(
        web3.utils.toUtf8(errorCodes[1][1]),
        'MSG_SENDER_MUST_BE_ORDER_SENDER'
      )
      equal(web3.utils.toUtf8(errorCodes[1][2]), 'SENDER_UNAUTHORIZED')
      equal(web3.utils.toUtf8(errorCodes[1][3]), 'SIGNATURE_MUST_BE_SENT')
      equal(web3.utils.toUtf8(errorCodes[1][4]), 'SIGNER_ALLOWANCE_LOW')
    })

    it('Adding approval allows for zero errors and successful fill of order signer WETH', async () => {
      const order = await orders.getOrder({
        sender: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 50,
        },
        signer: {
          wallet: bobAddress,
          token: tokenWETH.address,
          amount: 10,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        bobAddress,
        swapAddress,
        GANACHE_PROVIDER
      )

      // Ensure bob has sufficient WETH
      await tokenWETH.deposit({ from: bobAddress, value: 10 })

      // Alice authorizes swap to send orders on his behalf
      // function also checks that msg.sender == order.sender.wallet
      await swapContract.authorizeSender(wrapperAddress, {
        from: aliceAddress,
      })

      emitted(
        await tokenWETH.approve(wrapperAddress, 10, { from: aliceAddress }),
        'Approval'
      )

      emitted(
        await tokenAST.approve(swapAddress, 50, { from: aliceAddress }),
        'Approval'
      )

      const errorCodes = await preSwapChecker.checkWrappedSwap.call(
        order,
        aliceAddress,
        wrapperAddress,
        { from: aliceAddress }
      )
      equal(errorCodes[0], 0)
      // Received zero exceptions so can send to wrapper and have a successful fill
      let result = await wrapperContract.swap(order, { from: aliceAddress })
      passes(result)
      result = await getResult(swapContract, result.tx)
      emitted(result, 'Swap')
    })

    it('Checks inserting unknown kind outputs error', async () => {
      const order = await orders.getOrder({
        sender: {
          wallet: aliceAddress,
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
      })

      // Bob authorizes swap to send orders on his behalf
      // function also checks that msg.sender == order.sender.wallet
      await swapContract.authorizeSender(wrapperAddress, {
        from: bobAddress,
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        bobAddress,
        swapAddress,
        GANACHE_PROVIDER
      )

      const errorCodes = await preSwapChecker.checkWrappedSwap.call(
        order,
        aliceAddress,
        wrapperAddress,
        { from: aliceAddress }
      )
      equal(errorCodes[0], 3)
      equal(web3.utils.toUtf8(errorCodes[1][0]), 'SENDER_WRAPPER_ALLOWANCE_LOW')
      equal(web3.utils.toUtf8(errorCodes[1][1]), 'SENDER_TOKEN_KIND_UNKNOWN')
      equal(web3.utils.toUtf8(errorCodes[1][2]), 'SIGNER_TOKEN_KIND_UNKNOWN')
    })

    it('Checks malformed order errors out', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 200,
          kind: ERC721_INTERFACE_ID,
        },
        sender: {
          wallet: bobAddress,
          token: tokenWETH.address,
          amount: 50,
          kind: ERC721_INTERFACE_ID,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )
      errorCodes = await preSwapChecker.checkWrappedSwap.call(
        order,
        bobAddress,
        wrapperAddress,
        {
          from: bobAddress,
        }
      )
      equal(errorCodes[0], 4)
      equal(web3.utils.toUtf8(errorCodes[1][0]), 'SENDER_INVALID_AMOUNT')
      equal(web3.utils.toUtf8(errorCodes[1][1]), 'SIGNER_INVALID_AMOUNT')
      equal(web3.utils.toUtf8(errorCodes[1][2]), 'SENDER_TOKEN_KIND_MISMATCH')
      equal(web3.utils.toUtf8(errorCodes[1][3]), 'SIGNER_TOKEN_KIND_MISMATCH')
    })
  })
})
