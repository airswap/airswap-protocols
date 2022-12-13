const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json')
const STAKING = require('@airswap/staking/build/contracts/Staking.sol/Staking.json')
const { createOrder, createOrderSignature } = require('@airswap/utils')
const { ADDRESS_ZERO, tokenKinds } = require('@airswap/constants')

const CHAIN_ID = 31337
const PROTOCOL_FEE = '30'
const HIGHER_FEE = '50'
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
      protocolFeeWallet.address
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

    describe('Test fee', async () => {
      it('test invalid protocolFeeWallet', async () => {
        await expect(
          (
            await ethers.getContractFactory('Swap')
          ).deploy(transferHandlerRegistry.address, PROTOCOL_FEE, ADDRESS_ZERO)
        ).to.be.revertedWith('INVALID_FEE_WALLET')
      })

      it('test invalid fee', async () => {
        await expect(
          (
            await ethers.getContractFactory('Swap')
          ).deploy(
            transferHandlerRegistry.address,
            100000000000,
            protocolFeeWallet.address
          )
        ).to.be.revertedWith('INVALID_FEE')
      })
    })
  })

  describe('Test setters', async () => {
    it('test setProtocolFee', async () => {
      await expect(swap.connect(deployer).setProtocolFee(PROTOCOL_FEE)).to.emit(
        swap,
        'SetProtocolFee'
      )
    })
    it('test protocolFeeWallet', async () => {
      await expect(
        swap.connect(deployer).setProtocolFeeWallet(protocolFeeWallet.address)
      ).to.emit(swap, 'SetProtocolFeeWallet')
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

  describe('Test fees', async () => {
    it('test changing fee wallet', async () => {
      await swap.connect(deployer).setProtocolFeeWallet(anyone.address)

      const storedFeeWallet = await swap.protocolFeeWallet()
      expect(storedFeeWallet).to.equal(anyone.address)
    })

    it('test only deployer can change fee wallet', async () => {
      await expect(
        swap.connect(anyone).setProtocolFeeWallet(anyone.address)
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('test invalid fee wallet', async () => {
      await expect(
        swap.connect(deployer).setProtocolFeeWallet(ADDRESS_ZERO)
      ).to.be.revertedWith('INVALID_FEE_WALLET')
    })

    it('test changing fee', async () => {
      await swap.connect(deployer).setProtocolFee(HIGHER_FEE)

      const storedSignerFee = await swap.protocolFee()
      expect(storedSignerFee).to.equal(HIGHER_FEE)
    })

    it('test only deployer can change fee', async () => {
      await expect(swap.connect(anyone).setProtocolFee('0')).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )
    })

    it('test zero fee', async () => {
      const order = await createSignedOrder(
        {
          protocolFee: '0',
        },
        signer
      )
      await swap.connect(deployer).setProtocolFee('0')
      await expect(swap.connect(sender).swap(order)).to.emit(swap, 'Swap')
    })

    it('test invalid fee', async () => {
      await expect(
        swap.connect(deployer).setProtocolFee(FEE_DIVISOR + 1)
      ).to.be.revertedWith('INVALID_FEE')
    })

    it('test when signed with incorrect fee', async () => {
      const order = await createSignedOrder(
        {
          protocolFee: HIGHER_FEE / 2,
        },
        signer
      )
      await expect(swap.connect(sender).swap(order)).to.be.revertedWith(
        'SIGNATURE_INVALID'
      )
    })
  })
})
