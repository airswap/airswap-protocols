const { expect } = require('chai')
const {
  assert: { reverted, equal },
} = require('@airswap/test-utils')
const timeMachine = require('ganache-time-traveler')
const { ADDRESS_ZERO } = require('@airswap/constants')
const {
  createLightOrder,
  lightOrderToParams,
  createLightSignature,
} = require('@airswap/utils')
const { artifacts, ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const IERC20 = artifacts.require('IERC20')

describe('Light Unit', () => {
  let snapshotId
  let light
  let lightFactory
  let signerToken
  let senderToken

  let deployer
  let sender
  let signer
  let feeWallet
  let anyone

  const CHAIN_ID = 31337
  const SIGNER_FEE = 30
  const HIGHER_FEE = 50
  const FEE_DIVISOR = 10000

  async function createSignedOrder(params, signer) {
    const unsignedOrder = createLightOrder({
      signerFee: SIGNER_FEE,
      ...params,
      signerToken: signerToken.address,
      senderToken: senderToken.address,
    })
    return lightOrderToParams({
      ...unsignedOrder,
      ...(await createLightSignature(
        unsignedOrder,
        signer,
        light.address,
        CHAIN_ID
      )),
    })
  }

  beforeEach(async () => {
    const snapshot = await timeMachine.takeSnapshot()
    snapshotId = snapshot['result']
  })

  afterEach(async () => {
    await timeMachine.revertToSnapshot(snapshotId)
  })

  before('get signers and deploy', async () => {
    ;[deployer, sender, signer, feeWallet, anyone] = await ethers.getSigners()

    signerToken = await deployMockContract(deployer, IERC20.abi)
    senderToken = await deployMockContract(deployer, IERC20.abi)
    await signerToken.mock.transferFrom.returns(true)
    await senderToken.mock.transferFrom.returns(true)

    lightFactory = await ethers.getContractFactory('Light')
    light = await lightFactory.deploy(feeWallet.address, SIGNER_FEE)
    await light.deployed()
  })

  describe('Default Values', async () => {
    it('constructor sets default values', async () => {
      const storedFee = await light.signerFee()
      const storedFeeWallet = await light.feeWallet()
      equal(storedFee.toNumber(), SIGNER_FEE)
      equal(storedFeeWallet, feeWallet.address)
    })

    it('test invalid feeWallet', async () => {
      await reverted(
        lightFactory.deploy(ADDRESS_ZERO, SIGNER_FEE),
        'INVALID_FEE_WALLET'
      )
    })

    it('test invalid fee', async () => {
      await reverted(
        lightFactory.deploy(feeWallet.address, 100000000000),
        'INVALID_FEE'
      )
    })
  })

  describe('Test swap', async () => {
    it('test transfers', async () => {
      const order = await createSignedOrder(
        {
          senderAmount: '1',
          signerAmount: '1',
          senderWallet: sender.address,
          signerWallet: signer.address,
        },
        signer
      )

      await expect(light.connect(sender).swap(...order)).to.emit(light, 'Swap')
    })

    it('test authorized signer', async () => {
      const order = await createSignedOrder(
        {
          senderAmount: '1',
          signerAmount: '1',
          senderWallet: sender.address,
          signerWallet: anyone.address,
        },
        signer
      )

      await expect(light.connect(anyone).authorize(signer.address))
        .to.emit(light, 'Authorize')
        .withArgs(signer.address, anyone.address)

      await expect(light.connect(sender).swap(...order)).to.emit(light, 'Swap')
    })

    it('test when signer not authorized', async () => {
      const order = await createSignedOrder(
        {
          nonce: '0',
          senderWallet: sender.address,
          signerWallet: anyone.address,
        },
        signer
      )

      await expect(light.connect(sender).swap(...order)).to.be.revertedWith(
        'UNAUTHORIZED'
      )
    })

    it('test when order is expired', async () => {
      const order = await createSignedOrder(
        {
          expiry: '0',
        },
        signer
      )
      await expect(light.connect(sender).swap(...order)).to.be.revertedWith(
        'EXPIRY_PASSED'
      )
    })

    it('test when nonce has already been used', async () => {
      const order = await createSignedOrder(
        {
          nonce: '0',
          senderWallet: sender.address,
          signerWallet: signer.address,
        },
        signer
      )

      await light.connect(sender).swap(...order)

      await expect(light.connect(sender).swap(...order)).to.be.revertedWith(
        'NONCE_ALREADY_USED'
      )
    })

    it('test when nonce has been cancelled', async () => {
      const order = await createSignedOrder(
        {
          nonce: '0',
          senderWallet: sender.address,
          signerWallet: signer.address,
        },
        signer
      )

      await light.connect(signer).cancel([0])

      await expect(light.connect(sender).swap(...order)).to.be.revertedWith(
        'NONCE_ALREADY_USED'
      )
    })

    it('test invalid signature', async () => {
      const order = await createSignedOrder(
        {
          nonce: '0',
          senderWallet: sender.address,
          signerWallet: signer.address,
        },
        signer
      )

      // Change "v" of signature
      order[7] = 29
      await reverted(light.connect(sender).swap(...order), 'INVALID_SIG')
    })
  })

  describe('Test fees', () => {
    it('test changing fee wallet', async () => {
      await light.connect(deployer).setFeeWallet(anyone.address)

      const storedFeeWallet = await light.feeWallet()
      equal(storedFeeWallet, anyone.address)
    })

    it('test only deployer can change fee wallet', async () => {
      await reverted(
        light.connect(anyone).setFeeWallet(anyone.address),
        'Ownable: caller is not the owner'
      )
    })

    it('test invalid fee wallet', async () => {
      await reverted(
        light.connect(deployer).setFeeWallet(ADDRESS_ZERO),
        'INVALID_FEE_WALLET'
      )
    })

    it('test changing fee', async () => {
      await light.connect(deployer).setFee(HIGHER_FEE)

      const storedSignerFee = await light.signerFee()
      equal(storedSignerFee, HIGHER_FEE)
    })

    it('test only deployer can change fee', async () => {
      await reverted(
        light.connect(anyone).setFee(0),
        'Ownable: caller is not the owner'
      )
    })

    it('test invalid fee', async () => {
      expect(
        light.connect(deployer).setFee(FEE_DIVISOR + 1)
      ).to.be.revertedWith('INVALID_FEE')
    })

    it('test when signed with incorrect fee', async () => {
      const order = await createSignedOrder(
        {
          signerFee: HIGHER_FEE / 2,
        },
        signer
      )

      expect(light.connect(sender).swap(...order)).to.be.revertedWith(
        'UNAUTHORIZED'
      )
    })
  })

  describe('Test authorization', () => {
    it('test authorized is set', async () => {
      await light.connect(anyone).authorize(signer.address)
      equal(await light.authorized(anyone.address), signer.address)
    })

    it('test revoke', async () => {
      await light.connect(anyone).revoke()
      equal(await light.authorized(anyone.address), ADDRESS_ZERO)
    })
  })

  describe('Test cancel', async () => {
    it('test cancellation with no items', async () => {
      await expect(light.connect(signer).cancel([])).to.not.emit(
        light,
        'Cancel'
      )
    })

    it('test cancellation with duplicated items', async () => {
      await expect(light.connect(signer).cancel([1, 1])).to.emit(
        light,
        'Cancel'
      )

      equal(await light.nonceUsed(signer.address, 1), true)
    })

    it('test cancellation of same item twice', async () => {
      await expect(light.connect(signer).cancel([1])).to.emit(light, 'Cancel')
      await expect(light.connect(signer).cancel([1])).to.not.emit(
        light,
        'Cancel'
      )

      equal(await light.nonceUsed(signer.address, 1), true)
    })

    it('test cancellation with one item', async () => {
      await expect(light.connect(signer).cancel([1])).to.emit(light, 'Cancel')
      equal(await light.nonceUsed(signer.address, 1), true)
    })

    it('test an array of nonces, ensure the cancellation of only those orders', async () => {
      await light.connect(signer).cancel([1, 2, 4, 6])
      equal(await light.nonceUsed(signer.address, 1), true)
      equal(await light.nonceUsed(signer.address, 2), true)
      equal(await light.nonceUsed(signer.address, 3), false)
      equal(await light.nonceUsed(signer.address, 4), true)
      equal(await light.nonceUsed(signer.address, 5), false)
      equal(await light.nonceUsed(signer.address, 6), true)
    })
  })
})
