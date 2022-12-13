const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json')
const {
  createOrder,
  createOrderSignature,
  checkResultToErrors,
} = require('@airswap/utils')
const { tokenKinds, ADDRESS_ZERO } = require('@airswap/constants')

const CHAIN_ID = 31337
const PROTOCOL_FEE = '30'
const DEFAULT_AMOUNT = '1000'
const DEFAULT_SIGNER_AMOUNT = '2030'

const signOrder = async (order, wallet, swapContract) => {
  return {
    ...order,
    ...(await createOrderSignature(order, wallet, swapContract, CHAIN_ID)),
  }
}

describe('Swap Unit Tests', () => {
  let snapshotId
  let swap
  let signerToken
  let senderToken
  let affiliateToken

  let transferHandlerRegistry
  let erc20Handler

  let deployer
  let signer
  let sender
  let affiliate

  async function createSignedOrder(params, signatory) {
    const unsignedOrder = createOrder({
      protocolFee: PROTOCOL_FEE,
      ...params,
      signer: {
        wallet: signer.address,
        token: signerToken.address,
        kind: tokenKinds.ERC20,
        id: '0',
        amount: DEFAULT_AMOUNT,
        ...params.signer,
      },
      sender: {
        wallet: sender.address,
        token: senderToken.address,
        kind: tokenKinds.ERC20,
        id: '0',
        amount: DEFAULT_AMOUNT,
        ...params.sender,
      },
    })
    return await signOrder(unsignedOrder, signatory, swap.address, CHAIN_ID)
  }

  async function setUpAllowances(senderAmount, signerAmount) {
    await senderToken.mock.allowance
      .withArgs(sender.address, swap.address)
      .returns(senderAmount)
    await signerToken.mock.allowance
      .withArgs(signer.address, swap.address)
      .returns(signerAmount)
  }

  async function setUpBalances(senderAmount, signerAmount) {
    await senderToken.mock.balanceOf
      .withArgs(sender.address)
      .returns(senderAmount)
    await signerToken.mock.balanceOf
      .withArgs(signer.address)
      .returns(signerAmount)
  }

  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot')
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  before('get signers and deploy', async () => {
    ;[deployer, sender, signer, affiliate, protocolFeeWallet, anyone] =
      await ethers.getSigners()

    signerToken = await deployMockContract(deployer, IERC20.abi)
    senderToken = await deployMockContract(deployer, IERC20.abi)
    affiliateToken = await deployMockContract(deployer, IERC20.abi)

    await signerToken.mock.transferFrom.returns(true)
    await senderToken.mock.transferFrom.returns(true)
    await affiliateToken.mock.transferFrom.returns(true)

    transferHandlerRegistry = await (
      await ethers.getContractFactory('TransferHandlerRegistry')
    ).deploy()
    await transferHandlerRegistry.deployed()
    erc20Handler = await (
      await ethers.getContractFactory('ERC20TransferHandler')
    ).deploy()
    await erc20Handler.deployed()
    erc721Handler = await (
      await ethers.getContractFactory('ERC721TransferHandler')
    ).deploy()
    await erc721Handler.deployed()
    erc1155Handler = await (
      await ethers.getContractFactory('ERC1155TransferHandler')
    ).deploy()
    await erc1155Handler.deployed()

    await transferHandlerRegistry.addTransferHandler(
      tokenKinds.ERC20,
      erc20Handler.address
    )
    await transferHandlerRegistry.addTransferHandler(
      tokenKinds.ERC721,
      erc721Handler.address
    )
    await expect(
      transferHandlerRegistry.addTransferHandler(
        tokenKinds.ERC1155,
        erc1155Handler.address
      )
    ).to.emit(transferHandlerRegistry, 'AddTransferHandler')
    await expect(
      transferHandlerRegistry.addTransferHandler(
        tokenKinds.ERC1155,
        erc1155Handler.address
      )
    ).to.be.revertedWith('HANDLER_EXISTS_FOR_KIND')

    swap = await (
      await ethers.getContractFactory('Swap')
    ).deploy(transferHandlerRegistry.address)
    await swap.deployed()
  })

  describe('Constructor', async () => {
    describe('Test signatures', async () => {
      it('test signatures', async () => {
        let order = await createSignedOrder({}, signer)
        await expect(swap.connect(sender).swap(order)).to.emit(swap, 'Swap')
      })
    })
  })

  describe('Test check', async () => {
    it('test check with bad kind', async () => {
      const order = await createSignedOrder(
        {
          signer: {
            kind: '0x00000000',
          },
          sender: {
            kind: '0x00000000',
          },
        },
        signer
      )
      const [errCount] = await swap.check(order)
      expect(errCount).to.equal(2)
    })

    it('test erc20 check', async () => {
      const order = await createSignedOrder({}, signer)
      const [errCount] = await swap.check(order)
      expect(errCount).to.equal(4)
    })

    it('test erc20 check with allowances and balances setup', async () => {
      const order = await createSignedOrder({}, signer)
      await setUpAllowances(DEFAULT_AMOUNT, DEFAULT_SIGNER_AMOUNT)
      await setUpBalances(DEFAULT_AMOUNT, DEFAULT_SIGNER_AMOUNT)
      const [errCount] = await swap.check(order)
      expect(errCount).to.equal(0)
    })

    it('test check with used nonce', async () => {
      const order = await createSignedOrder(
        {
          nonce: '0',
        },
        signer
      )
      await setUpAllowances(DEFAULT_AMOUNT, DEFAULT_SIGNER_AMOUNT)
      await setUpBalances(DEFAULT_AMOUNT, DEFAULT_SIGNER_AMOUNT)
      await expect(swap.connect(sender).swap(order)).to.emit(swap, 'Swap')
      const [errCount] = await swap.check(order)
      expect(errCount).to.equal(1)
    })

    it('test check with bad signer', async () => {
      const order = await createSignedOrder(
        {
          signer: {
            wallet: ADDRESS_ZERO,
          },
        },
        signer
      )
      const [errCount] = await swap.check(order)
      expect(errCount).to.equal(5)
    })

    it('test check with bad expiry', async () => {
      const order = await createSignedOrder(
        {
          expiry: '0',
        },
        signer
      )
      const [errCount] = await swap.check(order)
      expect(errCount).to.equal(5)
    })

    it('test erc721 check', async () => {
      const order = await createSignedOrder(
        {
          signer: {
            kind: tokenKinds.ERC721,
          },
          sender: {
            kind: tokenKinds.ERC721,
          },
        },
        signer
      )
      const [errCount] = await swap.check(order)
      expect(errCount).to.equal(4)
    })

    it('test eip1155 check', async () => {
      const order = await createSignedOrder(
        {
          signer: {
            kind: tokenKinds.ERC1155,
          },
          sender: {
            kind: tokenKinds.ERC1155,
          },
        },
        signer
      )
      const [errCount] = await swap.check(order)
      expect(errCount).to.equal(4)
    })
  })

  describe('Test swap', async () => {
    it('test swap', async () => {
      const order = await createSignedOrder({}, signer)
      await expect(swap.connect(sender).swap(order)).to.emit(swap, 'Swap')
    })

    it('test public swap', async () => {
      const order = await createSignedOrder(
        {
          sender: {
            wallet: ADDRESS_ZERO,
          },
        },
        signer
      )
      await expect(swap.connect(sender).swap(order)).to.emit(swap, 'Swap')
    })

    it('test swap with affiliate', async () => {
      const order = await createSignedOrder(
        {
          affiliate: {
            wallet: affiliate.address,
            token: affiliateToken.address,
            kind: tokenKinds.ERC20,
            id: '0',
            amount: DEFAULT_AMOUNT,
          },
        },
        signer
      )
      await expect(swap.connect(sender).swap(order)).to.emit(swap, 'Swap')
    })

    it('test when nonce has already been used', async () => {
      const order = await createSignedOrder(
        {
          nonce: '0',
        },
        signer
      )
      await swap.connect(sender).swap(order)
      await expect(swap.connect(sender).swap(order)).to.be.revertedWith(
        'NONCE_ALREADY_USED'
      )
    })

    it('test when nonce has been cancelled', async () => {
      const order = await createSignedOrder(
        {
          nonce: '1',
        },
        signer
      )
      await swap.connect(signer).cancel([1])
      await expect(swap.connect(sender).swap(order)).to.be.revertedWith(
        'NONCE_ALREADY_USED'
      )
    })

    it('test when nonce has been cancelled up to', async () => {
      const order = await createSignedOrder(
        {
          nonce: '2',
        },
        signer
      )
      await swap.connect(signer).cancelUpTo(3)
      await expect(swap.connect(sender).swap(order)).to.be.revertedWith(
        'NONCE_TOO_LOW'
      )
    })
  })
})
