const { expect } = require('chai')
const { ethers } = require('hardhat')
const {
  createOrder,
  createOrderSignature,
  TokenKinds,
  ADDRESS_ZERO,
} = require('@airswap/utils')
const ERC20PresetMinterPauser = require('@openzeppelin/contracts/build/contracts/ERC20PresetMinterPauser.json')
const ERC1155PresetMinterPauser = require('@openzeppelin/contracts/build/contracts/ERC1155PresetMinterPauser.json')

const CHAIN_ID = 31337
const PROTOCOL_FEE = '30'
const DEFAULT_AMOUNT = '100000'
const MAX_ROYALTY = '10'
const ROYALTY_DENOMINATOR = '10000'

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
      await ethers.getContractFactory(
        ERC20PresetMinterPauser.abi,
        ERC20PresetMinterPauser.bytecode
      )
    ).deploy('Test 1', 'T1')
    await erc20token.deployed()

    erc20token2 = await (
      await ethers.getContractFactory(
        ERC20PresetMinterPauser.abi,
        ERC20PresetMinterPauser.bytecode
      )
    ).deploy('Test 2', 'T2')
    await erc20token2.deployed()

    erc1155token = await (
      await ethers.getContractFactory(
        ERC1155PresetMinterPauser.abi,
        ERC1155PresetMinterPauser.bytecode
      )
    ).deploy('Test 4')
    await erc1155token.deployed()

    erc721token = await (
      await ethers.getContractFactory('ERC721Royalty')
    ).deploy()
    await erc721token.deployed()

    erc20adapter = await (
      await ethers.getContractFactory('ERC20Adapter')
    ).deploy()
    await erc20adapter.deployed()

    erc1155adapter = await (
      await ethers.getContractFactory('ERC1155Adapter')
    ).deploy()
    await erc1155adapter.deployed()

    erc721adapter = await (
      await ethers.getContractFactory('ERC721Adapter')
    ).deploy()
    await erc721adapter.deployed()

    swap = await (
      await ethers.getContractFactory('Swap')
    ).deploy(
      [erc20adapter.address, erc721adapter.address, erc1155adapter.address],
      TokenKinds.ERC20,
      PROTOCOL_FEE,
      protocolFeeWallet.address
    )
    await swap.deployed()
  })

  describe('swaps', () => {
    it('swap ERC20 for ERC20 succeeds', async () => {
      await erc20token.connect(deployer).mint(signer.address, DEFAULT_AMOUNT)
      await erc20token.connect(signer).approve(swap.address, DEFAULT_AMOUNT)
      await erc20token2.connect(deployer).mint(sender.address, DEFAULT_AMOUNT)
      await erc20token2.connect(sender).approve(swap.address, DEFAULT_AMOUNT)
      const order = await createSignedOrder(
        {
          signer: {
            wallet: signer.address,
            token: erc20token.address,
            kind: TokenKinds.ERC20,
            amount: '10000',
            id: '0',
          },
          sender: {
            wallet: sender.address,
            token: erc20token2.address,
            kind: TokenKinds.ERC20,
            amount: '10000',
            id: '0',
          },
        },
        signer
      )
      expect(await erc20token.balanceOf(signer.address)).to.be.equal(
        DEFAULT_AMOUNT
      )
      expect(await erc20token2.balanceOf(sender.address)).to.be.equal(
        DEFAULT_AMOUNT
      )
      expect(await erc20token.balanceOf(sender.address)).to.be.equal('0')
      expect(await erc20token2.balanceOf(signer.address)).to.be.equal('0')

      await expect(
        swap.connect(sender).swap(sender.address, MAX_ROYALTY, order)
      ).to.emit(swap, 'Swap')

      expect(await erc20token.balanceOf(signer.address)).to.be.equal(
        DEFAULT_AMOUNT - order.signer.amount
      )
      expect(await erc20token2.balanceOf(sender.address)).to.be.equal(
        DEFAULT_AMOUNT - order.sender.amount - PROTOCOL_FEE
      )
      expect(await erc20token.balanceOf(sender.address)).to.be.equal(
        order.signer.amount
      )
      expect(await erc20token2.balanceOf(signer.address)).to.be.equal(
        order.sender.amount
      )
    })

    it('public swap ERC20 for ERC20 succeeds', async () => {
      await erc20token.connect(deployer).mint(signer.address, DEFAULT_AMOUNT)
      await erc20token.connect(signer).approve(swap.address, DEFAULT_AMOUNT)
      await erc20token2.connect(deployer).mint(sender.address, DEFAULT_AMOUNT)
      await erc20token2.connect(sender).approve(swap.address, DEFAULT_AMOUNT)
      const order = await createSignedOrder(
        {
          signer: {
            wallet: signer.address,
            token: erc20token.address,
            kind: TokenKinds.ERC20,
            amount: '10000',
            id: '0',
          },
          sender: {
            wallet: ADDRESS_ZERO,
            token: erc20token2.address,
            kind: TokenKinds.ERC20,
            amount: '10000',
            id: '0',
          },
        },
        signer
      )
      expect(await erc20token.balanceOf(signer.address)).to.be.equal(
        DEFAULT_AMOUNT
      )
      expect(await erc20token2.balanceOf(sender.address)).to.be.equal(
        DEFAULT_AMOUNT
      )
      expect(await erc20token.balanceOf(sender.address)).to.be.equal('0')
      expect(await erc20token2.balanceOf(signer.address)).to.be.equal('0')

      await expect(
        swap.connect(sender).swap(sender.address, MAX_ROYALTY, order)
      ).to.emit(swap, 'Swap')

      expect(await erc20token.balanceOf(signer.address)).to.be.equal(
        DEFAULT_AMOUNT - order.signer.amount
      )
      expect(await erc20token2.balanceOf(sender.address)).to.be.equal(
        DEFAULT_AMOUNT - order.sender.amount - PROTOCOL_FEE
      )
      expect(await erc20token.balanceOf(sender.address)).to.be.equal(
        order.signer.amount
      )
      expect(await erc20token2.balanceOf(signer.address)).to.be.equal(
        order.sender.amount
      )
    })

    it('swap ERC721 for ERC20 succeeds', async () => {
      await erc721token.connect(deployer).mint(signer.address)
      await erc721token.connect(signer).setApprovalForAll(swap.address, true)
      await erc20token.connect(deployer).mint(sender.address, DEFAULT_AMOUNT)
      await erc20token.connect(sender).approve(swap.address, DEFAULT_AMOUNT)
      const order = await createSignedOrder(
        {
          signer: {
            wallet: signer.address,
            token: erc721token.address,
            kind: TokenKinds.ERC721,
            amount: '0',
            id: '1',
          },
          sender: {
            wallet: sender.address,
            token: erc20token.address,
            kind: TokenKinds.ERC20,
            amount: '1',
            id: '0',
          },
        },
        signer
      )
      expect(await erc721token.ownerOf('1')).to.be.equal(signer.address)
      await expect(
        swap.connect(sender).swap(sender.address, MAX_ROYALTY, order)
      ).to.emit(swap, 'Swap')
      expect(await erc721token.ownerOf('1')).to.be.equal(sender.address)
    })

    it('swap ERC1155 for ERC20 succeeds', async () => {
      await erc1155token
        .connect(deployer)
        .mint(signer.address, '1', '1', '0x00')
      await erc1155token.connect(signer).setApprovalForAll(swap.address, true)
      await erc20token.connect(deployer).mint(sender.address, DEFAULT_AMOUNT)
      await erc20token.connect(sender).approve(swap.address, DEFAULT_AMOUNT)
      const order = await createSignedOrder(
        {
          signer: {
            wallet: signer.address,
            token: erc1155token.address,
            kind: TokenKinds.ERC1155,
            amount: '1',
            id: '1',
          },
          sender: {
            wallet: sender.address,
            token: erc20token.address,
            kind: TokenKinds.ERC20,
            amount: '1',
            id: '0',
          },
        },
        signer
      )
      expect(
        await erc1155token.balanceOf(signer.address, order.signer.id)
      ).to.be.equal(order.signer.amount)
      await expect(
        swap.connect(sender).swap(sender.address, MAX_ROYALTY, order)
      ).to.emit(swap, 'Swap')
      expect(
        await erc1155token.balanceOf(signer.address, order.signer.id)
      ).to.be.equal('0')
      return
    })

    it('swap ERC721 for ERC721 fails', async () => {
      await erc721token.connect(deployer).mint(signer.address)
      await erc721token.connect(signer).setApprovalForAll(swap.address, true)
      await erc721token.connect(deployer).mint(sender.address)
      await erc721token.connect(sender).setApprovalForAll(swap.address, true)
      const order = await createSignedOrder(
        {
          signer: {
            wallet: signer.address,
            token: erc721token.address,
            kind: TokenKinds.ERC721,
            amount: '0',
            id: '1',
          },
          sender: {
            wallet: sender.address,
            token: erc721token.address,
            kind: TokenKinds.ERC721,
            amount: '1',
            id: '0',
          },
        },
        signer
      )
      expect(await erc721token.ownerOf('1')).to.be.equal(signer.address)
      await expect(
        swap.connect(sender).swap(sender.address, MAX_ROYALTY, order)
      ).to.be.revertedWith('SenderTokenInvalid')
      expect(await erc721token.ownerOf('1')).to.be.equal(signer.address)
    })

    it('swap ERC721 for ERC1155 fails', async () => {
      await erc721token.connect(deployer).mint(signer.address)
      await erc721token.connect(signer).setApprovalForAll(swap.address, true)
      await erc1155token
        .connect(deployer)
        .mint(sender.address, '1', '1', '0x00')
      await erc1155token.connect(sender).setApprovalForAll(swap.address, true)
      const order = await createSignedOrder(
        {
          signer: {
            wallet: signer.address,
            token: erc721token.address,
            kind: TokenKinds.ERC721,
            amount: '0',
            id: '1',
          },
          sender: {
            wallet: sender.address,
            token: erc1155token.address,
            kind: TokenKinds.ERC1155,
            amount: '1',
            id: '1',
          },
        },
        signer
      )
      await expect(
        swap.connect(sender).swap(sender.address, MAX_ROYALTY, order)
      ).to.be.revertedWith('SenderTokenInvalid')
    })
  })

  describe('fees, affiliates, royalties', () => {
    it('protocol fee transfer succeeds', async () => {
      await erc20token.connect(deployer).mint(signer.address, DEFAULT_AMOUNT)
      await erc20token.connect(signer).approve(swap.address, DEFAULT_AMOUNT)
      await erc20token2.connect(deployer).mint(sender.address, DEFAULT_AMOUNT)
      await erc20token2.connect(sender).approve(swap.address, DEFAULT_AMOUNT)
      const order = await createSignedOrder(
        {
          signer: {
            wallet: signer.address,
            token: erc20token.address,
            kind: TokenKinds.ERC20,
            amount: '1',
            id: '0',
          },
          sender: {
            wallet: sender.address,
            token: erc20token2.address,
            kind: TokenKinds.ERC20,
            amount: '10000',
            id: '0',
          },
        },
        signer
      )
      await expect(
        swap.connect(sender).swap(sender.address, MAX_ROYALTY, order)
      ).to.emit(swap, 'Swap')
      expect(await erc20token.balanceOf(sender.address)).to.be.equal(
        order.signer.amount
      )
      expect(await erc20token2.balanceOf(signer.address)).to.be.equal(
        order.sender.amount
      )
      expect(await erc20token2.balanceOf(sender.address)).to.be.equal(
        DEFAULT_AMOUNT - order.sender.amount - PROTOCOL_FEE
      )
      expect(
        await erc20token2.balanceOf(protocolFeeWallet.address)
      ).to.be.equal(PROTOCOL_FEE)
    })

    it('affiliate fee transfer succeeds', async () => {
      await erc20token.connect(deployer).mint(signer.address, DEFAULT_AMOUNT)
      await erc20token.connect(signer).approve(swap.address, DEFAULT_AMOUNT)
      await erc20token2.connect(deployer).mint(sender.address, DEFAULT_AMOUNT)
      await erc20token2.connect(sender).approve(swap.address, DEFAULT_AMOUNT)
      const order = await createSignedOrder(
        {
          signer: {
            wallet: signer.address,
            token: erc20token.address,
            kind: TokenKinds.ERC20,
            amount: '1',
            id: '0',
          },
          sender: {
            wallet: sender.address,
            token: erc20token2.address,
            kind: TokenKinds.ERC20,
            amount: '10000',
            id: '0',
          },
          affiliateWallet: affiliate.address,
          affiliateAmount: '100',
        },
        signer
      )
      await expect(
        swap.connect(sender).swap(sender.address, MAX_ROYALTY, order)
      ).to.emit(swap, 'Swap')
      expect(await erc20token2.balanceOf(sender.address)).to.be.equal(
        DEFAULT_AMOUNT -
          order.sender.amount -
          PROTOCOL_FEE -
          order.affiliateAmount
      )
      expect(await erc20token2.balanceOf(affiliate.address)).to.be.equal(
        order.affiliateAmount
      )
    })
    it('royalty transfer succeeds', async () => {
      const royaltyNumerator = '50'
      await erc20token.connect(deployer).mint(sender.address, DEFAULT_AMOUNT)
      await erc20token.connect(sender).approve(swap.address, DEFAULT_AMOUNT)
      await erc721token
        .connect(deployer)
        .mintWithRoyalty(signer.address, deployer.address, royaltyNumerator)
      await erc721token.connect(signer).setApprovalForAll(swap.address, true)
      const order = await createSignedOrder(
        {
          signer: {
            wallet: signer.address,
            token: erc721token.address,
            kind: TokenKinds.ERC721,
            amount: '0',
            id: '1',
          },
          sender: {
            wallet: sender.address,
            token: erc20token.address,
            kind: TokenKinds.ERC20,
            amount: '1000',
            id: '0',
          },
        },
        signer
      )
      const royaltyAmount =
        Number(order.sender.amount) * (royaltyNumerator / ROYALTY_DENOMINATOR)
      await expect(
        swap.connect(sender).swap(sender.address, royaltyAmount, order)
      ).to.emit(swap, 'Swap')
      expect(await erc20token.balanceOf(deployer.address)).to.be.equal(
        Math.floor(royaltyAmount)
      )
    })
  })
})
