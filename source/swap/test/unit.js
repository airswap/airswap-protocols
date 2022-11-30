const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json')
const { createOrder, createOrderSignature } = require('@airswap/utils')
const { tokenKinds } = require('@airswap/constants')

const CHAIN_ID = 31337

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

  let transferHandlerRegistry
  let erc20Handler

  let deployer
  let sender
  let signer

  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot')
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  before('get signers and deploy', async () => {
    ;[deployer, sender, signer, protocolFeeWallet, anyone] =
      await ethers.getSigners()

    signerToken = await deployMockContract(deployer, IERC20.abi)
    senderToken = await deployMockContract(deployer, IERC20.abi)

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

    swap = await (
      await ethers.getContractFactory('Swap')
    ).deploy(transferHandlerRegistry.address)
    await swap.deployed()
  })

  describe('Constructor', async () => {
    describe('Test signatures', async () => {
      it('test signatures', async () => {
        let unsignedOrder = createOrder({
          protocolFee: '30',
          signer: {
            wallet: signer.address,
          },
        })
        let order = await signOrder(unsignedOrder, signer, swap.address)
        await expect(swap.connect(sender).swap(order)).to.be.revertedWith(
          'TRANSFER_FAILED'
        )
      })
    })
  })
})
