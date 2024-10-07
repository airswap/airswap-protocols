const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json')
const IERC721 = require('@openzeppelin/contracts/build/contracts/ERC721Royalty.json')
const REGISTRY = require('@airswap/registry/build/contracts/Registry.sol/Registry.json')
const SWAP = require('@airswap/swap/build/contracts/Swap.sol/Swap.json')
const SWAP_ERC20 = require('@airswap/swap-erc20/build/contracts/SwapERC20.sol/SwapERC20.json')
const ERC20_ADAPTER = require('@airswap/swap/build/contracts/adapters/ERC20Adapter.sol/ERC20Adapter.json')
const ERC721_ADAPTER = require('@airswap/swap/build/contracts/adapters/ERC721Adapter.sol/ERC721Adapter.json')
const {
  createOrder,
  createOrderSignature,
  createOrderERC20,
  createOrderERC20Signature,
  TokenKinds,
} = require('@airswap/utils')

const CHAIN_ID = 31337
const PROTOCOL_FEE = '30'
const PROTOCOL_FEE_LIGHT = '7'
const DEFAULT_AMOUNT = '1000'
const DEFAULT_BALANCE = '100000'
const BONUS_SCALE = '10'
const BONUS_MAX = '100'
const STAKING_COST = '1000000000'
const SUPPORT_COST = '1000000'

let snapshotId
let deployer
let signer
let sender
let erc20token
let erc20adapter
let erc721token
let erc721adapter
let registry
let swap
let swapERC20
let batchCall

async function signOrder(order, wallet, swapContract) {
  return {
    ...order,
    ...(await createOrderSignature(order, wallet, swapContract, CHAIN_ID)),
  }
}

async function createSignedOrder(params, signatory) {
  const unsignedOrder = createOrder({
    protocolFee: PROTOCOL_FEE,
    ...params,
    signer: {
      wallet: signer.address,
      token: erc20token.address,
      kind: TokenKinds.ERC20,
      id: '0',
      amount: DEFAULT_AMOUNT,
      ...params.signer,
    },
    sender: {
      wallet: sender.address,
      token: erc20token.address,
      kind: TokenKinds.ERC20,
      id: '0',
      amount: DEFAULT_AMOUNT,
      ...params.sender,
    },
  })
  return await signOrder(unsignedOrder, signatory, swap.address, CHAIN_ID)
}

async function createSignedOrderERC20(params, signatory) {
  const unsignedOrder = createOrderERC20({
    protocolFee: PROTOCOL_FEE,
    signerWallet: signer.address,
    signerToken: erc20token.address,
    signerAmount: DEFAULT_AMOUNT,
    senderWallet: sender.address,
    senderToken: erc20token.address,
    senderAmount: DEFAULT_AMOUNT,
    ...params,
  })
  return {
    ...unsignedOrder,
    ...(await createOrderERC20Signature(
      unsignedOrder,
      signatory,
      swapERC20.address,
      CHAIN_ID
    )),
  }
}

async function setUpAllowances(senderAmount, signerAmount) {
  await erc20token.mock.allowance
    .withArgs(sender.address, swap.address)
    .returns(senderAmount)
  await erc20token.mock.allowance
    .withArgs(signer.address, swap.address)
    .returns(signerAmount)

  await erc20token.mock.allowance
    .withArgs(sender.address, swapERC20.address)
    .returns(senderAmount)
  await erc20token.mock.allowance
    .withArgs(signer.address, swapERC20.address)
    .returns(signerAmount)
}

async function setUpBalances(senderAmount, signerAmount) {
  await erc20token.mock.balanceOf.withArgs(sender.address).returns(senderAmount)
  await erc20token.mock.balanceOf.withArgs(signer.address).returns(signerAmount)
  await erc20token.mock.balanceOf
    .withArgs(staker1.address)
    .returns(STAKING_COST)
  await erc20token.mock.balanceOf
    .withArgs(staker2.address)
    .returns(STAKING_COST)
  await erc20token.mock.balanceOf
    .withArgs(staker3.address)
    .returns(STAKING_COST)
}

describe('BatchCall Integration', () => {
  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot')
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  before('deploy adapter and swap', async () => {
    ;[
      deployer,
      sender,
      signer,
      affiliate,
      protocolFeeWallet,
      anyone,
      staker1,
      staker2,
      staker3,
    ] = await ethers.getSigners()
    erc20token = await deployMockContract(deployer, IERC20.abi)
    await erc20token.mock.allowance.returns(DEFAULT_AMOUNT)
    await erc20token.mock.balanceOf.returns(DEFAULT_AMOUNT)
    await erc20token.mock.transferFrom.returns(true)
    erc20adapter = await (
      await ethers.getContractFactory(ERC20_ADAPTER.abi, ERC20_ADAPTER.bytecode)
    ).deploy()
    await erc20adapter.deployed()

    erc721token = await deployMockContract(deployer, IERC721.abi)
    await erc721token.mock.isApprovedForAll.returns(true)
    await erc721token.mock.ownerOf.returns(sender.address)
    await erc721token.mock[
      'safeTransferFrom(address,address,uint256)'
    ].returns()
    erc721adapter = await (
      await ethers.getContractFactory(
        ERC721_ADAPTER.abi,
        ERC721_ADAPTER.bytecode
      )
    ).deploy()
    await erc721adapter.deployed()

    registry = await (
      await ethers.getContractFactory(REGISTRY.abi, REGISTRY.bytecode)
    ).deploy(erc20token.address, STAKING_COST, SUPPORT_COST)
    await registry.deployed()

    swap = await (
      await ethers.getContractFactory(SWAP.abi, SWAP.bytecode)
    ).deploy(
      [erc20adapter.address, erc721adapter.address],
      TokenKinds.ERC20,
      PROTOCOL_FEE,
      protocolFeeWallet.address
    )
    await swap.deployed()

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

    batchCall = await (await ethers.getContractFactory('BatchCall')).deploy()
    await batchCall.deployed()
  })

  describe('checks order validity', () => {
    it('valid orders are marked valid', async () => {
      await setUpAllowances(DEFAULT_BALANCE, DEFAULT_BALANCE)
      await setUpBalances(DEFAULT_BALANCE, DEFAULT_BALANCE)
      const orders = [
        await createSignedOrder({}, signer),
        await createSignedOrder({}, signer),
        await createSignedOrder({}, signer),
      ]
      const orderValidities = await batchCall
        .connect(sender)
        .getOrdersValid(sender.address, orders, swap.address)
      expect(orderValidities.toString()).to.equal([true, true, true].toString())
    })

    it('valid orders ERC20 are marked valid', async () => {
      await setUpAllowances(DEFAULT_BALANCE, DEFAULT_BALANCE)
      await setUpBalances(DEFAULT_BALANCE, DEFAULT_BALANCE)
      const ERC20orders = [
        await createSignedOrderERC20({}, signer),
        await createSignedOrderERC20({}, signer),
        await createSignedOrderERC20({}, signer),
      ]
      const orderValidities = await batchCall
        .connect(sender)
        .getOrdersValidERC20(sender.address, ERC20orders, swapERC20.address)
      expect(orderValidities.toString()).to.equal([true, true, true].toString())
    })

    it('invalid orders are marked invalid', async () => {
      await setUpAllowances(0, 0)
      await setUpBalances(0, 0)
      const orders = [
        await createSignedOrder({}, signer),
        await createSignedOrder({}, signer),
        await createSignedOrder({}, signer),
      ]
      const orderValidities = await batchCall
        .connect(sender)
        .getOrdersValid(sender.address, orders, swap.address)
      expect(orderValidities.toString()).to.equal(
        [false, false, false].toString()
      )
    })

    it('invalid orders ERC20 are marked invalid', async () => {
      await setUpAllowances(0, 0)
      await setUpBalances(0, 0)
      const ERC20orders = [
        await createSignedOrderERC20({}, signer),
        await createSignedOrderERC20({}, signer),
        await createSignedOrderERC20({}, signer),
      ]
      const orderValidities = await batchCall
        .connect(sender)
        .getOrdersValidERC20(sender.address, ERC20orders, swapERC20.address)
      expect(orderValidities.toString()).to.equal(
        [false, false, false].toString()
      )
    })
  })

  describe('checks nonce validity', () => {
    it('unused nonce are marked unused', async () => {
      await setUpAllowances(DEFAULT_BALANCE, DEFAULT_BALANCE)
      await setUpBalances(DEFAULT_BALANCE, DEFAULT_BALANCE)
      const orders = [
        await createSignedOrder({}, signer),
        await createSignedOrder({}, signer),
        await createSignedOrder({}, signer),
      ]
      const orderValidities = await batchCall
        .connect(sender)
        .getNoncesUsed(
          [signer.address, signer.address, signer.address],
          [orders[0].nonce, orders[1].nonce, orders[2].nonce],
          swap.address
        )
      expect(orderValidities.toString()).to.equal(
        [false, false, false].toString()
      )
    })

    it('unused nonce ERC20 are marked unused', async () => {
      await setUpAllowances(DEFAULT_BALANCE, DEFAULT_BALANCE)
      await setUpBalances(DEFAULT_BALANCE, DEFAULT_BALANCE)
      const ERC20orders = [
        await createSignedOrderERC20({}, signer),
        await createSignedOrderERC20({}, signer),
        await createSignedOrderERC20({}, signer),
      ]
      const orderValidities = await batchCall
        .connect(sender)
        .getNoncesUsed(
          [signer.address, signer.address, signer.address],
          [ERC20orders[0].nonce, ERC20orders[1].nonce, ERC20orders[2].nonce],
          swapERC20.address
        )
      expect(orderValidities.toString()).to.equal(
        [false, false, false].toString()
      )
    })

    it('used nonces are marked as used', async () => {
      const usedNonce = 0
      const unusedNonce = 1
      const order = await createSignedOrder(
        {
          nonce: usedNonce,
        },
        signer
      )
      await swap.connect(sender).swap(sender.address, 0, order)
      const orderValidities = await batchCall
        .connect(sender)
        .getNoncesUsed(
          [signer.address, signer.address, signer.address],
          [usedNonce, usedNonce, unusedNonce],
          swap.address
        )
      expect(orderValidities.toString()).to.equal(
        [true, true, false].toString()
      )
    })

    it('used nonces ERC20 are marked used', async () => {
      const usedNonce = 0
      const unusedNonce = 1
      const ERC20order = await createSignedOrderERC20(
        {
          nonce: usedNonce,
        },
        signer
      )
      await swapERC20
        .connect(sender)
        .swap(
          sender.address,
          ERC20order.nonce,
          ERC20order.expiry,
          ERC20order.signerWallet,
          ERC20order.signerToken,
          ERC20order.signerAmount,
          ERC20order.senderToken,
          ERC20order.senderAmount,
          ERC20order.v,
          ERC20order.r,
          ERC20order.s
        )
      const orderValidities = await batchCall
        .connect(sender)
        .getNoncesUsed(
          [signer.address, signer.address, signer.address],
          [usedNonce, usedNonce, unusedNonce],
          swapERC20.address
        )
      expect(orderValidities.toString()).to.equal(
        [true, true, false].toString()
      )
    })
  })

  describe('returns tokensSupported for mutiple stakers', () => {
    it('returns all tokens supported by multiple stakers', async () => {
      const tokensSupported = []
      for (let i = 0; i < 10; i++) {
        tokensSupported[i] = await deployMockContract(deployer, IERC20.abi)
      }
      registry
        .connect(staker1)
        .addTokens([
          tokensSupported[0].address,
          tokensSupported[1].address,
          tokensSupported[2].address,
        ])
      registry
        .connect(staker2)
        .addTokens([
          tokensSupported[3].address,
          tokensSupported[4].address,
          tokensSupported[5].address,
        ])
      registry
        .connect(staker3)
        .addTokens([
          tokensSupported[6].address,
          tokensSupported[7].address,
          tokensSupported[8].address,
          tokensSupported[9].address,
        ])
      const expectedTokensSupported = await batchCall
        .connect(deployer)
        .getTokensForStakers(
          [staker1.address, staker2.address, staker3.address],
          registry.address
        )
      expect(expectedTokensSupported.toString()).to.equal(
        [
          [
            tokensSupported[0].address,
            tokensSupported[1].address,
            tokensSupported[2].address,
          ],
          [
            tokensSupported[3].address,
            tokensSupported[4].address,
            tokensSupported[5].address,
          ],
          [
            tokensSupported[6].address,
            tokensSupported[7].address,
            tokensSupported[8].address,
            tokensSupported[9].address,
          ],
        ].toString()
      )
    })

    it('reverts if a wrong argument is passed', async () => {
      await expect(
        batchCall.getTokensForStakers([], registry.address)
      ).to.be.revertedWith('ArgumentInvalid')
    })
  })
})
