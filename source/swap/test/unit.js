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
  let affiliateToken

  let transferHandlerRegistry
  let erc20Handler

  let deployer
  let signer
  let sender
  let affiliate

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
    affiliateToken = await deployMockContract(deployer, IERC20.abi)

    await senderToken.mock.allowance.returns('0')
    await signerToken.mock.allowance.returns('0')
    await senderToken.mock.balanceOf.returns('0')
    await signerToken.mock.balanceOf.returns('0')
    await signerToken.mock.transferFrom.returns(true)
    await senderToken.mock.transferFrom.returns(true)
    await affiliateToken.mock.transferFrom.returns(true)

    signerTokenERC777 = await deployMockContract(deployer, IERC777.abi)
    senderTokenERC777 = await deployMockContract(deployer, IERC777.abi)
    affiliateTokenERC777 = await deployMockContract(deployer, IERC777.abi)

    await signerTokenERC777.mock.balanceOf.returns('0')
    await senderTokenERC777.mock.balanceOf.returns('0')
    await signerTokenERC777.mock.isOperatorFor.returns(true)
    await senderTokenERC777.mock.isOperatorFor.returns(true)

    signerTokenERC721 = await deployMockContract(deployer, IERC721.abi)
    senderTokenERC721 = await deployMockContract(deployer, IERC721.abi)

    await senderTokenERC721.mock.isApprovedForAll.returns(true)
    await senderTokenERC721.mock.ownerOf.returns(sender.address)
    await signerTokenERC721.mock.isApprovedForAll.returns(true)
    await signerTokenERC721.mock.ownerOf.returns(signer.address)

    signerTokenERC1155 = await deployMockContract(deployer, IERC1155.abi)
    senderTokenERC1155 = await deployMockContract(deployer, IERC1155.abi)

    await senderTokenERC1155.mock.isApprovedForAll.returns(true)
    await senderTokenERC1155.mock.balanceOf.returns('0')
    await signerTokenERC1155.mock.isApprovedForAll.returns(true)
    await signerTokenERC1155.mock.balanceOf.returns('0')

    transferHandlerRegistry = await (
      await ethers.getContractFactory('TransferHandlerRegistry')
    ).deploy()
    await transferHandlerRegistry.deployed()
    erc20Handler = await (
      await ethers.getContractFactory('ERC20TransferHandler')
    ).deploy()
    await erc20Handler.deployed()
    erc777Handler = await (
      await ethers.getContractFactory('ERC777TransferHandler')
    ).deploy()
    await erc777Handler.deployed()
    erc721Handler = await (
      await ethers.getContractFactory('ERC721TransferHandler')
    ).deploy()
    await erc721Handler.deployed()
    erc1155Handler = await (
      await ethers.getContractFactory('ERC1155TransferHandler')
    ).deploy()
    await erc1155Handler.deployed()

    await transferHandlerRegistry.addTransferHandler(
      tokenKinds.ERC20,
      erc20Handler.address
    )
    await transferHandlerRegistry.addTransferHandler(
      tokenKinds.ERC777,
      erc777Handler.address
    )
    await transferHandlerRegistry.addTransferHandler(
      tokenKinds.ERC721,
      erc721Handler.address
    )
    await expect(
      transferHandlerRegistry.addTransferHandler(
        tokenKinds.ERC1155,
        erc1155Handler.address
      )
    ).to.emit(transferHandlerRegistry, 'AddTransferHandler')
    await expect(
      transferHandlerRegistry.addTransferHandler(
        tokenKinds.ERC1155,
        erc1155Handler.address
      )
    ).to.be.revertedWith('HANDLER_EXISTS_FOR_KIND')

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
        ).to.be.revertedWith('InvalidFeeWallet()')
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
        ).to.be.revertedWith('InvalidFee()')
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

  describe('Test check', async () => {
    it('test check with bad kind', async () => {
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
      const [errCount] = await swap.check(order)
      expect(errCount).to.equal(2)
    })

    it('test erc20 check', async () => {
      const order = await createSignedOrder({}, signer)
      const [errCount] = await swap.check(order)
      expect(errCount).to.equal(4)
    })

    it('test erc20 check with allowances and balances setup', async () => {
      const order = await createSignedOrder({}, signer)
      await setUpAllowances(DEFAULT_AMOUNT, DEFAULT_SIGNER_AMOUNT)
      await setUpBalances(DEFAULT_AMOUNT, DEFAULT_SIGNER_AMOUNT)
      const [errCount] = await swap.check(order)
      expect(errCount).to.equal(0)
    })

    it('test check with used nonce', async () => {
      const order = await createSignedOrder(
        {
          nonce: '0',
        },
        signer
      )
      await setUpAllowances(DEFAULT_AMOUNT, DEFAULT_SIGNER_AMOUNT)
      await setUpBalances(DEFAULT_AMOUNT, DEFAULT_SIGNER_AMOUNT)
      await expect(swap.connect(sender).swap(order)).to.emit(swap, 'Swap')
      const [errCount] = await swap.check(order)
      expect(errCount).to.equal(1)
    })

    it('test check with bad signer', async () => {
      const order = await createSignedOrder(
        {
          signer: {
            wallet: ADDRESS_ZERO,
          },
        },
        signer
      )
      const [errCount] = await swap.check(order)
      expect(errCount).to.equal(5)
    })

    it('test check with bad expiry', async () => {
      const order = await createSignedOrder(
        {
          expiry: '0',
        },
        signer
      )
      const [errCount] = await swap.check(order)
      expect(errCount).to.equal(5)
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
      const [errCount] = await swap.check(order)
      expect(errCount).to.equal(0)
    })

    it('test eip1155 check', async () => {
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
      const [errCount] = await swap.check(order)
      expect(errCount).to.equal(2)
    })

    it('test eip777 check', async () => {
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
      const [errCount] = await swap.check(order)
      expect(errCount).to.equal(2)
    })
  })

  describe('Test swap', async () => {
    it('test swap', async () => {
      const order = await createSignedOrder({}, signer)
      await expect(swap.connect(sender).swap(order)).to.emit(swap, 'Swap')
    })

    it('test public swap', async () => {
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

    it('test swap with affiliate', async () => {
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

    it('test when nonce has already been used', async () => {
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

    it('test when nonce has been cancelled', async () => {
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

    it('test when nonce has been cancelled up to', async () => {
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
      ).to.be.revertedWith('InvalidFeeWallet()')
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
      ).to.be.revertedWith('InvalidFee()')
    })

    it('test when signed with incorrect fee', async () => {
      const order = await createSignedOrder(
        {
          protocolFee: HIGHER_FEE / 2,
        },
        signer
      )
      await expect(swap.connect(sender).swap(order)).to.be.revertedWith(
        'SignatureInvalid()'
      )
    })
  })
})
