const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json')
const STAKING = require('@airswap/staking/build/contracts/Staking.sol/Staking.json')
const { createOrder, createOrderSignature } = require('@airswap/utils')
const { tokenKinds } = require('@airswap/constants')

const CHAIN_ID = 31337
const PROTOCOL_FEE = '30'
const REBATE_SCALE = '10'
const REBATE_MAX = '100'
const FEE_DIVISOR = '10000'
const DEFAULT_AMOUNT = '1000'

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
  let staking

  let transferHandlerRegistry
  let erc20Handler

  let deployer
  let signer
  let sender

  async function createSignedOrder(params, signatory) {
    const unsignedOrder = createOrder({
      protocolFee: PROTOCOL_FEE,
      signer: {
        wallet: signer.address,
        token: signerToken.address,
        kind: tokenKinds.ERC20,
        id: '0',
        amount: DEFAULT_AMOUNT,
      },
      sender: {
        wallet: sender.address,
        token: senderToken.address,
        kind: tokenKinds.ERC20,
        id: '0',
        amount: DEFAULT_AMOUNT,
      },
      ...params,
    })
    return await signOrder(unsignedOrder, signatory, swap.address, CHAIN_ID)
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
    staking = await deployMockContract(deployer, STAKING.abi)

    await signerToken.mock.transferFrom.returns(true)
    await senderToken.mock.transferFrom.returns(true)

    transferHandlerRegistry = await (
      await ethers.getContractFactory('TransferHandlerRegistry')
    ).deploy()
    await transferHandlerRegistry.deployed()

    erc20Handler = await (
      await ethers.getContractFactory('ERC20TransferHandler')
    ).deploy()
    await erc20Handler.deployed()

    await transferHandlerRegistry.addTransferHandler(
      tokenKinds.ERC20,
      erc20Handler.address
    )

    await staking.mock.balanceOf.returns(10000000)

    swap = await (
      await ethers.getContractFactory('Swap')
    ).deploy(
      transferHandlerRegistry.address,
      PROTOCOL_FEE,
      protocolFeeWallet.address,
      REBATE_SCALE,
      REBATE_MAX,
      staking.address
    )
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

  describe('Test swap', async () => {
    it('test swaps', async () => {
      const order = await createSignedOrder({}, signer)
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
