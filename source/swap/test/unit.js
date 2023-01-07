const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json')
const IERC721 = require('@openzeppelin/contracts/build/contracts/IERC721.json')
const IERC1155 = require('@openzeppelin/contracts/build/contracts/IERC1155.json')
const IERC777 = require('@openzeppelin/contracts/build/contracts/IERC777.json')
const { createOrder, createOrderSignature } = require('@airswap/utils')
const { tokenKinds, ADDRESS_ZERO } = require('@airswap/constants')

const CHAIN_ID = 31337
const PROTOCOL_FEE = '30'
const HIGHER_FEE = '50'
const FEE_DIVISOR = '10000'
const DEFAULT_AMOUNT = '1000'
const SWAP_FEE =
  (parseInt(DEFAULT_AMOUNT) * parseInt(PROTOCOL_FEE)) / parseInt(FEE_DIVISOR)
const DEFAULT_SIGNER_AMOUNT = parseInt(DEFAULT_AMOUNT) + SWAP_FEE

let snapshotId
let deployer
let signer
let sender
let affiliate
let transferHandlerRegistry
let swap

let signerToken
let senderToken
let affiliateToken

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

describe('Swap Unit', () => {
  let erc20Handler

  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot')
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  before('deploy registry, erc20handler, swap', async () => {
    ;[deployer, sender, signer, affiliate, protocolFeeWallet, anyone] =
      await ethers.getSigners()

    signerToken = await deployMockContract(deployer, IERC20.abi)
    senderToken = await deployMockContract(deployer, IERC20.abi)
    affiliateToken = await deployMockContract(deployer, IERC20.abi)

    await senderToken.mock.allowance.returns('0')
    await signerToken.mock.allowance.returns('0')
    await senderToken.mock.balanceOf.returns('0')
    await signerToken.mock.balanceOf.returns('0')
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
    await transferHandlerRegistry.addTransferHandler(
      tokenKinds.ERC20,
      erc20Handler.address
    )
    await expect(
      transferHandlerRegistry.addTransferHandler(
        tokenKinds.ERC20,
        erc20Handler.address
      )
    ).to.be.revertedWith('HandlerExistsForKind()')
    swap = await (
      await ethers.getContractFactory('Swap')
    ).deploy(
      transferHandlerRegistry.address,
      PROTOCOL_FEE,
      protocolFeeWallet.address
    )
    await swap.deployed()
  })

  describe('constructor, setters', async () => {
    it('deploy with invalid protocolFeeWallet fails', async () => {
      await expect(
        (
          await ethers.getContractFactory('Swap')
        ).deploy(transferHandlerRegistry.address, PROTOCOL_FEE, ADDRESS_ZERO)
      ).to.be.revertedWith('InvalidFeeWallet()')
    })

    it('deploy with invalid fee fails', async () => {
      await expect(
        (
          await ethers.getContractFactory('Swap')
        ).deploy(
          transferHandlerRegistry.address,
          100000000000,
          protocolFeeWallet.address
        )
      ).to.be.revertedWith('InvalidFee()')
    })

    it('setProtocolFeeWallet', async () => {
      await expect(
        swap.connect(deployer).setProtocolFeeWallet(protocolFeeWallet.address)
      ).to.emit(swap, 'SetProtocolFeeWallet')
      const storedFeeWallet = await swap.protocolFeeWallet()
      expect(storedFeeWallet).to.equal(protocolFeeWallet.address)
    })

    it('setProtocolFeeWallet by anyone fails', async () => {
      await expect(
        swap.connect(anyone).setProtocolFeeWallet(anyone.address)
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('setProtocolFeeWallet with invalid address fails', async () => {
      await expect(
        swap.connect(deployer).setProtocolFeeWallet(ADDRESS_ZERO)
      ).to.be.revertedWith('InvalidFeeWallet()')
    })

    it('setProtocolFee', async () => {
      await expect(swap.connect(deployer).setProtocolFee(PROTOCOL_FEE)).to.emit(
        swap,
        'SetProtocolFee'
      )
      const storedSignerFee = await swap.protocolFee()
      expect(storedSignerFee).to.equal(PROTOCOL_FEE)
    })

    it('setProtocolFee with invalid address fails', async () => {
      await expect(swap.connect(anyone).setProtocolFee('0')).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )
    })

    it('setProtocolFee with invalid fee', async () => {
      await expect(
        swap.connect(deployer).setProtocolFee(FEE_DIVISOR + 1)
      ).to.be.revertedWith('InvalidFee()')
    })
  })

  describe('authorizations', async () => {
    it('test authorized signer', async () => {
      const order = await createSignedOrder(
        {
          signer: {
            wallet: anyone.address,
          },
        },
        signer
      )

      await expect(swap.connect(anyone).authorize(signer.address))
        .to.emit(swap, 'Authorize')
        .withArgs(signer.address, anyone.address)

      await expect(swap.connect(sender).swap(order)).to.emit(swap, 'Swap')
    })

    it('test when signer not authorized', async () => {
      const order = await createSignedOrder(
        {
          signer: {
            wallet: anyone.address,
          },
        },
        signer
      )
      await expect(swap.connect(sender).swap(order)).to.be.revertedWith(
        'Unauthorized()'
      )
    })
  })

  describe('basic / erc20', async () => {
    it('erc20 swap succeeds', async () => {
      const order = await createSignedOrder({}, signer)
      await expect(swap.connect(sender).swap(order)).to.emit(swap, 'Swap')
    })

    it('erc20 public swap succeeds', async () => {
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

    it('erc20 swap with erc20 affiliate succeeds', async () => {
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

    it('swap with previously used nonce fails', async () => {
      const order = await createSignedOrder(
        {
          nonce: '0',
        },
        signer
      )
      await swap.connect(sender).swap(order)
      await expect(swap.connect(sender).swap(order)).to.be.revertedWith(
        'NonceAlreadyUsed()'
      )
    })

    it('swap with cancelled nonce fails', async () => {
      const order = await createSignedOrder(
        {
          nonce: '1',
        },
        signer
      )
      await swap.connect(signer).cancel([1])
      await expect(swap.connect(sender).swap(order)).to.be.revertedWith(
        'NonceAlreadyUsed()'
      )
    })

    it('swap with nonce below cancelUpTo fails', async () => {
      const order = await createSignedOrder(
        {
          nonce: '2',
        },
        signer
      )
      await swap.connect(signer).cancelUpTo(3)
      await expect(swap.connect(sender).swap(order)).to.be.revertedWith(
        'NonceTooLow()'
      )
    })

    it('swap with zero fee succeeds', async () => {
      const order = await createSignedOrder(
        {
          protocolFee: '0',
        },
        signer
      )
      await swap.connect(deployer).setProtocolFee('0')
      await expect(swap.connect(sender).swap(order)).to.emit(swap, 'Swap')
    })

    it('swap with incorrect fee fails', async () => {
      const order = await createSignedOrder(
        {
          protocolFee: HIGHER_FEE / 2,
        },
        signer
      )
      await expect(swap.connect(sender).swap(order)).to.be.revertedWith(
        'Unauthorized()'
      )
    })

    it('check succeeds with allowances and balances set', async () => {
      const order = await createSignedOrder({}, signer)
      await setUpAllowances(DEFAULT_AMOUNT, DEFAULT_SIGNER_AMOUNT)
      await setUpBalances(DEFAULT_AMOUNT, DEFAULT_SIGNER_AMOUNT)
      const [errors, errCount] = await swap.check(order)
      expect(errCount).to.equal(0)
    })

    it('check without allowances and balances fails', async () => {
      const order = await createSignedOrder({}, signer)
      const [errors] = await swap.check(order)
      expect(errors[0]).to.be.equal(
        ethers.utils.formatBytes32String('SIGNER_ALLOWANCE_LOW')
      )
      expect(errors[1]).to.be.equal(
        ethers.utils.formatBytes32String('SIGNER_BALANCE_LOW')
      )
      expect(errors[2]).to.be.equal(
        ethers.utils.formatBytes32String('SENDER_ALLOWANCE_LOW')
      )
      expect(errors[3]).to.be.equal(
        ethers.utils.formatBytes32String('SENDER_BALANCE_LOW')
      )
    })

    it('check with bad kind fails', async () => {
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
      const [errors] = await swap.check(order)
      expect(errors[0]).to.be.equal(
        ethers.utils.formatBytes32String('SIGNER_TOKEN_KIND_UNKNOWN')
      )
      expect(errors[1]).to.be.equal(
        ethers.utils.formatBytes32String('SENDER_TOKEN_KIND_UNKNOWN')
      )
    })

    it('check with previously used nonce fails', async () => {
      const order = await createSignedOrder(
        {
          nonce: '0',
        },
        signer
      )
      await setUpAllowances(DEFAULT_AMOUNT, DEFAULT_SIGNER_AMOUNT)
      await setUpBalances(DEFAULT_AMOUNT, DEFAULT_SIGNER_AMOUNT)
      await expect(swap.connect(sender).swap(order)).to.emit(swap, 'Swap')
      const [errors] = await swap.check(order)
      expect(errors[0]).to.be.equal(
        ethers.utils.formatBytes32String('NONCE_ALREADY_USED')
      )
    })

    it('check with incorrect signer fails', async () => {
      const order = await createSignedOrder(
        {
          signer: {
            wallet: ADDRESS_ZERO,
          },
        },
        signer
      )
      await expect(swap.connect(sender).swap(order)).to.be.revertedWith(
        'Unauthorized()'
      )
    })

    it('check with passed expiry fails', async () => {
      const order = await createSignedOrder(
        {
          expiry: '0',
        },
        signer
      )
      await expect(swap.connect(sender).swap(order)).to.be.revertedWith(
        'OrderExpired()'
      )
    })
  })

  describe('erc721', async () => {
    before(async () => {
      signerTokenERC721 = await deployMockContract(deployer, IERC721.abi)
      senderTokenERC721 = await deployMockContract(deployer, IERC721.abi)

      await senderTokenERC721.mock.isApprovedForAll.returns(true)
      await senderTokenERC721.mock.ownerOf.returns(sender.address)
      await signerTokenERC721.mock.isApprovedForAll.returns(true)
      await signerTokenERC721.mock.ownerOf.returns(signer.address)

      erc721Handler = await (
        await ethers.getContractFactory('ERC721TransferHandler')
      ).deploy()
      await erc721Handler.deployed()

      await transferHandlerRegistry.addTransferHandler(
        tokenKinds.ERC721,
        erc721Handler.address
      )
    })
    it('test erc721 check', async () => {
      const order = await createSignedOrder(
        {
          signer: {
            token: signerTokenERC721.address,
            kind: tokenKinds.ERC721,
          },
          sender: {
            token: senderTokenERC721.address,
            kind: tokenKinds.ERC721,
          },
        },
        signer
      )
      const [errors, errCount] = await swap.check(order)
      expect(errCount).to.equal(0)
    })
  })

  describe('erc777', async () => {
    before(async () => {
      signerTokenERC777 = await deployMockContract(deployer, IERC777.abi)
      senderTokenERC777 = await deployMockContract(deployer, IERC777.abi)
      affiliateTokenERC777 = await deployMockContract(deployer, IERC777.abi)

      await signerTokenERC777.mock.balanceOf.returns('0')
      await senderTokenERC777.mock.balanceOf.returns('0')
      await signerTokenERC777.mock.isOperatorFor.returns(true)
      await senderTokenERC777.mock.isOperatorFor.returns(true)

      erc777Handler = await (
        await ethers.getContractFactory('ERC777TransferHandler')
      ).deploy()
      await erc777Handler.deployed()

      await transferHandlerRegistry.addTransferHandler(
        tokenKinds.ERC777,
        erc777Handler.address
      )
    })

    it('test erc777 check', async () => {
      const order = await createSignedOrder(
        {
          signer: {
            token: signerTokenERC777.address,
            kind: tokenKinds.ERC777,
          },
          sender: {
            token: senderTokenERC777.address,
            kind: tokenKinds.ERC777,
          },
        },
        signer
      )
      const [errors] = await swap.check(order)
      expect(errors[0]).to.be.equal(
        ethers.utils.formatBytes32String('SIGNER_BALANCE_LOW')
      )
      expect(errors[1]).to.be.equal(
        ethers.utils.formatBytes32String('SENDER_BALANCE_LOW')
      )
    })
  })

  describe('erc1155', async () => {
    let signerTokenERC1155
    let senderTokenERC1155
    before(async () => {
      signerTokenERC1155 = await deployMockContract(deployer, IERC1155.abi)
      senderTokenERC1155 = await deployMockContract(deployer, IERC1155.abi)

      await senderTokenERC1155.mock.isApprovedForAll.returns(true)
      await senderTokenERC1155.mock.balanceOf.returns('0')
      await signerTokenERC1155.mock.isApprovedForAll.returns(true)
      await signerTokenERC1155.mock.balanceOf.returns('0')

      erc1155Handler = await (
        await ethers.getContractFactory('ERC1155TransferHandler')
      ).deploy()
      await erc1155Handler.deployed()

      await expect(
        transferHandlerRegistry.addTransferHandler(
          tokenKinds.ERC1155,
          erc1155Handler.address
        )
      ).to.emit(transferHandlerRegistry, 'AddTransferHandler')
    })
    it('test erc1155 check', async () => {
      const order = await createSignedOrder(
        {
          signer: {
            token: signerTokenERC1155.address,
            kind: tokenKinds.ERC1155,
          },
          sender: {
            token: senderTokenERC1155.address,
            kind: tokenKinds.ERC1155,
          },
        },
        signer
      )
      const [errors] = await swap.check(order)
      expect(errors[0]).to.be.equal(
        ethers.utils.formatBytes32String('SIGNER_BALANCE_LOW')
      )
      expect(errors[1]).to.be.equal(
        ethers.utils.formatBytes32String('SENDER_BALANCE_LOW')
      )
    })
  })
})
