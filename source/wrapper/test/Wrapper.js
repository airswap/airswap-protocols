const { expect } = require('chai')
const {
  createOrderERC20,
  orderERC20ToParams,
  createOrderERC20Signature,
  ADDRESS_ZERO,
} = require('@airswap/utils')
const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle

const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json')
const IWETH = require('../build/contracts/interfaces/IWETH.sol/IWETH.json')
const SWAP_ERC20 = require('@airswap/swap-erc20/build/contracts/SwapERC20.sol/SwapERC20.json')

describe('Wrapper Unit Tests', () => {
  let snapshotId
  let swapERC20
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
  const BONUS_SCALE = '10'
  const BONUS_MAX = '100'

  async function createSignedOrderERC20(params, signer) {
    const unsignedOrder = createOrderERC20({
      protocolFee: PROTOCOL_FEE,
      signerWallet: signer.address,
      signerToken: signerToken.address,
      signerAmount: DEFAULT_AMOUNT,
      senderWallet: sender.address,
      senderToken: senderToken.address,
      senderAmount: DEFAULT_AMOUNT,
      ...params,
    })
    return orderERC20ToParams({
      ...unsignedOrder,
      ...(await createOrderERC20Signature(
        unsignedOrder,
        signer,
        swapERC20.address,
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
    ;[deployer, sender, signer, protocolFeeWallet, anyone] =
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

    swapERC20 = await (
      await ethers.getContractFactory(SWAP_ERC20.abi, SWAP_ERC20.bytecode)
    ).deploy(
      PROTOCOL_FEE,
      PROTOCOL_FEE_LIGHT,
      protocolFeeWallet.address,
      BONUS_SCALE,
      BONUS_MAX
    )
    await swapERC20.deployed()

    wrapper = await (
      await ethers.getContractFactory('Wrapper')
    ).deploy(swapERC20.address, wethToken.address)
    await wrapper.deployed()
  })

  describe('revert deploy', async () => {
    it('test deploy fails when swap-erc20 contract address is zero address', async () => {
      await expect(
        (
          await ethers.getContractFactory('Wrapper')
        ).deploy(ADDRESS_ZERO, wethToken.address)
      ).to.be.revertedWith('INVALID_SWAP_ERC20_CONTRACT')
    })

    it('test deploy fails when weth contract address is zero address', async () => {
      await expect(
        (
          await ethers.getContractFactory('Wrapper')
        ).deploy(swapERC20.address, ADDRESS_ZERO)
      ).to.be.revertedWith('INVALID_WETH_CONTRACT')
    })
  })

  describe('Test swap config', async () => {
    it('test changing swap-erc20 contract by non-owner', async () => {
      await expect(
        wrapper.connect(sender).setSwapERC20Contract(swapERC20.address)
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })
    it('test changing swap-erc20 contract', async () => {
      await wrapper.connect(deployer).setSwapERC20Contract(anyone.address)
      const storedSwapContract = await wrapper.swapERC20Contract()
      expect(await storedSwapContract).to.equal(anyone.address)
    })

    it('test changing swap-erc20 contract fails when set to zero address', async () => {
      await expect(
        wrapper.connect(deployer).setSwapERC20Contract(ADDRESS_ZERO)
      ).to.be.revertedWith('INVALID_SWAP_ERC20_CONTRACT')
    })
  })

  describe('Test swap-erc20 wraps', async () => {
    it('test swap fails with value', async () => {
      const order = await createSignedOrderERC20(
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
      const order = await createSignedOrderERC20(
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
      const order = await createSignedOrderERC20(
        {
          senderWallet: wrapper.address,
        },
        signer
      )
      await wrapper.connect(sender).swap(...order)
    })
    it('test wrapped swap', async () => {
      const order = await createSignedOrderERC20(
        {
          senderToken: wethToken.address,
          senderWallet: wrapper.address,
        },
        signer
      )
      await wrapper.connect(sender).swap(...order, { value: DEFAULT_AMOUNT })
    })
    it('test wrapped swapAnySender', async () => {
      const order = await createSignedOrderERC20(
        {
          senderToken: wethToken.address,
          senderWallet: ADDRESS_ZERO,
        },
        signer
      )
      await wrapper
        .connect(sender)
        .swapAnySender(...order, { value: DEFAULT_AMOUNT })
    })
    it('test that unwrap fails', async () => {
      const order = await createSignedOrderERC20(
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
})
