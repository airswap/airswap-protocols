const { expect } = require('chai')
const {
  createOrder,
  orderToParams,
  createSwapSignature,
} = require('@airswap/utils')
const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const { ADDRESS_ZERO } = require('@airswap/constants')

const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json')
const IERC721 = require('@openzeppelin/contracts/build/contracts/IERC721.json')
const IWETH = require('../build/contracts/interfaces/IWETH.sol/IWETH.json')
const LIGHT = require('@airswap/swap/build/contracts/Swap.sol/Swap.json')

describe('Wrapper Unit Tests', () => {
  let snapshotId
  let swap
  let wrapper

  let wethToken
  let signerToken
  let senderToken
  let stakingToken

  let deployer
  let sender
  let signer
  let protocolFeeWallet

  const CHAIN_ID = 31337
  const PROTOCOL_FEE = '30'
  const PROTOCOL_FEE_LIGHT = '7'
  const DEFAULT_AMOUNT = '10000'
  const REBATE_SCALE = '10'
  const REBATE_MAX = '100'

  async function createSignedOrder(params, signer) {
    const unsignedOrder = createOrder({
      protocolFee: PROTOCOL_FEE,
      signerWallet: signer.address,
      signerToken: signerToken.address,
      signerAmount: DEFAULT_AMOUNT,
      senderWallet: sender.address,
      senderToken: senderToken.address,
      senderAmount: DEFAULT_AMOUNT,
      ...params,
    })
    return orderToParams({
      ...unsignedOrder,
      ...(await createSwapSignature(
        unsignedOrder,
        signer,
        swap.address,
        CHAIN_ID
      )),
    })
  }

  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot')
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  before('get signers and deploy', async () => {
    ;[deployer, sender, signer, protocolFeeWallet, newSwap] =
      await ethers.getSigners()

    signerToken = await deployMockContract(deployer, IERC20.abi)
    senderToken = await deployMockContract(deployer, IERC20.abi)
    stakingToken = await deployMockContract(deployer, IERC20.abi)

    await senderToken.mock.approve.returns(true)
    await senderToken.mock.allowance.returns('0')
    await senderToken.mock.transferFrom.returns(true)

    await signerToken.mock.transferFrom.returns(true)
    await signerToken.mock.transfer.returns(true)

    await stakingToken.mock.balanceOf.returns('0')

    wethToken = await deployMockContract(deployer, IWETH.abi)
    await wethToken.mock.approve.returns(true)
    await wethToken.mock.deposit.returns()
    await wethToken.mock.withdraw.returns()
    await wethToken.mock.transferFrom.returns(true)

    swap = await (
      await ethers.getContractFactory(LIGHT.abi, LIGHT.bytecode)
    ).deploy(
      PROTOCOL_FEE,
      PROTOCOL_FEE_LIGHT,
      protocolFeeWallet.address,
      REBATE_SCALE,
      REBATE_MAX,
      stakingToken.address
    )
    await swap.deployed()

    wrapper = await (
      await ethers.getContractFactory('Wrapper')
    ).deploy(swap.address, wethToken.address)
    await wrapper.deployed()
  })

  describe('revert deploy', async () => {
    it('test deploy fails when swap contract address is zero address', async () => {
      await expect(
        (
          await ethers.getContractFactory('Wrapper')
        ).deploy(ADDRESS_ZERO, wethToken.address)
      ).to.be.revertedWith('INVALID_CONTRACT')
    })

    it('test deploy fails when weth contract address is zero address', async () => {
      await expect(
        (
          await ethers.getContractFactory('Wrapper')
        ).deploy(swap.address, ADDRESS_ZERO)
      ).to.be.revertedWith('INVALID_WETH_CONTRACT')
    })
  })

  describe('Test swap config', async () => {
    it('test changing swap contract by non-owner', async () => {
      await expect(
        wrapper.connect(sender).setSwapContract(swap.address)
      ).to.be.revertedWith('owner')
    })
    it('test changing swap contract', async () => {
      await wrapper.connect(deployer).setSwapContract(newSwap.address)

      const storedSwapContract = await wrapper.swapContract()
      expect(await storedSwapContract).to.equal(newSwap.address)
    })

    it('test changing swap contract fails when set to zero address', async () => {
      await expect(
        wrapper.connect(deployer).setSwapContract(ADDRESS_ZERO)
      ).to.be.revertedWith('INVALID_CONTRACT')
    })
  })

  describe('Test wraps', async () => {
    it('test swap fails with value', async () => {
      const order = await createSignedOrder(
        {
          senderWallet: wrapper.address,
        },
        signer
      )
      await expect(
        wrapper.connect(sender).swap(...order, { value: DEFAULT_AMOUNT })
      ).to.be.revertedWith('VALUE_MUST_BE_ZERO')
    })
    it('test wrapped swap fails without value', async () => {
      const order = await createSignedOrder(
        {
          senderToken: wethToken.address,
        },
        signer
      )
      await expect(wrapper.connect(sender).swap(...order)).to.be.revertedWith(
        'VALUE_MUST_BE_SENT'
      )
    })
    it('test swap', async () => {
      const order = await createSignedOrder(
        {
          senderWallet: wrapper.address,
        },
        signer
      )
      await wrapper.connect(sender).swap(...order)
    })
    it('test wrapped swap', async () => {
      const order = await createSignedOrder(
        {
          senderToken: wethToken.address,
          senderWallet: wrapper.address,
        },
        signer
      )
      await wrapper.connect(sender).swap(...order, { value: DEFAULT_AMOUNT })
    })
    it('test that unwrap fails', async () => {
      const order = await createSignedOrder(
        {
          signerToken: wethToken.address,
          senderWallet: wrapper.address,
          senderAmount: DEFAULT_AMOUNT,
        },
        signer
      )

      await expect(wrapper.connect(sender).swap(...order)).to.be.revertedWith(
        'ETH_RETURN_FAILED'
      )
    })
    it('Test fallback function revert', async () => {
      await expect(
        deployer.sendTransaction({
          to: wrapper.address,
          value: 1,
        })
      ).to.be.revertedWith('DO_NOT_SEND_ETHER')
    })
  })
  describe('Test NFT wrapped swaps', async () => {
    before(async () => {
      signerNFT = await deployMockContract(deployer, IERC721.abi)
      senderNFT = await deployMockContract(deployer, IERC721.abi)
      await signerNFT.mock.transferFrom.returns()
      await signerNFT.mock.setApprovalForAll.returns()
      await senderNFT.mock.transferFrom.returns()
      await senderNFT.mock.setApprovalForAll.returns()
    })
    it('test wrapped buyNFT', async () => {
      const order = await createSignedOrder(
        {
          signerToken: signerNFT.address,
          signerAmount: '123',
          senderToken: wethToken.address,
          senderWallet: wrapper.address,
        },
        signer
      )
      const totalValue = (
        parseFloat(DEFAULT_AMOUNT) + parseFloat(PROTOCOL_FEE)
      ).toString()
      await wrapper.connect(sender).buyNFT(...order, { value: totalValue })
    })
    it('test wrapped buyNFT fails without value', async () => {
      const order = await createSignedOrder(
        {
          signerToken: signerNFT.address,
          signerAmount: '123',
          senderToken: wethToken.address,
          senderWallet: wrapper.address,
        },
        signer
      )
      await expect(wrapper.connect(sender).buyNFT(...order)).to.be.revertedWith(
        'VALUE_MUST_BE_SENT'
      )
    })
    it('test wrapped sellNFT', async () => {
      const order = await createSignedOrder(
        {
          senderWallet: wrapper.address,
          senderToken: senderNFT.address,
          senderAmount: '123',
        },
        signer
      )
      await wrapper.connect(sender).sellNFT(...order)
    })
    it('test wrapped sellNFT fails with value', async () => {
      const order = await createSignedOrder(
        {
          senderWallet: wrapper.address,
          senderToken: senderNFT.address,
          senderAmount: '123',
        },
        signer
      )
      await expect(
        wrapper.connect(sender).sellNFT(...order, { value: DEFAULT_AMOUNT })
      ).to.be.reverted
    })
  })
})
