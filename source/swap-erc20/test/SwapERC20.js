const { expect } = require('chai')
const {
  createOrderERC20,
  orderERC20ToParams,
  createOrderERC20Signature,
  ADDRESS_ZERO,
  SECONDS_IN_DAY,
} = require('@airswap/utils')
const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json')
const STAKING = require('@airswap/staking/build/contracts/Staking.sol/Staking.json')

describe('SwapERC20 Unit', () => {
  let snapshotId
  let swap
  let signerToken
  let senderToken
  let staking
  let erc1271

  let deployer
  let sender
  let signer
  let protocolFeeWallet
  let anyone

  const CHAIN_ID = 31337
  const PROTOCOL_FEE = '30'
  const PROTOCOL_FEE_LIGHT = '7'
  const HIGHER_FEE = '50'
  const BONUS_SCALE = '10'
  const BONUS_MAX = '100'
  const FEE_DIVISOR = '10000'
  const DEFAULT_AMOUNT = '10000'
  const DEFAULT_BALANCE = '100000'
  const STAKING_BALANCE = '10000000000'
  const SWAP_FEE =
    (Number.parseInt(DEFAULT_AMOUNT) * Number.parseInt(PROTOCOL_FEE)) /
    Number.parseInt(FEE_DIVISOR)
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

  async function createSignedOrderERC20(params, signatory) {
    const unsignedOrder = createOrderERC20({
      protocolFee: PROTOCOL_FEE,
      signerWallet: signer.address,
      signerToken: signerToken.address,
      signerAmount: DEFAULT_AMOUNT,
      senderWallet: sender.address,
      senderToken: senderToken.address,
      senderAmount: DEFAULT_AMOUNT,
      ...params,
    })
    return orderERC20ToParams({
      ...unsignedOrder,
      ...(await createOrderERC20Signature(
        unsignedOrder,
        signatory,
        swap.address,
        CHAIN_ID
      )),
    })
  }
  async function createSignedPublicOrderERC20(params, signatory) {
    const unsignedOrder = createOrderERC20({
      protocolFee: PROTOCOL_FEE,
      signerWallet: signer.address,
      signerToken: signerToken.address,
      signerAmount: DEFAULT_AMOUNT,
      senderWallet: ADDRESS_ZERO,
      senderToken: senderToken.address,
      senderAmount: DEFAULT_AMOUNT,
      ...params,
    })
    return orderERC20ToParams({
      ...unsignedOrder,
      ...(await createOrderERC20Signature(
        unsignedOrder,
        signatory,
        swap.address,
        CHAIN_ID
      )),
    })
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

  async function checkForErrors(order, senderAddress = sender.address) {
    return await swap.connect(sender).check(senderAddress, ...order)
  }

  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot')
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  before('get signers and deploy', async () => {
    ;[deployer, sender, signer, protocolFeeWallet, anyone] =
      await ethers.getSigners()

    signerToken = await deployMockContract(deployer, IERC20.abi)
    senderToken = await deployMockContract(deployer, IERC20.abi)
    staking = await deployMockContract(deployer, STAKING.abi)
    erc1271 = await deployMockContract(deployer, IS_VALID_SIGNATURE_ABI)
    await signerToken.mock.transferFrom.returns(true)
    await senderToken.mock.transferFrom.returns(true)
    await staking.mock.balanceOf.returns(STAKING_BALANCE)
    await erc1271.mock.isValidSignature.returns(0x1626ba7e)

    swap = await (
      await ethers.getContractFactory('SwapERC20')
    ).deploy(
      PROTOCOL_FEE,
      PROTOCOL_FEE_LIGHT,
      protocolFeeWallet.address,
      BONUS_SCALE,
      BONUS_MAX
    )
    await swap.deployed()
  })

  describe('Constructor', async () => {
    it('constructor sets default values', async () => {
      const storedFee = await swap.protocolFee()
      const storedFeeWallet = await swap.protocolFeeWallet()
      await expect(storedFee).to.equal(PROTOCOL_FEE)
      await expect(storedFeeWallet).to.equal(protocolFeeWallet.address)
    })

    it('test invalid protocolFeeWallet', async () => {
      await expect(
        (
          await ethers.getContractFactory('SwapERC20')
        ).deploy(
          PROTOCOL_FEE,
          PROTOCOL_FEE_LIGHT,
          ADDRESS_ZERO,
          BONUS_SCALE,
          BONUS_MAX
        )
      ).to.be.revertedWith('ProtocolFeeWalletInvalid')
    })

    it('test invalid fee', async () => {
      await expect(
        (
          await ethers.getContractFactory('SwapERC20')
        ).deploy(
          100000000000,
          PROTOCOL_FEE_LIGHT,
          protocolFeeWallet.address,
          BONUS_SCALE,
          BONUS_MAX
        )
      ).to.be.revertedWith('ProtocolFeeInvalid')
    })

    it('test invalid fee light', async () => {
      await expect(
        (
          await ethers.getContractFactory('SwapERC20')
        ).deploy(
          PROTOCOL_FEE,
          100000000000,
          protocolFeeWallet.address,
          BONUS_SCALE,
          BONUS_MAX
        )
      ).to.be.revertedWith('ProtocolFeeLightInvalid')
    })

    it('test invalid bonus scale', async () => {
      await expect(
        (
          await ethers.getContractFactory('SwapERC20')
        ).deploy(
          PROTOCOL_FEE,
          PROTOCOL_FEE_LIGHT,
          protocolFeeWallet.address,
          BONUS_SCALE + 1,
          BONUS_MAX
        )
      ).to.be.revertedWith('ScaleTooHigh')
    })

    it('test invalid bonus maximum', async () => {
      await expect(
        (
          await ethers.getContractFactory('SwapERC20')
        ).deploy(
          PROTOCOL_FEE,
          PROTOCOL_FEE_LIGHT,
          protocolFeeWallet.address,
          BONUS_SCALE,
          BONUS_MAX + 1
        )
      ).to.be.revertedWith('MaxTooHigh')
    })
  })

  describe('Test setters', async () => {
    it('test setProtocolFee', async () => {
      await expect(swap.connect(deployer).setProtocolFee(PROTOCOL_FEE)).to.emit(
        swap,
        'SetProtocolFee'
      )
    })
    it('test setProtocolFee with invalid input', async () => {
      await expect(
        swap.connect(deployer).setProtocolFee(FEE_DIVISOR)
      ).to.be.revertedWith('ProtocolFeeInvalid')
    })
    it('test setProtocolFee as non-owner', async () => {
      await expect(
        swap.connect(anyone).setProtocolFee(FEE_DIVISOR)
      ).to.be.revertedWith('Unauthorized')
    })
    it('test setProtocolFeeLight', async () => {
      await expect(
        swap.connect(deployer).setProtocolFeeLight(PROTOCOL_FEE_LIGHT)
      ).to.emit(swap, 'SetProtocolFeeLight')
    })
    it('test setProtocolFeeLight with invalid input', async () => {
      await expect(
        swap.connect(deployer).setProtocolFeeLight(FEE_DIVISOR)
      ).to.be.revertedWith('ProtocolFeeLightInvalid')
    })
    it('test setProtocolFeeLight as non-owner', async () => {
      await expect(
        swap.connect(anyone).setProtocolFeeLight(FEE_DIVISOR)
      ).to.be.revertedWith('Unauthorized')
    })
    it('test protocolFeeWallet', async () => {
      await expect(
        swap.connect(deployer).setProtocolFeeWallet(protocolFeeWallet.address)
      ).to.emit(swap, 'SetProtocolFeeWallet')
    })
    it('test setBonusScale', async () => {
      await expect(swap.connect(deployer).setBonusScale(BONUS_SCALE)).to.emit(
        swap,
        'SetBonusScale'
      )
    })
    it('test setBonusScale with invalid input', async () => {
      await expect(
        swap.connect(deployer).setBonusScale(BONUS_SCALE + 1)
      ).to.be.revertedWith('ScaleTooHigh')
    })
    it('test setBonusScale as non-owner', async () => {
      await expect(
        swap.connect(anyone).setBonusScale(BONUS_SCALE)
      ).to.be.revertedWith('Unauthorized')
    })
    it('test setBonusMax', async () => {
      await expect(await swap.connect(deployer).setBonusMax(BONUS_MAX)).to.emit(
        swap,
        'SetBonusMax'
      )
    })
    it('test setBonusMax with invalid input', async () => {
      await expect(
        swap.connect(deployer).setBonusMax(BONUS_MAX + 1)
      ).to.be.revertedWith('MaxTooHigh')
    })
    it('test setBonusMax as non-owner', async () => {
      await expect(
        swap.connect(anyone).setBonusMax(BONUS_MAX)
      ).to.be.revertedWith('Unauthorized')
    })
    it('test setStaking', async () => {
      await expect(swap.connect(deployer).setStaking(staking.address)).to.emit(
        swap,
        'SetStaking'
      )
    })
    it('test setStaking with zero address', async () => {
      await expect(
        swap.connect(deployer).setStaking(ADDRESS_ZERO)
      ).to.be.revertedWith('StakingInvalid')
    })
  })

  describe('Test calculateProtocolFee', async () => {
    it('test calculateProtocolFee without staking set', async () => {
      const feeAmount = await swap
        .connect(deployer)
        .calculateProtocolFee(sender.address, DEFAULT_AMOUNT)
      expect(feeAmount).to.equal((DEFAULT_AMOUNT * PROTOCOL_FEE) / FEE_DIVISOR)
    })
    it('test calculateProtocolFee', async () => {
      const initialFeeAmount = (DEFAULT_AMOUNT * PROTOCOL_FEE) / FEE_DIVISOR
      await expect(swap.connect(deployer).setStaking(staking.address)).to.emit(
        swap,
        'SetStaking'
      )
      const bonus = await swap
        .connect(deployer)
        .calculateBonus(STAKING_BALANCE, initialFeeAmount)
      const actualFeeAmount = await swap
        .connect(deployer)
        .calculateProtocolFee(sender.address, DEFAULT_AMOUNT)
      expect(actualFeeAmount).to.equal(initialFeeAmount - bonus)
    })
    it('test calculateProtocolFee with protocol fee as zero', async () => {
      const zeroProtocolFee = 0
      await expect(swap.connect(deployer).setStaking(staking.address)).to.emit(
        swap,
        'SetStaking'
      )
      await swap.connect(deployer).setProtocolFee(zeroProtocolFee)
      const initialFeeAmount = (DEFAULT_AMOUNT * zeroProtocolFee) / FEE_DIVISOR
      const bonus = await swap
        .connect(deployer)
        .calculateBonus(STAKING_BALANCE, initialFeeAmount)
      const actualFeeAmount = await swap
        .connect(deployer)
        .calculateProtocolFee(sender.address, DEFAULT_AMOUNT)
      expect(actualFeeAmount).to.equal(initialFeeAmount - bonus)
    })
  })

  describe('Test swap', async () => {
    it('test swaps', async () => {
      const order = await createSignedOrderERC20({}, signer)

      await expect(swap.connect(sender).swap(sender.address, ...order)).to.emit(
        swap,
        'SwapERC20'
      )
    })

    it('test authorized signer', async () => {
      const order = await createSignedOrderERC20(
        {
          signerWallet: anyone.address,
        },
        signer
      )

      await expect(swap.connect(anyone).authorize(signer.address))
        .to.emit(swap, 'Authorize')
        .withArgs(signer.address, anyone.address)

      await expect(swap.connect(sender).swap(sender.address, ...order)).to.emit(
        swap,
        'SwapERC20'
      )
    })

    it('test authorized signer as contract', async () => {
      const order = await createSignedOrderERC20(
        {
          signerWallet: erc1271.address,
        },
        signer
      )

      await expect(swap.connect(signer).authorize(erc1271.address))
        .to.emit(swap, 'Authorize')
        .withArgs(erc1271.address, signer.address)

      await expect(swap.connect(sender).swap(sender.address, ...order)).to.emit(
        swap,
        'SwapERC20'
      )
    })

    it('test swaps by signer instead of authorized signatory fail', async () => {
      const order = await createSignedOrderERC20(
        {
          signerWallet: signer.address,
        },
        signer
      )

      await expect(swap.connect(signer).authorize(deployer.address))
        .to.emit(swap, 'Authorize')
        .withArgs(deployer.address, signer.address)

      await expect(
        swap.connect(sender).swap(sender.address, ...order)
      ).to.be.revertedWith('SignatureInvalid')
    })

    it('test when signer not authorized', async () => {
      const order = await createSignedOrderERC20(
        {
          signerWallet: anyone.address,
        },
        signer
      )

      await expect(
        swap.connect(sender).swap(sender.address, ...order)
      ).to.be.revertedWith('SignatureInvalid')
    })

    it('test when order is expired', async () => {
      const order = await createSignedOrderERC20(
        {
          expiry: '0',
        },
        signer
      )
      await expect(
        swap.connect(sender).swap(sender.address, ...order)
      ).to.be.revertedWith('OrderExpired')
    })

    it('test when nonce has already been used', async () => {
      const order = await createSignedOrderERC20(
        {
          nonce: '0',
        },
        signer
      )
      await swap.connect(sender).swap(sender.address, ...order)
      await expect(swap.connect(sender).swap(sender.address, ...order))
        .to.be.revertedWith('NonceAlreadyUsed')
        .withArgs(0)
    })

    it('test when nonce has been cancelled', async () => {
      const order = await createSignedOrderERC20(
        {
          nonce: '1',
        },
        signer
      )
      await swap.connect(signer).cancel([1])
      await expect(swap.connect(sender).swap(sender.address, ...order))
        .to.be.revertedWith('NonceAlreadyUsed')
        .withArgs(1)
    })
    it('test when signer is zero address', async () => {
      const order = await createSignedOrderERC20(
        {
          signerWallet: anyone.ADDRESS_ZERO,
        },
        signer
      )

      await expect(
        swap.connect(sender).swap(sender.address, ...order)
      ).to.be.revertedWith('SignatureInvalid')
    })
  })

  describe('Test public swap', async () => {
    it('test public swaps', async () => {
      const order = await createSignedPublicOrderERC20({}, signer)

      await expect(
        swap.connect(sender).swapAnySender(sender.address, ...order)
      ).to.emit(swap, 'SwapERC20')
    })

    it('test authorized signer', async () => {
      const order = await createSignedPublicOrderERC20(
        {
          signerWallet: anyone.address,
        },
        signer
      )

      await expect(swap.connect(anyone).authorize(signer.address))
        .to.emit(swap, 'Authorize')
        .withArgs(signer.address, anyone.address)

      await expect(
        swap.connect(sender).swapAnySender(sender.address, ...order)
      ).to.emit(swap, 'SwapERC20')
    })

    it('test when signer not authorized', async () => {
      const order = await createSignedOrderERC20(
        {
          signerWallet: anyone.address,
        },
        signer
      )

      await expect(
        swap.connect(sender).swapAnySender(sender.address, ...order)
      ).to.be.revertedWith('SignatureInvalid')
    })

    it('test when order is expired', async () => {
      const order = await createSignedOrderERC20(
        {
          expiry: '0',
        },
        signer
      )
      await expect(
        swap.connect(sender).swapAnySender(sender.address, ...order)
      ).to.be.revertedWith('OrderExpired')
    })

    it('test when nonce has already been used', async () => {
      const order = await createSignedPublicOrderERC20(
        {
          nonce: '0',
        },
        signer
      )
      await swap.connect(sender).swapAnySender(sender.address, ...order)
      await expect(swap.connect(sender).swapAnySender(sender.address, ...order))
        .to.be.revertedWith('NonceAlreadyUsed')
        .withArgs(0)
    })

    it('test when nonce has been cancelled', async () => {
      const order = await createSignedPublicOrderERC20(
        {
          nonce: '1',
        },
        signer
      )
      await swap.connect(signer).cancel([1])
      await expect(swap.connect(sender).swapAnySender(sender.address, ...order))
        .to.be.revertedWith('NonceAlreadyUsed')
        .withArgs(1)
    })

    it('test invalid signature', async () => {
      const order = await createSignedOrderERC20({}, signer)
      order[7] = '29' // Change "v" of signature
      await expect(
        swap.connect(sender).swapAnySender(sender.address, ...order)
      ).to.be.revertedWith('SignatureInvalid')
    })
  })

  describe('Test light swap', async () => {
    it('test light swaps', async () => {
      const order = await createSignedOrderERC20(
        {
          protocolFee: PROTOCOL_FEE_LIGHT,
        },
        signer
      )

      await expect(swap.connect(sender).swapLight(...order)).to.emit(
        swap,
        'SwapERC20'
      )
    })

    it('test light swaps with authorized', async () => {
      const order = await createSignedOrderERC20(
        {
          protocolFee: PROTOCOL_FEE_LIGHT,
          signerWallet: anyone.address,
        },
        signer
      )

      await expect(swap.connect(anyone).authorize(signer.address))
        .to.emit(swap, 'Authorize')
        .withArgs(signer.address, anyone.address)

      await expect(swap.connect(sender).swapLight(...order)).to.emit(
        swap,
        'SwapERC20'
      )
    })
    it('test light swaps by signer instead of authorized signatory fail', async () => {
      const order = await createSignedOrderERC20(
        {
          protocolFee: PROTOCOL_FEE_LIGHT,
          signerWallet: anyone.address,
        },
        anyone
      )

      await expect(swap.connect(anyone).authorize(signer.address))
        .to.emit(swap, 'Authorize')
        .withArgs(signer.address, anyone.address)

      await expect(swap.connect(sender).swapLight(...order)).to.be.revertedWith(
        'SignatureInvalid'
      )
    })
    it('test when expiration has passed', async () => {
      const order = await createSignedOrderERC20(
        {
          protocolFee: PROTOCOL_FEE_LIGHT,
        },
        signer
      )
      const block = await ethers.provider.getBlock()
      await ethers.provider.send('evm_mine', [block.timestamp + SECONDS_IN_DAY])
      await expect(swap.connect(sender).swapLight(...order)).to.be.revertedWith(
        'OrderExpired'
      )
    })
    it('test when signatory is invalid', async () => {
      const order = await createSignedOrderERC20({}, signer)
      order[7] = '29' // Change "v" of signature
      await expect(swap.connect(sender).swapLight(...order)).to.be.revertedWith(
        'SignatureInvalid'
      )
    })
    it('test when nonce has already been used', async () => {
      const order = await createSignedOrderERC20(
        {
          protocolFee: PROTOCOL_FEE_LIGHT,
          nonce: '0',
        },
        signer
      )
      await swap.connect(sender).swapLight(...order)
      await expect(swap.connect(sender).swapLight(...order))
        .to.be.revertedWith('NonceAlreadyUsed')
        .withArgs(0)
    })
    it('test when signer not authorized', async () => {
      const order = await createSignedOrderERC20(
        {
          protocolFee: PROTOCOL_FEE_LIGHT,
          signerWallet: signer.address,
        },
        anyone
      )
      await expect(swap.connect(sender).swapLight(...order)).to.be.revertedWith(
        'SignatureInvalid'
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
      ).to.be.revertedWith('Unauthorized')
    })

    it('test invalid fee wallet', async () => {
      await expect(
        swap.connect(deployer).setProtocolFeeWallet(ADDRESS_ZERO)
      ).to.be.revertedWith('ProtocolFeeWalletInvalid')
    })

    it('test changing fee', async () => {
      await swap.connect(deployer).setProtocolFee(HIGHER_FEE)

      const storedSignerFee = await swap.protocolFee()
      expect(storedSignerFee).to.equal(HIGHER_FEE)
    })

    it('test only deployer can change fee', async () => {
      await expect(swap.connect(anyone).setProtocolFee('0')).to.be.revertedWith(
        'Unauthorized'
      )
    })

    it('test zero fee', async () => {
      const order = await createSignedOrderERC20(
        {
          protocolFee: '0',
        },
        signer
      )
      await swap.connect(deployer).setProtocolFee('0')
      await expect(swap.connect(sender).swap(sender.address, ...order)).to.emit(
        swap,
        'SwapERC20'
      )
    })

    it('test invalid fee', async () => {
      await expect(
        swap.connect(deployer).setProtocolFee(FEE_DIVISOR + 1)
      ).to.be.revertedWith('ProtocolFeeInvalid')
    })

    it('test when signed with incorrect fee', async () => {
      const order = await createSignedOrderERC20(
        {
          protocolFee: HIGHER_FEE / 2,
        },
        signer
      )
      await expect(
        swap.connect(sender).swap(sender.address, ...order)
      ).to.be.revertedWith('SignatureInvalid')
    })
  })

  describe('Test staking', async () => {
    it('test set staking by non-owner', async () => {
      await expect(
        swap.connect(anyone).setStaking(staking.address)
      ).to.be.revertedWith('Unauthorized')
    })

    it('test set staking', async () => {
      await expect(swap.connect(deployer).setStaking(staking.address)).to.emit(
        swap,
        'SetStaking'
      )
    })
  })

  describe('Test authorization', async () => {
    it('test authorized is set', async () => {
      await swap.connect(anyone).authorize(signer.address)
      expect(await swap.authorized(anyone.address)).to.equal(signer.address)
    })

    it('test authorize with zero address', async () => {
      await expect(
        swap.connect(deployer).authorize(ADDRESS_ZERO)
      ).to.be.revertedWith('SignatoryInvalid')
    })

    it('test revoke', async () => {
      await swap.connect(anyone).revoke()
      expect(await swap.authorized(anyone.address)).to.equal(ADDRESS_ZERO)
    })
  })

  describe('Test cancel', async () => {
    it('test cancellation with no items', async () => {
      await expect(swap.connect(signer).cancel([])).to.not.emit(swap, 'Cancel')
    })

    it('test cancellation with duplicated items', async () => {
      await expect(swap.connect(signer).cancel([1, 1])).to.emit(swap, 'Cancel')
      expect(await swap.nonceUsed(signer.address, 1)).to.equal(true)
    })

    it('test cancellation of same item twice', async () => {
      await expect(swap.connect(signer).cancel([1])).to.emit(swap, 'Cancel')
      await expect(swap.connect(signer).cancel([1])).to.not.emit(swap, 'Cancel')

      expect(await swap.nonceUsed(signer.address, 1)).to.equal(true)
    })

    it('test cancellation with one item', async () => {
      await expect(swap.connect(signer).cancel([1])).to.emit(swap, 'Cancel')
      expect(await swap.nonceUsed(signer.address, 1)).to.equal(true)
    })

    it('test an array of nonces, ensure the cancellation of only those orders', async () => {
      await swap.connect(signer).cancel([1, 2, 4, 6])
      expect(await swap.nonceUsed(signer.address, 1)).to.equal(true)
      expect(await swap.nonceUsed(signer.address, 2)).to.equal(true)
      expect(await swap.nonceUsed(signer.address, 3)).to.equal(false)
      expect(await swap.nonceUsed(signer.address, 4)).to.equal(true)
      expect(await swap.nonceUsed(signer.address, 5)).to.equal(false)
      expect(await swap.nonceUsed(signer.address, 6)).to.equal(true)
    })
  })

  describe('Test check helper', () => {
    it('checks with a contract as signatory suceeds', async () => {
      await signerToken.mock.allowance.returns(DEFAULT_AMOUNT + PROTOCOL_FEE)
      await signerToken.mock.balanceOf.returns(DEFAULT_AMOUNT + PROTOCOL_FEE)
      await senderToken.mock.allowance.returns(DEFAULT_AMOUNT + PROTOCOL_FEE)
      await senderToken.mock.balanceOf.returns(DEFAULT_AMOUNT + PROTOCOL_FEE)
      const order = await createSignedOrderERC20(
        {
          signer: {
            wallet: signer.address,
          },
        },
        signer
      )
      await expect(swap.connect(signer).authorize(erc1271.address))
      const errors = await checkForErrors(order)
      expect(errors).to.have.lengthOf(0)
    })

    it('test with expired order', async () => {
      await setUpAllowances(DEFAULT_AMOUNT, DEFAULT_AMOUNT + SWAP_FEE)
      await setUpBalances(DEFAULT_BALANCE, DEFAULT_BALANCE)
      const order = await createSignedOrderERC20(
        {
          expiry: '0',
        },
        signer
      )
      const errors = await checkForErrors(order)
      expect(errors).to.include(
        ethers.utils.formatBytes32String('OrderExpired')
      )
    })
    it('test with incorrect signature', async () => {
      await setUpAllowances(DEFAULT_AMOUNT, DEFAULT_AMOUNT + SWAP_FEE)
      await setUpBalances(DEFAULT_BALANCE, DEFAULT_BALANCE)
      const order = await createSignedOrderERC20({}, anyone)
      const errors = await checkForErrors(order)
      expect(errors).to.include(
        ethers.utils.formatBytes32String('SignatureInvalid')
      )
    })
    it('test with low signer allowance', async () => {
      await setUpAllowances(DEFAULT_AMOUNT, 0)
      await setUpBalances(DEFAULT_BALANCE, DEFAULT_BALANCE)
      const order = await createSignedOrderERC20({}, signer)
      const errors = await checkForErrors(order)
      expect(errors).to.include(
        ethers.utils.formatBytes32String('SignerAllowanceLow')
      )
    })
    it('test with low signer balance', async () => {
      await setUpAllowances(DEFAULT_AMOUNT, DEFAULT_AMOUNT + SWAP_FEE)
      await setUpBalances(DEFAULT_BALANCE, 0)
      const order = await createSignedOrderERC20({}, signer)
      const errors = await checkForErrors(order)
      expect(errors).to.include(
        ethers.utils.formatBytes32String('SignerBalanceLow')
      )
    })
    it('test with low sender allowance', async () => {
      await setUpAllowances(0, DEFAULT_AMOUNT + SWAP_FEE)
      await setUpBalances(DEFAULT_BALANCE, DEFAULT_BALANCE)
      const order = await createSignedOrderERC20({}, signer)
      const errors = await checkForErrors(order)
      expect(errors).to.include(
        ethers.utils.formatBytes32String('SenderAllowanceLow')
      )
    })
    it('test with low sender balance', async () => {
      await setUpAllowances(DEFAULT_AMOUNT, DEFAULT_AMOUNT + SWAP_FEE)
      await setUpBalances(0, DEFAULT_BALANCE)
      const order = await createSignedOrderERC20({}, signer)
      const errors = await checkForErrors(order)
      expect(errors).to.include(
        ethers.utils.formatBytes32String('SenderBalanceLow')
      )
    })
    it('test that sender checks are bypassed with null sender wallet', async () => {
      await setUpAllowances(DEFAULT_AMOUNT, DEFAULT_AMOUNT + SWAP_FEE)
      await setUpBalances(0, DEFAULT_BALANCE)
      const order = await createSignedOrderERC20(
        { senderWallet: ADDRESS_ZERO },
        signer
      )
      const errors = await checkForErrors(order, ADDRESS_ZERO)
      expect(errors).to.have.lengthOf(0)
    })
    it('test with nonce that has already been used', async () => {
      await senderToken.mock.transferFrom
        .withArgs(sender.address, signer.address, DEFAULT_AMOUNT)
        .returns(true)
      await signerToken.mock.transferFrom
        .withArgs(signer.address, sender.address, DEFAULT_AMOUNT)
        .returns(true)
      await signerToken.mock.transferFrom
        .withArgs(signer.address, protocolFeeWallet.address, SWAP_FEE)
        .returns(true)
      const order = await createSignedOrderERC20(
        {
          nonce: '1',
        },
        signer
      )
      await swap.connect(sender).swap(sender.address, ...order)
      await setUpAllowances(DEFAULT_AMOUNT, DEFAULT_AMOUNT + SWAP_FEE)
      await setUpBalances(DEFAULT_BALANCE, DEFAULT_BALANCE)
      const errors = await checkForErrors(order)
      expect(errors).to.include(
        ethers.utils.formatBytes32String('NonceAlreadyUsed')
      )
    })
    it('can detect multiple errors', async () => {
      await setUpAllowances(DEFAULT_AMOUNT, DEFAULT_AMOUNT + SWAP_FEE)
      await setUpBalances(DEFAULT_BALANCE, 0)
      const order = await createSignedOrderERC20(
        {
          expiry: '0',
        },
        signer
      )
      const errors = await checkForErrors(order)
      expect(errors).to.include(
        ethers.utils.formatBytes32String('OrderExpired')
      )
      expect(errors).to.include(
        ethers.utils.formatBytes32String('SignerBalanceLow')
      )
    })
  })
})
