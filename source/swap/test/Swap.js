const { expect } = require('chai')
const { time } = require('@nomicfoundation/hardhat-network-helpers')
const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json')
const IERC721 = require('@openzeppelin/contracts/build/contracts/ERC721Royalty.json')
const IERC1155 = require('@openzeppelin/contracts/build/contracts/IERC1155.json')
const {
  createOrder,
  createOrderSignature,
  TokenKinds,
  ADDRESS_ZERO,
} = require('@airswap/utils')

const CHAIN_ID = 31337
const PROTOCOL_FEE = '30'
const HIGHER_FEE = '50'
const INVALID_FEE = '100000000000'
const INVALID_KIND = '0x00000000'
const DEFAULT_AMOUNT = '1000'
const ERC2981_INTERFACE_ID = '0x2a55205a'
const MAX_ROYALTY = '10'
const IS_VALID_SIGNATURE_ABI = [
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_hash',
        type: 'bytes32',
      },
      {
        internalType: 'bytes',
        name: '_signature',
        type: 'bytes',
      },
    ],
    name: 'isValidSignature',
    outputs: [
      {
        internalType: 'bytes4',
        name: '',
        type: 'bytes4',
      },
    ],
    stateMutability: 'pure',
    type: 'function',
  },
]

let snapshotId
let deployer
let signer
let sender
let affiliate
let erc20token
let erc20adapter
let erc721token
let erc721adapter
let erc1155token
let erc1155adapter
let erc1271
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

describe('Swap Unit', () => {
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
    await erc721token.mock.getApproved.returns(sender.address)
    await erc721token.mock.ownerOf.returns(sender.address)
    await erc721token.mock[
      'safeTransferFrom(address,address,uint256)'
    ].returns()
    erc721adapter = await (
      await ethers.getContractFactory('ERC721Adapter')
    ).deploy()
    await erc721adapter.deployed()

    erc1155token = await deployMockContract(deployer, IERC1155.abi)
    await erc1155token.mock.isApprovedForAll.returns(true)
    await erc1155token.mock.balanceOf.returns(DEFAULT_AMOUNT)
    await erc1155token.mock[
      'safeTransferFrom(address,address,uint256,uint256,bytes)'
    ].returns()
    erc1155adapter = await (
      await ethers.getContractFactory('ERC1155Adapter')
    ).deploy()
    await erc1155adapter.deployed()

    erc1271 = await deployMockContract(deployer, IS_VALID_SIGNATURE_ABI)
    await erc1271.mock.isValidSignature.returns(0x1626ba7e)

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

  describe('adapters, fees, fee wallets, royalties', () => {
    it('at least one adapter address must be passed to constructor', async () => {
      await expect(
        (
          await ethers.getContractFactory('Swap')
        ).deploy([], TokenKinds.ERC20, PROTOCOL_FEE, protocolFeeWallet.address)
      ).to.be.revertedWith('AdaptersInvalid')
    })

    it('an invalid protocolFeeWallet (non-null) is rejected by constructor', async () => {
      await expect(
        (
          await ethers.getContractFactory('Swap')
        ).deploy([], TokenKinds.ERC20, PROTOCOL_FEE, ADDRESS_ZERO)
      ).to.be.revertedWith('FeeWalletInvalid')
    })

    it('protocolFeeWallet can only be updated with a valid value (non-null)', async () => {
      await expect(
        swap.connect(deployer).setProtocolFeeWallet(ADDRESS_ZERO)
      ).to.be.revertedWith('FeeWalletInvalid')
    })

    it('protocolFeeWallet can only be updated by owner', async () => {
      await expect(
        swap.connect(anyone).setProtocolFeeWallet(ADDRESS_ZERO)
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('an update to protocolFeeWallet is immediately reflected', async () => {
      await expect(
        swap.connect(deployer).setProtocolFeeWallet(anyone.address)
      ).to.emit(swap, 'SetProtocolFeeWallet')
      const storedSignerFeeWallet = await swap.protocolFeeWallet()
      expect(storedSignerFeeWallet).to.equal(anyone.address)
    })

    it('an invalid protocolFee (less than divisor) is rejected by constructor', async () => {
      await expect(
        (
          await ethers.getContractFactory('Swap')
        ).deploy([], TokenKinds.ERC20, INVALID_FEE, protocolFeeWallet.address)
      ).to.be.revertedWith('FeeInvalid')
    })

    it('protocolFee can only be updated with a valid value (less than divisor)', async () => {
      await expect(
        swap.connect(deployer).setProtocolFee(INVALID_FEE)
      ).to.be.revertedWith('FeeInvalid')
    })

    it('protocolFee can only be updated by owner', async () => {
      await expect(swap.connect(anyone).setProtocolFee('0')).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )
    })

    it('an update to protocolFee is immediately reflected', async () => {
      await expect(swap.connect(deployer).setProtocolFee(PROTOCOL_FEE)).to.emit(
        swap,
        'SetProtocolFee'
      )
      const storedSignerFee = await swap.protocolFee()
      expect(storedSignerFee).to.equal(PROTOCOL_FEE)
    })

    it('an update to zero (0) protocol fee is possible', async () => {
      const order = await createSignedOrder(
        {
          protocolFee: '0',
        },
        signer
      )
      await swap.connect(deployer).setProtocolFee('0')
      await expect(
        swap.connect(sender).swap(sender.address, MAX_ROYALTY, order)
      ).to.emit(swap, 'Swap')
    })

    it('an order with an incorrect protocolFee is rejected', async () => {
      const order = await createSignedOrder(
        {
          protocolFee: HIGHER_FEE,
        },
        signer
      )
      await expect(
        swap.connect(sender).swap(sender.address, MAX_ROYALTY, order)
      ).to.be.revertedWith('Unauthorized')
    })

    it('an order with a higher-than-max royalty is rejected', async () => {
      await erc721token.mock.supportsInterface
        .withArgs(ERC2981_INTERFACE_ID)
        .returns(true)
      await erc721token.mock.royaltyInfo.returns(
        ADDRESS_ZERO,
        Number(MAX_ROYALTY) + 1
      )
      const order = await createSignedOrder(
        {
          signer: {
            token: erc721token.address,
            kind: TokenKinds.ERC721,
            id: '1',
            amount: '0',
          },
        },
        signer
      )
      await expect(
        swap.connect(sender).swap(sender.address, MAX_ROYALTY, order)
      )
        .to.be.revertedWith('RoyaltyExceedsMax')
        .withArgs(Number(MAX_ROYALTY) + 1)
    })

    it('an order with a royalty equal to max is accepted', async () => {
      await erc721token.mock.supportsInterface
        .withArgs('0x2a55205a')
        .returns(true)
      await erc721token.mock.royaltyInfo.returns(
        ADDRESS_ZERO,
        Number(MAX_ROYALTY)
      )
      const order = await createSignedOrder(
        {
          signer: {
            token: erc721token.address,
            kind: TokenKinds.ERC721,
            id: '1',
            amount: '0',
          },
        },
        signer
      )
      await expect(
        swap.connect(sender).swap(sender.address, MAX_ROYALTY, order)
      ).to.emit(swap, 'Swap')
    })

    it('an order with a royalty below max is accepted', async () => {
      await erc721token.mock.supportsInterface
        .withArgs('0x2a55205a')
        .returns(true)
      await erc721token.mock.royaltyInfo.returns(
        ADDRESS_ZERO,
        Number(MAX_ROYALTY) - 1
      )
      const order = await createSignedOrder(
        {
          signer: {
            token: erc721token.address,
            kind: TokenKinds.ERC721,
            id: '1',
            amount: '0',
          },
        },
        signer
      )
      await expect(
        swap.connect(sender).swap(sender.address, MAX_ROYALTY, order)
      ).to.emit(swap, 'Swap')
    })

    it('an order with zero royalty is accepted', async () => {
      await erc721token.mock.supportsInterface
        .withArgs('0x2a55205a')
        .returns(true)
      await erc721token.mock.royaltyInfo.returns(ADDRESS_ZERO, 0)
      const order = await createSignedOrder(
        {
          signer: {
            token: erc721token.address,
            kind: TokenKinds.ERC721,
            id: '1',
            amount: '0',
          },
        },
        signer
      )
      await expect(
        swap.connect(sender).swap(sender.address, MAX_ROYALTY, order)
      ).to.emit(swap, 'Swap')
    })
  })

  describe('nonces, expiry, signatures', () => {
    it('a successful swap marks an order nonce used', async () => {
      const order = await createSignedOrder({}, signer)
      await expect(
        swap.connect(sender).swap(sender.address, MAX_ROYALTY, order)
      ).to.emit(swap, 'Swap')
      expect(
        await swap.connect(sender).nonceUsed(signer.address, order.nonce)
      ).to.equal(true)
    })

    it('an order with already used nonce is rejected', async () => {
      const order = await createSignedOrder({}, signer)
      await expect(
        swap.connect(sender).swap(sender.address, MAX_ROYALTY, order)
      ).to.emit(swap, 'Swap')
      expect(
        await swap.connect(sender).nonceUsed(signer.address, order.nonce)
      ).to.equal(true)
      await expect(
        swap.connect(sender).swap(sender.address, MAX_ROYALTY, order)
      )
        .to.be.revertedWith('NonceAlreadyUsed')
        .withArgs(Number(order.nonce))
    })

    it('an order with an already canceled nonce is rejected', async () => {
      const order = await createSignedOrder({}, signer)
      await expect(swap.connect(signer).cancel([order.nonce])).to.emit(
        swap,
        'Cancel'
      )
      await expect(
        swap.connect(sender).swap(sender.address, MAX_ROYALTY, order)
      )
        .to.be.revertedWith('NonceAlreadyUsed')
        .withArgs(Number(order.nonce))
    })

    it('an order signatory can cancel up to a minimum nonce', async () => {
      const order = await createSignedOrder({}, signer)
      await expect(swap.connect(signer).cancelUpTo(order.nonce + 1)).to.emit(
        swap,
        'CancelUpTo'
      )
      expect(
        await swap.connect(sender).signatoryMinimumNonce(signer.address)
      ).to.equal(order.nonce + 1)
      await expect(
        swap.connect(sender).swap(sender.address, MAX_ROYALTY, order)
      ).to.be.revertedWith('NonceTooLow')
    })

    it('an order with an invalid expiry (at current block timestamp) is rejected', async () => {
      const timestamp = (await ethers.provider.getBlock()).timestamp + 1
      await time.setNextBlockTimestamp(timestamp)
      await expect(
        swap.connect(sender).swap(
          sender.address,
          MAX_ROYALTY,
          await createSignedOrder(
            {
              expiry: timestamp,
            },
            signer
          )
        )
      ).to.be.revertedWith('OrderExpired')
    })

    it('an order with an invalid expiry (before current block timestamp) is rejected', async () => {
      const timestamp = (await ethers.provider.getBlock()).timestamp + 1
      await time.setNextBlockTimestamp(timestamp)
      await expect(
        swap.connect(sender).swap(
          sender.address,
          MAX_ROYALTY,
          await createSignedOrder(
            {
              expiry: timestamp - 1,
            },
            signer
          )
        )
      ).to.be.revertedWith('OrderExpired')
    })
  })

  describe('signers, senders, affiliates, kinds', () => {
    it('an order with an invalid signature is rejected', async () => {
      const order = await createSignedOrder(
        {
          signer: {
            wallet: signer.address,
          },
        },
        anyone
      )
      order.v = 1
      await expect(
        swap.connect(sender).swap(sender.address, MAX_ROYALTY, order)
      ).to.be.revertedWith('Unauthorized')
    })

    it('a signer may authorize another signatory to sign orders on its behalf', async () => {
      await expect(swap.connect(signer).authorize(anyone.address)).to.emit(
        swap,
        'Authorize'
      )
      const order = await createSignedOrder(
        {
          signer: {
            wallet: signer.address,
          },
        },
        anyone
      )
      await expect(
        swap.connect(sender).swap(sender.address, MAX_ROYALTY, order)
      ).to.emit(swap, 'Swap')
    })

    it('a signer may authorize a signatory contract to sign orders on its behalf', async () => {
      await expect(swap.connect(signer).authorize(erc1271.address)).to.emit(
        swap,
        'Authorize'
      )
      const order = await createSignedOrder(
        {
          signer: {
            wallet: signer.address,
          },
        },
        signer
      )
      await expect(
        swap.connect(sender).swap(sender.address, MAX_ROYALTY, order)
      ).to.emit(swap, 'Swap')
    })

    it('a signer may not authorize a signatory with null address', async () => {
      await expect(
        swap.connect(signer).authorize(ADDRESS_ZERO)
      ).to.be.revertedWith('SignatoryInvalid')
    })

    it('a signer may only authorize one (1) other signatory at a time', async () => {
      await expect(swap.connect(signer).authorize(anyone.address)).to.emit(
        swap,
        'Authorize'
      )
      await expect(swap.connect(signer).authorize(deployer.address)).to.emit(
        swap,
        'Authorize'
      )
      const order = await createSignedOrder(
        {
          signer: {
            wallet: signer.address,
          },
        },
        anyone
      )
      await expect(
        swap.connect(sender).swap(sender.address, MAX_ROYALTY, order)
      ).to.be.revertedWith('Unauthorized')
    })

    it('if set, order signatory must be authorized signatory', async () => {
      await expect(swap.connect(signer).authorize(anyone.address)).to.emit(
        swap,
        'Authorize'
      )
      const order = await createSignedOrder(
        {
          signer: {
            wallet: signer.address,
          },
        },
        signer
      )
      await expect(
        swap.connect(sender).swap(sender.address, MAX_ROYALTY, order)
      ).to.be.revertedWith('Unauthorized')
    })

    it('a signer may revoke an authorized signatory', async () => {
      await expect(swap.connect(signer).authorize(anyone.address)).to.emit(
        swap,
        'Authorize'
      )
      await expect(swap.connect(signer).revoke()).to.emit(swap, 'Revoke')
      const order = await createSignedOrder(
        {
          signer: {
            wallet: signer.address,
          },
        },
        anyone
      )
      await expect(
        swap.connect(sender).swap(sender.address, MAX_ROYALTY, order)
      ).to.be.revertedWith('Unauthorized')
    })

    it('a sender may not take an order specified for another sender', async () => {
      const order = await createSignedOrder(
        {
          signer: {
            wallet: signer.address,
          },
          sender: {
            wallet: affiliate.address,
          },
        },
        signer
      )
      await expect(
        swap.connect(sender).swap(sender.address, MAX_ROYALTY, order)
      ).to.be.revertedWith('SenderInvalid')
    })

    it('a sender may take an order not specified for another sender (public order)', async () => {
      const order = await createSignedOrder(
        {
          sender: {
            wallet: ADDRESS_ZERO,
          },
        },
        signer
      )
      await expect(
        swap.connect(sender).swap(sender.address, MAX_ROYALTY, order)
      ).to.emit(swap, 'Swap')
    })

    it('an order with an affiliate specified succeeds', async () => {
      const order = await createSignedOrder(
        {
          affiliateWallet: affiliate.address,
          affiliateAmount: '1',
        },
        signer
      )
      await expect(
        swap.connect(sender).swap(sender.address, MAX_ROYALTY, order)
      ).to.emit(swap, 'Swap')
    })

    it('an order with an affiliate higher than sender fails', async () => {
      const order = await createSignedOrder(
        {
          affiliateWallet: affiliate.address,
          affiliateAmount: +DEFAULT_AMOUNT + 1,
        },
        signer
      )
      await expect(
        swap.connect(sender).swap(sender.address, MAX_ROYALTY, order)
      ).to.be.revertedWith('AffiliateAmountInvalid')
    })

    it('an order with an invalid kind is rejected', async () => {
      const order = await createSignedOrder(
        {
          signer: {
            kind: INVALID_KIND,
          },
        },
        signer
      )
      await expect(
        swap.connect(sender).swap(sender.address, MAX_ROYALTY, order)
      ).to.be.revertedWith('TokenKindUnknown')
    })

    it('an order with an invalid sender kind is rejected', async () => {
      const order = await createSignedOrder(
        {
          sender: {
            kind: INVALID_KIND,
          },
        },
        signer
      )
      await expect(
        swap.connect(sender).swap(sender.address, MAX_ROYALTY, order)
      ).to.be.revertedWith('SenderTokenInvalid')
    })

    it('an order with underlying signer token issue reverts', async () => {
      await erc721token.mock[
        'safeTransferFrom(address,address,uint256)'
      ].reverts()
      const order = await createSignedOrder(
        {
          signer: {
            kind: TokenKinds.ERC721,
            token: erc721token.address,
            amount: '0',
            id: '0',
          },
        },
        signer
      )
      await expect(
        swap.connect(sender).swap(sender.address, MAX_ROYALTY, order)
      )
        .to.be.revertedWith('TransferFailed')
        .withArgs(signer.address, sender.address)
    })
  })

  describe('order check helper', () => {
    it('check succeeds', async () => {
      await erc20token.mock.allowance.returns(DEFAULT_AMOUNT + PROTOCOL_FEE)
      await erc20token.mock.balanceOf.returns(DEFAULT_AMOUNT + PROTOCOL_FEE)
      await erc721token.mock.getApproved.returns(swap.address)
      await erc721token.mock.ownerOf.returns(signer.address)
      const order = await createSignedOrder(
        {
          signer: {
            kind: TokenKinds.ERC721,
            token: erc721token.address,
            id: '1',
            amount: '0',
          },
        },
        signer
      )
      const errors = await swap.check(sender.address, order)
      expect(errors).to.have.lengthOf(0)
    })

    it('checks with a contract as signatory succeeds', async () => {
      await erc20token.mock.allowance.returns(DEFAULT_AMOUNT + PROTOCOL_FEE)
      await erc20token.mock.balanceOf.returns(DEFAULT_AMOUNT + PROTOCOL_FEE)
      await erc721token.mock.getApproved.returns(swap.address)
      await erc721token.mock.ownerOf.returns(signer.address)
      const order = await createSignedOrder(
        {
          signer: {
            wallet: signer.address,
          },
        },
        signer
      )
      await expect(swap.connect(signer).authorize(erc1271.address))
      const errors = await swap.check(sender.address, order)
      expect(errors).to.have.lengthOf(0)
    })

    it('check with invalid erc20 signer param fails', async () => {
      const order = await createSignedOrder(
        {
          signer: {
            kind: TokenKinds.ERC20,
            id: '1',
          },
          sender: {
            wallet: ADDRESS_ZERO,
          },
        },
        signer
      )
      const errors = await swap.check(ADDRESS_ZERO, order)
      expect(errors).to.include(
        ethers.utils.formatBytes32String('AmountOrIDInvalid')
      )
    })

    it('check with invalid erc721 signer param fails', async () => {
      const order = await createSignedOrder(
        {
          signer: {
            kind: TokenKinds.ERC721,
            token: erc721token.address,
            amount: '1',
          },
          sender: {
            wallet: ADDRESS_ZERO,
          },
        },
        signer
      )
      const errors = await swap.check(ADDRESS_ZERO, order)
      expect(errors).to.include(
        ethers.utils.formatBytes32String('AmountOrIDInvalid')
      )
    })

    it('check with invalid erc1155 signer param fails', async () => {
      const order = await createSignedOrder(
        {
          signer: {
            kind: TokenKinds.ERC1155,
            token: erc1155token.address,
            amount: '0',
          },
          sender: {
            wallet: ADDRESS_ZERO,
          },
        },
        signer
      )
      const errors = await swap.check(ADDRESS_ZERO, order)
      expect(errors).to.include(
        ethers.utils.formatBytes32String('AmountOrIDInvalid')
      )
    })

    it('check with invalid erc20 sender param fails', async () => {
      const order = await createSignedOrder(
        {
          sender: {
            wallet: ADDRESS_ZERO,
            kind: TokenKinds.ERC20,
            id: '1',
          },
        },
        signer
      )
      const errors = await swap.check(ADDRESS_ZERO, order)
      expect(errors[0]).to.be.equal(
        ethers.utils.formatBytes32String('AmountOrIDInvalid')
      )
    })

    it('check without allowances or balances fails', async () => {
      await erc20token.mock.allowance.returns('0')
      await erc20token.mock.balanceOf.returns('0')
      const order = await createSignedOrder({}, signer)
      const errors = await swap.check(sender.address, order)
      expect(errors).to.include(
        ethers.utils.formatBytes32String('SignerAllowanceLow')
      )
      expect(errors).to.include(
        ethers.utils.formatBytes32String('SignerBalanceLow')
      )
      expect(errors).to.include(
        ethers.utils.formatBytes32String('SenderAllowanceLow')
      )
      expect(errors).to.include(
        ethers.utils.formatBytes32String('SenderBalanceLow')
      )
    })

    it('check public order without allowances or balances fails', async () => {
      await erc20token.mock.allowance.returns('0')
      await erc20token.mock.balanceOf.returns('0')
      const order = await createSignedOrder(
        {
          sender: { wallet: ADDRESS_ZERO },
        },
        signer
      )
      const errors = await swap.check(ADDRESS_ZERO, order)
      expect(errors).to.include(
        ethers.utils.formatBytes32String('SignerAllowanceLow')
      )
      expect(errors).to.include(
        ethers.utils.formatBytes32String('SignerBalanceLow')
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
      const errors = await swap.check(sender.address, order)
      expect(errors).to.include(
        ethers.utils.formatBytes32String('SignerTokenKindUnknown')
      )
      expect(errors).to.include(
        ethers.utils.formatBytes32String('SenderTokenKindUnknown')
      )
    })

    it('check with an invalid sender kind fails', async () => {
      const order = await createSignedOrder(
        {
          sender: {
            kind: TokenKinds.ERC721,
          },
        },
        signer
      )
      const errors = await swap.check(sender.address, order)
      expect(errors).to.include(
        ethers.utils.formatBytes32String('SenderTokenInvalid')
      )
    })

    it('check with previously used nonce fails', async () => {
      const order = await createSignedOrder(
        {
          nonce: '0',
        },
        signer
      )
      await expect(
        swap.connect(sender).swap(sender.address, MAX_ROYALTY, order)
      ).to.emit(swap, 'Swap')
      const errors = await swap.check(sender.address, order)
      expect(errors).to.include(
        ethers.utils.formatBytes32String('NonceAlreadyUsed')
      )
    })

    it('check with nonce too low fails', async () => {
      const order = await createSignedOrder(
        {
          nonce: '2',
        },
        signer
      )
      await swap.connect(signer).cancelUpTo(3)
      const errors = await swap.check(sender.address, order)
      expect(errors).to.include(ethers.utils.formatBytes32String('NonceTooLow'))
    })

    it('check with bad signature fails', async () => {
      let order = await createSignedOrder({}, signer)
      order = {
        ...order,
        v: '0',
      }
      const errors = await swap.check(sender.address, order)
      expect(errors).to.include(
        ethers.utils.formatBytes32String('Unauthorized')
      )
    })

    it('check sender MAY NOT take an order specified for another sender', async () => {
      const order = await createSignedOrder(
        {
          sender: {
            wallet: sender.address,
          },
        },
        signer
      )
      const errors = await swap.check(anyone.address, order)
      expect(errors).to.include(
        ethers.utils.formatBytes32String('SenderInvalid')
      )
    })

    it('check sender MAY take an order not specified for another sender', async () => {
      await erc20token.mock.allowance.returns(DEFAULT_AMOUNT + PROTOCOL_FEE)
      await erc20token.mock.balanceOf.returns(DEFAULT_AMOUNT + PROTOCOL_FEE)
      const order = await createSignedOrder(
        {
          sender: {
            wallet: ADDRESS_ZERO,
          },
        },
        signer
      )
      const errors = await swap.check(sender.address, order)
      expect(errors).to.have.lengthOf(0)
    })

    it('check with incorrect authorized signatory fails', async () => {
      await expect(swap.connect(signer).authorize(anyone.address)).to.emit(
        swap,
        'Authorize'
      )
      const order = await createSignedOrder(
        {
          signer: {
            wallet: signer.address,
          },
        },
        signer
      )
      const errors = await swap.check(sender.address, order)
      expect(errors).to.include(
        ethers.utils.formatBytes32String('Unauthorized')
      )
    })

    it('check with unauthorized signer fails', async () => {
      const order = await createSignedOrder(
        {
          signer: {
            wallet: anyone.address,
          },
        },
        signer
      )
      const errors = await swap.check(sender.address, order)
      expect(errors).to.include(
        ethers.utils.formatBytes32String('Unauthorized')
      )
    })

    it('check with passed expiry fails', async () => {
      const order = await createSignedOrder(
        {
          expiry: '0',
        },
        signer
      )
      const errors = await swap.check(sender.address, order)
      expect(errors).to.include(
        ethers.utils.formatBytes32String('OrderExpired')
      )
    })

    it('check succeeds with affiliate', async () => {
      await erc20token.mock.allowance.returns(DEFAULT_AMOUNT + PROTOCOL_FEE)
      await erc20token.mock.balanceOf.returns(DEFAULT_AMOUNT + PROTOCOL_FEE)
      const order = await createSignedOrder(
        {
          affiliateWallet: affiliate.address,
          affiliateAmount: '1',
        },
        signer
      )
      const errors = await swap.check(sender.address, order)
      expect(errors).to.have.lengthOf(0)
    })

    it('check fails with affiliate higher than sender', async () => {
      await erc20token.mock.allowance.returns(DEFAULT_AMOUNT + PROTOCOL_FEE)
      await erc20token.mock.balanceOf.returns(DEFAULT_AMOUNT + PROTOCOL_FEE)
      const order = await createSignedOrder(
        {
          affiliateWallet: affiliate.address,
          affiliateAmount: +DEFAULT_AMOUNT + 1,
        },
        signer
      )
      const errors = await swap.check(sender.address, order)
      expect(errors).to.include(
        ethers.utils.formatBytes32String('AffiliateAmountInvalid')
      )
    })
  })
})
