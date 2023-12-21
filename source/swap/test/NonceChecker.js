const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json')
const IERC721 = require('@openzeppelin/contracts/build/contracts/ERC721Royalty.json')
const { createOrder, createOrderSignature } = require('@airswap/utils')
const { TokenKinds } = require('@airswap/constants')

const CHAIN_ID = 31337
const PROTOCOL_FEE = '30'
const DEFAULT_AMOUNT = '1000'
const MAX_ROYALTY = '10'

let snapshotId
let deployer
let signer
let sender
let erc20token
let erc20adapter
let erc721token
let erc721adapter
let swap
let nonceChecker

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

describe('Check Nonces', () => {
  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot')
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  before('deploy adapter and swap', async () => {
    ;[deployer, sender, signer, affiliate, protocolFeeWallet, anyone] =
      await ethers.getSigners()
    erc20token = await deployMockContract(deployer, IERC20.abi)
    await erc20token.mock.allowance.returns(DEFAULT_AMOUNT)
    await erc20token.mock.balanceOf.returns(DEFAULT_AMOUNT)
    await erc20token.mock.transferFrom.returns(true)
    erc20adapter = await (
      await ethers.getContractFactory('ERC20Adapter')
    ).deploy()
    await erc20adapter.deployed()
    erc721token = await deployMockContract(deployer, IERC721.abi)
    await erc721token.mock.isApprovedForAll.returns(true)
    await erc721token.mock.ownerOf.returns(sender.address)
    await erc721token.mock[
      'safeTransferFrom(address,address,uint256)'
    ].returns()
    erc721adapter = await (
      await ethers.getContractFactory('ERC721Adapter')
    ).deploy()
    await erc721adapter.deployed()
    swap = await (
      await ethers.getContractFactory('Swap')
    ).deploy(
      [erc20adapter.address, erc721adapter.address],
      TokenKinds.ERC20,
      PROTOCOL_FEE,
      protocolFeeWallet.address
    )
    await swap.deployed()
    nonceChecker = await (
      await ethers.getContractFactory('OrderChecker')
    ).deploy(swap.address)
    await nonceChecker.deployed()
  })

  describe('checks nonce validity', () => {
    it('a nonce is not used before a swap is executed', async () => {
      const order = await createSignedOrder({}, signer)
      const nonceValidities = await nonceChecker
        .connect(sender)
        .getNonceUsed([order])
      expect(nonceValidities.toString()).to.be.equal([false].toString())
    })

    it('a nonce is  used after a swap is executed', async () => {
      const order = await createSignedOrder({}, signer)
      swap.connect(sender).swap(sender.address, MAX_ROYALTY, order)
      const nonceValidities = await nonceChecker
        .connect(sender)
        .getNonceUsed([order])
      expect(nonceValidities.toString()).to.be.equal([true].toString())
    })

    it('Nonces validity can be checked in batch', async () => {
      const orders = [
        await createSignedOrder({ nonce: '0' }, signer),
        await createSignedOrder({ nonce: '1' }, signer),
        await createSignedOrder({ nonce: '2' }, signer),
        await createSignedOrder({ nonce: '3' }, signer),
        await createSignedOrder({ nonce: '4' }, signer),
      ]
      swap.connect(sender).swap(sender.address, MAX_ROYALTY, orders[1])
      swap.connect(sender).swap(sender.address, MAX_ROYALTY, orders[3])
      swap.connect(sender).swap(sender.address, MAX_ROYALTY, orders[5])
      const nonceValidities = await nonceChecker
        .connect(sender)
        .getNonceUsed(orders)
      expect(nonceValidities.toString()).to.be.equal(
        [false, true, false, true, false].toString()
      )
    })
  })
})
