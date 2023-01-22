const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const TransferHandler = require('../build/contracts/interfaces/ITransferHandler.sol/ITransferHandler.json')
const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json')
const { createOrder, createOrderSignature } = require('@airswap/utils')
const { tokenKinds, ADDRESS_ZERO } = require('@airswap/constants')

const CHAIN_ID = 31337
const PROTOCOL_FEE = '30'
const HIGHER_FEE = '50'
const FEE_DIVISOR = '10000'
const DEFAULT_AMOUNT = '1000'

let snapshotId
let deployer
let signer
let sender
let affiliate
let token
let transferHandler
let transferHandlerRegistry
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
      token: ADDRESS_ZERO,
      kind: tokenKinds.ERC20,
      id: '0',
      amount: DEFAULT_AMOUNT,
      ...params.signer,
    },
    sender: {
      wallet: sender.address,
      token: ADDRESS_ZERO,
      kind: tokenKinds.ERC20,
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

  before('deploy registry and swap', async () => {
    ;[deployer, sender, signer, affiliate, protocolFeeWallet, anyone] =
      await ethers.getSigners()

    token = await deployMockContract(deployer, IERC20.abi)
    transferHandlerRegistry = await (
      await ethers.getContractFactory('TransferHandlerRegistry')
    ).deploy()
    await transferHandlerRegistry.deployed()
    swap = await (
      await ethers.getContractFactory('Swap')
    ).deploy(
      transferHandlerRegistry.address,
      PROTOCOL_FEE,
      protocolFeeWallet.address
    )
    await swap.deployed()
  })

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

  before(async () => {
    transferHandler = await deployMockContract(deployer, TransferHandler.abi)
    await transferHandler.mock.attemptFeeTransfer.returns(true)
    await transferHandler.mock.hasAllowance.returns(true)
    await transferHandler.mock.hasBalance.returns(true)
    await transferHandler.mock.transferTokens.returns(true)
    await transferHandlerRegistry.addTransferHandler(
      tokenKinds.ERC20,
      transferHandler.address
    )
  })

  it('adding transfer handler as non-owner fails', async () => {
    await expect(
      transferHandlerRegistry
        .connect(anyone)
        .addTransferHandler(tokenKinds.ERC20, transferHandler.address)
    ).to.be.revertedWith('Ownable: caller is not the owner')
  })

  it('adding duplicate transfer handler fails', async () => {
    await expect(
      transferHandlerRegistry.addTransferHandler(
        tokenKinds.ERC20,
        transferHandler.address
      )
    ).to.be.revertedWith('HandlerExistsForKind()')
  })

  it('swap succeeds', async () => {
    const order = await createSignedOrder({}, signer)
    await expect(swap.connect(sender).swap(order)).to.emit(swap, 'Swap')
  })

  it('public swap succeeds', async () => {
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

  it('swap with affiliate succeeds', async () => {
    const order = await createSignedOrder(
      {
        affiliate: {
          wallet: affiliate.address,
          token: token.address,
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
        nonce: '1',
      },
      signer
    )
    await swap.connect(sender).swap(order)
    await expect(swap.connect(sender).swap(order)).to.be.revertedWith(
      'NonceAlreadyUsed(1)'
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
      'NonceAlreadyUsed(1)'
    )
  })

  it('cancel with cancelled nonce fails', async () => {
    await swap.connect(signer).cancel([1])
    await expect(swap.connect(signer).cancel([1])).to.be.revertedWith(
      'NonceAlreadyUsed(1)'
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

  it('swap with nonfungible signer token succeeds', async () => {
    const order = await createSignedOrder({}, signer)
    await transferHandler.mock.attemptFeeTransfer.returns(false)
    await expect(swap.connect(sender).swap(order)).to.emit(swap, 'Swap')
  })

  it('swap with passed expiry fails', async () => {
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

  it('swap with self-transfer fails', async () => {
    const order = await createSignedOrder(
      {
        signer: {
          wallet: signer.address,
        },
        sender: {
          wallet: signer.address,
        },
      },
      signer
    )
    await transferHandler.mock.transferTokens.returns(false)
    await expect(swap.connect(sender).swap(order)).to.be.revertedWith(
      'SenderInvalid()'
    )
  })

  it('swap with another sender fails', async () => {
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
    await transferHandler.mock.transferTokens.returns(false)
    await expect(swap.connect(sender).swap(order)).to.be.revertedWith(
      'SenderInvalid()'
    )
  })

  it('swap with failed token transfer fails', async () => {
    const order = await createSignedOrder({}, signer)
    await transferHandler.mock.transferTokens.returns(false)
    await expect(swap.connect(sender).swap(order)).to.be.revertedWith(
      'TransferFailed()'
    )
  })

  it('swap with invalid kind fails', async () => {
    const order = await createSignedOrder(
      {
        signer: {
          kind: '0x00000000',
        },
      },
      signer
    )
    await expect(swap.connect(sender).swap(order)).to.be.revertedWith(
      'TokenKindUnknown()'
    )
  })

  it('swap with different kinds succeeds', async () => {
    const erc721TransferHandler = await deployMockContract(
      deployer,
      TransferHandler.abi
    )
    await erc721TransferHandler.mock.attemptFeeTransfer.returns(true)
    await erc721TransferHandler.mock.hasAllowance.returns(true)
    await erc721TransferHandler.mock.hasBalance.returns(true)
    await erc721TransferHandler.mock.transferTokens.returns(true)
    await transferHandlerRegistry.addTransferHandler(
      tokenKinds.ERC721,
      erc721TransferHandler.address
    )
    const order = await createSignedOrder(
      {
        signer: {
          kind: tokenKinds.ERC20,
        },
        sender: {
          kind: tokenKinds.ERC721,
        },
      },
      signer
    )
    await expect(swap.connect(sender).swap(order)).to.emit(swap, 'Swap')
  })

  it('swap with bad signature fails', async () => {
    let order = await createSignedOrder({}, signer)
    order = {
      ...order,
      v: '0',
    }
    await expect(swap.connect(sender).swap(order)).to.be.revertedWith(
      'SignatureInvalid()'
    )
  })

  it('swap signed by unauthorized signer fails', async () => {
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

  it('authorizing null address fails', async () => {
    await expect(
      swap.connect(anyone).authorize(ADDRESS_ZERO)
    ).to.be.revertedWith('SignerInvalid()')
  })

  it('swap signed by authorized signer succeeds', async () => {
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

  it('swap signed by revoked authorized signer fails', async () => {
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

    await expect(swap.connect(anyone).revoke())
      .to.emit(swap, 'Revoke')
      .withArgs(signer.address, anyone.address)

    await expect(swap.connect(sender).swap(order)).to.be.revertedWith(
      'Unauthorized()'
    )
  })

  it('check succeeds', async () => {
    const order = await createSignedOrder({}, signer)
    const errors = await swap.check(order)
    expect(errors[1]).to.equal(0)
  })

  it('check without allowances or balances fails', async () => {
    await transferHandler.mock.hasAllowance.returns(false)
    await transferHandler.mock.hasBalance.returns(false)
    const order = await createSignedOrder({}, signer)
    const [errors] = await swap.check(order)
    expect(errors[0]).to.be.equal(
      ethers.utils.formatBytes32String('SignerAllowanceLow')
    )
    expect(errors[1]).to.be.equal(
      ethers.utils.formatBytes32String('SignerBalanceLow')
    )
    expect(errors[2]).to.be.equal(
      ethers.utils.formatBytes32String('SenderAllowanceLow')
    )
    expect(errors[3]).to.be.equal(
      ethers.utils.formatBytes32String('SenderBalanceLow')
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
      ethers.utils.formatBytes32String('SignerTokenKindUnknown')
    )
    expect(errors[1]).to.be.equal(
      ethers.utils.formatBytes32String('SenderTokenKindUnknown')
    )
  })

  it('check with previously used nonce fails', async () => {
    const order = await createSignedOrder(
      {
        nonce: '0',
      },
      signer
    )
    await expect(swap.connect(sender).swap(order)).to.emit(swap, 'Swap')
    const [errors] = await swap.check(order)
    expect(errors[0]).to.be.equal(
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
    const [errors] = await swap.check(order)
    expect(errors[0]).to.be.equal(
      ethers.utils.formatBytes32String('NonceTooLow')
    )
  })

  it('check with bad signature fails', async () => {
    let order = await createSignedOrder({}, signer)
    order = {
      ...order,
      v: '0',
    }
    const [errors] = await swap.check(order)
    expect(errors[0]).to.be.equal(
      ethers.utils.formatBytes32String('SignatureInvalid')
    )
  })

  it('check with passed expiry fails', async () => {
    const order = await createSignedOrder(
      {
        expiry: '0',
      },
      signer
    )
    const [errors] = await swap.check(order)
    expect(errors[0]).to.be.equal(
      ethers.utils.formatBytes32String('OrderExpired')
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
    const [errors] = await swap.check(order)
    expect(errors[0]).to.be.equal(
      ethers.utils.formatBytes32String('Unauthorized')
    )
  })

  it('check with invalid fee fails', async () => {
    const order = await createSignedOrder(
      {
        protocolFee: '0',
      },
      signer
    )
    const [errors] = await swap.check(order)
    expect(errors[0]).to.be.equal(
      ethers.utils.formatBytes32String('Unauthorized')
    )
    expect(errors[1]).to.be.equal(
      ethers.utils.formatBytes32String('InvalidFee')
    )
  })

  it('check succeeds with affiliate', async () => {
    const order = await createSignedOrder(
      {
        affiliate: {
          wallet: affiliate.address,
          token: token.address,
          kind: tokenKinds.ERC20,
          id: '0',
          amount: DEFAULT_AMOUNT,
        },
      },
      signer
    )
    const errors = await swap.check(order)
    expect(errors[1]).to.equal(0)
  })

  it('check fails with affiliate balance insufficient', async () => {
    await transferHandler.mock.hasAllowance.returns(false)
    await transferHandler.mock.hasBalance.returns(false)
    const order = await createSignedOrder(
      {
        affiliate: {
          wallet: affiliate.address,
          token: token.address,
          kind: tokenKinds.ERC20,
          id: '0',
          amount: DEFAULT_AMOUNT,
        },
      },
      signer
    )
    const [errors] = await swap.check(order)
    expect(errors[0]).to.be.equal(
      ethers.utils.formatBytes32String('SignerAllowanceLow')
    )
    expect(errors[1]).to.be.equal(
      ethers.utils.formatBytes32String('SignerBalanceLow')
    )
    expect(errors[2]).to.be.equal(
      ethers.utils.formatBytes32String('SenderAllowanceLow')
    )
    expect(errors[3]).to.be.equal(
      ethers.utils.formatBytes32String('SenderBalanceLow')
    )
    expect(errors[4]).to.be.equal(
      ethers.utils.formatBytes32String('AffiliateAllowanceLow')
    )
    expect(errors[5]).to.be.equal(
      ethers.utils.formatBytes32String('AffiliateBalanceLow')
    )
  })
})
