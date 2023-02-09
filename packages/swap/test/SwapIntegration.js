const { expect } = require('chai')
const { ethers } = require('hardhat')
const { createOrder, createOrderSignature } = require('@airswap/utils')
const { tokenKinds } = require('@airswap/constants')
const FungibleToken = require('@airswap/tokens/build/contracts/FungibleToken.json')
const NonFungibleToken = require('@airswap/tokens/build/contracts/NonFungibleToken.json')

const CHAIN_ID = 31337
const PROTOCOL_FEE = '30'
const DEFAULT_AMOUNT = '1000'

let snapshotId
let deployer
let signer
let sender
let erc20token
let erc20adapter
let erc721token
let erc721adapter
let swap

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
      kind: tokenKinds.ERC20,
      id: '0',
      amount: DEFAULT_AMOUNT,
      ...params.signer,
    },
    sender: {
      wallet: sender.address,
      token: erc20token.address,
      kind: tokenKinds.ERC20,
      id: '0',
      amount: DEFAULT_AMOUNT,
      ...params.sender,
    },
  })
  return await signOrder(unsignedOrder, signatory, swap.address, CHAIN_ID)
}

describe('Swap Integration', () => {
  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot')
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  before('deploy adapter and swap', async () => {
    ;[deployer, sender, signer, affiliate, protocolFeeWallet, anyone] =
      await ethers.getSigners()

    erc20token = await (
      await ethers.getContractFactory(FungibleToken.abi, FungibleToken.bytecode)
    ).deploy()
    await erc20token.deployed()

    erc721token = await (
      await ethers.getContractFactory(
        NonFungibleToken.abi,
        NonFungibleToken.bytecode
      )
    ).deploy()
    await erc721token.deployed()

    erc20adapter = await (
      await ethers.getContractFactory('ERC20Adapter')
    ).deploy()
    await erc20adapter.deployed()

    erc721adapter = await (
      await ethers.getContractFactory('ERC721Adapter')
    ).deploy()
    await erc721adapter.deployed()

    swap = await (
      await ethers.getContractFactory('Swap')
    ).deploy(
      [erc20adapter.address, erc721adapter.address],
      tokenKinds.ERC20,
      PROTOCOL_FEE,
      protocolFeeWallet.address
    )
    await swap.deployed()
  })

  describe('swaps', () => {
    it('swaps an ERC721 for an ERC20', async () => {
      await erc721token.connect(deployer).mint(signer.address, '1')
      await erc721token.connect(signer).setApprovalForAll(swap.address, true)
      await erc20token.connect(deployer).mint(sender.address, DEFAULT_AMOUNT)
      await erc20token.connect(sender).approve(swap.address, DEFAULT_AMOUNT)
      const order = await createSignedOrder(
        {
          signer: {
            wallet: signer.address,
            token: erc721token.address,
            kind: tokenKinds.ERC721,
            amount: '0',
            id: '1',
          },
          sender: {
            wallet: sender.address,
            token: erc20token.address,
            kind: tokenKinds.ERC20,
            amount: '1',
            id: '0',
          },
        },
        signer
      )
      expect(await erc721token.ownerOf('1')).to.be.equal(signer.address)
      await expect(swap.connect(sender).swap(sender.address, order)).to.emit(
        swap,
        'Swap'
      )
      expect(await erc721token.ownerOf('1')).to.be.equal(sender.address)
    })
  })
})
