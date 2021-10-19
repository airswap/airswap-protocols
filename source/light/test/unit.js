const { expect } = require('chai')
const { ADDRESS_ZERO } = require('@airswap/constants')
const {
  createLightOrder,
  lightOrderToParams,
  createLightSignature,
} = require('@airswap/utils')
const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json')

describe('Light Unit Tests', () => {
  let snapshotId
  let light
  let signerToken
  let senderToken

  let deployer
  let sender
  let signer
  let feeWallet
  let anyone

  const CHAIN_ID = 31337
  const SIGNER_FEE = '30'
  const HIGHER_FEE = '50'
  const CONDITIONAL_SIGNER_FEE = '30'
  const STAKING_REBATE_MINIMUM = '1000000'
  const FEE_DIVISOR = '10000'
  const DEFAULT_AMOUNT = '1000'
  const DEFAULT_BALANCE = '10000'
  const SWAP_FEE =
    (parseInt(DEFAULT_AMOUNT) * parseInt(SIGNER_FEE)) / parseInt(FEE_DIVISOR)

  async function createSignedOrder(params, signatory) {
    const unsignedOrder = createLightOrder({
      signerFee: SIGNER_FEE,
      signerWallet: signer.address,
      signerToken: signerToken.address,
      signerAmount: DEFAULT_AMOUNT,
      senderWallet: sender.address,
      senderToken: senderToken.address,
      senderAmount: DEFAULT_AMOUNT,
      ...params,
    })
    return lightOrderToParams({
      ...unsignedOrder,
      ...(await createLightSignature(
        unsignedOrder,
        signatory,
        light.address,
        CHAIN_ID
      )),
    })
  }

  async function setUpAllowances(senderAmount, signerAmount) {
    await senderToken.mock.allowance
      .withArgs(sender.address, light.address)
      .returns(senderAmount)
    await signerToken.mock.allowance
      .withArgs(signer.address, light.address)
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

  async function getErrorInfo(order) {
    return await light.connect(sender).validate(...order, sender.address)
  }

  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot')
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  before('get signers and deploy', async () => {
    ;[deployer, sender, signer, feeWallet, anyone] = await ethers.getSigners()

    signerToken = await deployMockContract(deployer, IERC20.abi)
    senderToken = await deployMockContract(deployer, IERC20.abi)
    stakingToken = await deployMockContract(deployer, IERC20.abi)
    await signerToken.mock.transferFrom.returns(true)
    await senderToken.mock.transferFrom.returns(true)
    await stakingToken.mock.balanceOf.returns(10000000)

    light = await (
      await ethers.getContractFactory('Light')
    ).deploy(
      feeWallet.address,
      SIGNER_FEE,
      CONDITIONAL_SIGNER_FEE,
      STAKING_REBATE_MINIMUM,
      stakingToken.address
    )
    await light.deployed()
  })

  describe('Constructor', async () => {
    it('constructor sets default values', async () => {
      const storedFee = await light.signerFee()
      const storedFeeWallet = await light.feeWallet()
      await expect(storedFee).to.equal(SIGNER_FEE)
      await expect(storedFeeWallet).to.equal(feeWallet.address)
    })

    it('test invalid feeWallet', async () => {
      await expect(
        (
          await ethers.getContractFactory('Light')
        ).deploy(
          ADDRESS_ZERO,
          SIGNER_FEE,
          CONDITIONAL_SIGNER_FEE,
          STAKING_REBATE_MINIMUM,
          stakingToken.address
        )
      ).to.be.revertedWith('INVALID_FEE_WALLET')
    })

    it('test invalid fee', async () => {
      await expect(
        (
          await ethers.getContractFactory('Light')
        ).deploy(
          feeWallet.address,
          100000000000,
          CONDITIONAL_SIGNER_FEE,
          STAKING_REBATE_MINIMUM,
          stakingToken.address
        )
      ).to.be.revertedWith('INVALID_FEE')
    })
  })

  describe('Test swap', async () => {
    it('test swaps', async () => {
      const order = await createSignedOrder({}, signer)
      await expect(await light.connect(sender).swap(...order)).to.emit(
        light,
        'Swap'
      )
    })

    it('test authorized signer', async () => {
      const order = await createSignedOrder(
        {
          signerWallet: anyone.address,
        },
        signer
      )

      await expect(await light.connect(anyone).authorize(signer.address))
        .to.emit(light, 'Authorize')
        .withArgs(signer.address, anyone.address)

      await expect(await light.connect(sender).swap(...order)).to.emit(
        light,
        'Swap'
      )
    })

    it('test when signer not authorized', async () => {
      const order = await createSignedOrder(
        {
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
          nonce: '1',
        },
        signer
      )
      await light.connect(signer).cancel([1])
      await expect(light.connect(sender).swap(...order)).to.be.revertedWith(
        'NONCE_ALREADY_USED'
      )
    })

    it('test invalid signature', async () => {
      const order = await createSignedOrder({}, signer)
      order[7] = '29' // Change "v" of signature
      await expect(light.connect(sender).swap(...order)).to.be.revertedWith(
        'INVALID_SIG'
      )
    })
  })

  describe('Test fees', async () => {
    it('test changing fee wallet', async () => {
      await light.connect(deployer).setFeeWallet(anyone.address)

      const storedFeeWallet = await light.feeWallet()
      await expect(await storedFeeWallet).to.equal(anyone.address)
    })

    it('test only deployer can change fee wallet', async () => {
      await expect(
        light.connect(anyone).setFeeWallet(anyone.address)
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('test invalid fee wallet', async () => {
      await expect(
        light.connect(deployer).setFeeWallet(ADDRESS_ZERO)
      ).to.be.revertedWith('INVALID_FEE_WALLET')
    })

    it('test changing fee', async () => {
      await light.connect(deployer).setFee(HIGHER_FEE)

      const storedSignerFee = await light.signerFee()
      await expect(await storedSignerFee).to.equal(HIGHER_FEE)
    })

    it('test only deployer can change fee', async () => {
      await expect(light.connect(anyone).setFee('0')).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )
    })

    it('test changing conditional fee', async () => {
      await light.connect(deployer).setConditionalFee(HIGHER_FEE)

      const storedSignerFee = await light.conditionalSignerFee()
      await expect(await storedSignerFee).to.equal(HIGHER_FEE)
    })

    it('test zero fee', async () => {
      const order = await createSignedOrder(
        {
          signerFee: '0',
        },
        signer
      )
      await light.connect(deployer).setFee('0')
      await expect(await light.connect(sender).swap(...order)).to.emit(
        light,
        'Swap'
      )
    })

    it('test invalid fee', async () => {
      await expect(
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
      await expect(light.connect(sender).swap(...order)).to.be.revertedWith(
        'UNAUTHORIZED'
      )
    })
  })

  describe('Test staking', async () => {
    it('test set staking token by non-owner', async () => {
      await expect(
        light.connect(anyone).setStakingToken(stakingToken.address)
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('test set staking token', async () => {
      await expect(
        light.connect(deployer).setStakingToken(stakingToken.address)
      ).to.emit(light, 'SetStakingToken')
    })
  })

  describe('Test authorization', async () => {
    it('test authorized is set', async () => {
      await light.connect(anyone).authorize(signer.address)
      await expect(await light.authorized(anyone.address)).to.equal(
        signer.address
      )
    })

    it('test revoke', async () => {
      await light.connect(anyone).revoke()
      await expect(await light.authorized(anyone.address)).to.equal(
        ADDRESS_ZERO
      )
    })
  })

  describe('Test cancel', async () => {
    it('test cancellation with no items', async () => {
      await expect(await light.connect(signer).cancel([])).to.not.emit(
        light,
        'Cancel'
      )
    })

    it('test cancellation with duplicated items', async () => {
      await expect(await light.connect(signer).cancel([1, 1])).to.emit(
        light,
        'Cancel'
      )
      await expect(await light.nonceUsed(signer.address, 1)).to.equal(true)
    })

    it('test cancellation of same item twice', async () => {
      await expect(await light.connect(signer).cancel([1])).to.emit(
        light,
        'Cancel'
      )
      await expect(await light.connect(signer).cancel([1])).to.not.emit(
        light,
        'Cancel'
      )

      await expect(await light.nonceUsed(signer.address, 1)).to.equal(true)
    })

    it('test cancellation with one item', async () => {
      await expect(await light.connect(signer).cancel([1])).to.emit(
        light,
        'Cancel'
      )
      await expect(await light.nonceUsed(signer.address, 1)).to.equal(true)
    })

    it('test an array of nonces, ensure the cancellation of only those orders', async () => {
      await light.connect(signer).cancel([1, 2, 4, 6])
      await expect(await light.nonceUsed(signer.address, 1)).to.equal(true)
      await expect(await light.nonceUsed(signer.address, 2)).to.equal(true)
      await expect(await light.nonceUsed(signer.address, 3)).to.equal(false)
      await expect(await light.nonceUsed(signer.address, 4)).to.equal(true)
      await expect(await light.nonceUsed(signer.address, 5)).to.equal(false)
      await expect(await light.nonceUsed(signer.address, 6)).to.equal(true)
    })
  })

  describe('validate', () => {
    it('properly detects an invalid signature', async () => {
      await setUpAllowances(DEFAULT_AMOUNT, DEFAULT_AMOUNT + SWAP_FEE)
      await setUpBalances(DEFAULT_BALANCE, DEFAULT_BALANCE)
      const order = await createSignedOrder({}, signer)
      order[7] = '29'
      const [errCount, messages] = await getErrorInfo(order)
      expect(errCount).to.equal(1)
      expect(ethers.utils.parseBytes32String(messages[0])).to.equal(
        'INVALID_SIG'
      )
    })
    it('properly detects an expired order', async () => {
      await setUpAllowances(DEFAULT_AMOUNT, DEFAULT_AMOUNT + SWAP_FEE)
      await setUpBalances(DEFAULT_BALANCE, DEFAULT_BALANCE)
      const order = await createSignedOrder(
        {
          expiry: '0',
        },
        signer
      )
      const [errCount, messages] = await getErrorInfo(order)
      expect(errCount).to.equal(1)
      expect(ethers.utils.parseBytes32String(messages[0])).to.equal(
        'EXPIRY_PASSED'
      )
    })
    it('properly detects an unauthorized signature', async () => {
      await setUpAllowances(DEFAULT_AMOUNT, DEFAULT_AMOUNT + SWAP_FEE)
      await setUpBalances(DEFAULT_BALANCE, DEFAULT_BALANCE)
      const order = await createSignedOrder({}, anyone)
      const [errCount, messages] = await getErrorInfo(order)
      expect(errCount).to.equal(1)
      expect(ethers.utils.parseBytes32String(messages[0])).to.equal(
        'UNAUTHORIZED'
      )
    })
    it('properly detects a low signer allowance', async () => {
      await setUpAllowances(DEFAULT_AMOUNT, 0)
      await setUpBalances(DEFAULT_BALANCE, DEFAULT_BALANCE)
      const order = await createSignedOrder({}, signer)
      const [errCount, messages] = await getErrorInfo(order)
      expect(errCount).to.equal(1)
      expect(ethers.utils.parseBytes32String(messages[0])).to.equal(
        'SIGNER_ALLOWANCE_LOW'
      )
    })
    it('properly detects a low signer balance', async () => {
      await setUpAllowances(DEFAULT_AMOUNT, DEFAULT_AMOUNT + SWAP_FEE)
      await setUpBalances(DEFAULT_BALANCE, 0)
      const order = await createSignedOrder({}, signer)
      const [errCount, messages] = await getErrorInfo(order)
      expect(errCount).to.equal(1)
      expect(ethers.utils.parseBytes32String(messages[0])).to.equal(
        'SIGNER_BALANCE_LOW'
      )
    })
    it('properly detects a nonce that has already been used', async () => {
      await senderToken.mock.transferFrom
        .withArgs(sender.address, signer.address, DEFAULT_AMOUNT)
        .returns(true)
      await signerToken.mock.transferFrom
        .withArgs(signer.address, sender.address, DEFAULT_AMOUNT)
        .returns(true)
      await signerToken.mock.transferFrom
        .withArgs(signer.address, feeWallet.address, SWAP_FEE)
        .returns(true)
      const order = await createSignedOrder(
        {
          nonce: '1',
        },
        signer
      )
      await light.connect(sender).swap(...order)
      await setUpAllowances(DEFAULT_AMOUNT, DEFAULT_AMOUNT + SWAP_FEE)
      await setUpBalances(DEFAULT_BALANCE, DEFAULT_BALANCE)
      const [errCount, messages] = await getErrorInfo(order)
      expect(errCount).to.equal(1)
      expect(ethers.utils.parseBytes32String(messages[0])).to.equal(
        'NONCE_ALREADY_USED'
      )
    })
    it('can detect multiple errors', async () => {
      await setUpAllowances(DEFAULT_AMOUNT, DEFAULT_AMOUNT + SWAP_FEE)
      await setUpBalances(DEFAULT_BALANCE, 0)
      const order = await createSignedOrder(
        {
          expiry: '0',
        },
        signer
      )
      const [errCount, messages] = await getErrorInfo(order)
      expect(errCount).to.equal(2)
      expect(ethers.utils.parseBytes32String(messages[0])).to.equal(
        'EXPIRY_PASSED'
      )
      expect(ethers.utils.parseBytes32String(messages[1])).to.equal(
        'SIGNER_BALANCE_LOW'
      )
    })
  })
})
