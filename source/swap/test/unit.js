const { expect } = require('chai')
const { ADDRESS_ZERO, SECONDS_IN_DAY } = require('@airswap/constants')
const {
  createOrder,
  orderToParams,
  createSwapSignature,
} = require('@airswap/utils')
const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json')
const IERC721 = require('@openzeppelin/contracts/build/contracts/IERC721.json')
const STAKING = require('@airswap/staking/build/contracts/Staking.sol/Staking.json')

describe('Swap Unit Tests', () => {
  let snapshotId
  let swap
  let signerToken
  let senderToken
  let staking

  let deployer
  let sender
  let signer
  let protocolFeeWallet
  let anyone

  const CHAIN_ID = 31337
  const PROTOCOL_FEE = '30'
  const PROTOCOL_FEE_LIGHT = '7'
  const HIGHER_FEE = '50'
  const REBATE_SCALE = '10'
  const REBATE_MAX = '100'
  const FEE_DIVISOR = '10000'
  const DEFAULT_AMOUNT = '1000'
  const DEFAULT_BALANCE = '10000'
  const SWAP_FEE =
    (parseInt(DEFAULT_AMOUNT) * parseInt(PROTOCOL_FEE)) / parseInt(FEE_DIVISOR)

  async function createSignedOrder(params, signatory) {
    const unsignedOrder = createOrder({
      protocolFee: PROTOCOL_FEE,
      signerWallet: signer.address,
      signerToken: signerToken.address,
      signerAmount: DEFAULT_AMOUNT,
      senderWallet: sender.address,
      senderToken: senderToken.address,
      senderAmount: DEFAULT_AMOUNT,
      ...params,
    })
    return orderToParams({
      ...unsignedOrder,
      ...(await createSwapSignature(
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

  async function getErrorInfo(order) {
    return await swap.connect(sender).check(sender.address, ...order)
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
    await signerToken.mock.transferFrom.returns(true)
    await senderToken.mock.transferFrom.returns(true)
    await staking.mock.balanceOf.returns(10000000)

    swap = await (
      await ethers.getContractFactory('Swap')
    ).deploy(
      PROTOCOL_FEE,
      PROTOCOL_FEE_LIGHT,
      protocolFeeWallet.address,
      REBATE_SCALE,
      REBATE_MAX,
      staking.address
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
          await ethers.getContractFactory('Swap')
        ).deploy(
          PROTOCOL_FEE,
          PROTOCOL_FEE_LIGHT,
          ADDRESS_ZERO,
          REBATE_SCALE,
          REBATE_MAX,
          staking.address
        )
      ).to.be.revertedWith('INVALID_FEE_WALLET')
    })

    it('test invalid fee', async () => {
      await expect(
        (
          await ethers.getContractFactory('Swap')
        ).deploy(
          100000000000,
          PROTOCOL_FEE_LIGHT,
          protocolFeeWallet.address,
          REBATE_SCALE,
          REBATE_MAX,
          staking.address
        )
      ).to.be.revertedWith('INVALID_FEE')
    })

    it('test invalid fee light', async () => {
      await expect(
        (
          await ethers.getContractFactory('Swap')
        ).deploy(
          PROTOCOL_FEE,
          100000000000,
          protocolFeeWallet.address,
          REBATE_SCALE,
          REBATE_MAX,
          staking.address
        )
      ).to.be.revertedWith('INVALID_FEE')
    })

    it('test invalid rebate scale', async () => {
      await expect(
        (
          await ethers.getContractFactory('Swap')
        ).deploy(
          PROTOCOL_FEE,
          PROTOCOL_FEE_LIGHT,
          protocolFeeWallet.address,
          REBATE_SCALE + 1,
          REBATE_MAX,
          staking.address
        )
      ).to.be.revertedWith('SCALE_TOO_HIGH')
    })

    it('test invalid rebate maximum', async () => {
      await expect(
        (
          await ethers.getContractFactory('Swap')
        ).deploy(
          PROTOCOL_FEE,
          PROTOCOL_FEE_LIGHT,
          protocolFeeWallet.address,
          REBATE_SCALE,
          REBATE_MAX + 1,
          staking.address
        )
      ).to.be.revertedWith('MAX_TOO_HIGH')
    })

    it('test invalid rebate maximum', async () => {
      await expect(
        (
          await ethers.getContractFactory('Swap')
        ).deploy(
          PROTOCOL_FEE,
          PROTOCOL_FEE_LIGHT,
          protocolFeeWallet.address,
          REBATE_SCALE,
          REBATE_MAX,
          ADDRESS_ZERO
        )
      ).to.be.revertedWith('INVALID_STAKING')
    })
  })

  describe('Test setters', async () => {
    it('test setProtocolFee', async () => {
      await expect(swap.connect(deployer).setProtocolFee(PROTOCOL_FEE)).to.emit(
        swap,
        'SetProtocolFee'
      )
    })
    it('test setProtocolFeeLight', async () => {
      await expect(
        swap.connect(deployer).setProtocolFeeLight(PROTOCOL_FEE_LIGHT)
      ).to.emit(swap, 'SetProtocolFeeLight')
    })
    it('test setProtocolFeeLight with invalid input', async () => {
      await expect(
        swap.connect(deployer).setProtocolFeeLight(FEE_DIVISOR)
      ).to.be.revertedWith('INVALID_FEE_LIGHT')
    })
    it('test protocolFeeWallet', async () => {
      await expect(
        swap.connect(deployer).setProtocolFeeWallet(protocolFeeWallet.address)
      ).to.emit(swap, 'SetProtocolFeeWallet')
    })
    it('test setRebateScale', async () => {
      await expect(swap.connect(deployer).setRebateScale(REBATE_SCALE)).to.emit(
        swap,
        'SetRebateScale'
      )
    })
    it('test setRebateScale with invalid input', async () => {
      await expect(
        swap.connect(deployer).setRebateScale(REBATE_SCALE + 1)
      ).to.be.revertedWith('SCALE_TOO_HIGH')
    })
    it('test setRebateMax', async () => {
      await expect(
        await swap.connect(deployer).setRebateMax(REBATE_MAX)
      ).to.emit(swap, 'SetRebateMax')
    })
    it('test setRebateMax with invalid input', async () => {
      await expect(
        swap.connect(deployer).setRebateMax(REBATE_MAX + 1)
      ).to.be.revertedWith('MAX_TOO_HIGH')
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
      ).to.be.revertedWith('INVALID_FEE_WALLET')
    })
  })

  describe('Test calculateProtocolFee', async () => {
    it('test calculateProtocolFee', async () => {
      const initialFeeAmount = (DEFAULT_AMOUNT * PROTOCOL_FEE) / FEE_DIVISOR
      const discount = await swap
        .connect(deployer)
        .calculateDiscount(10000000, initialFeeAmount)
      const actualFeeAmount = await swap
        .connect(deployer)
        .calculateProtocolFee(sender.address, DEFAULT_AMOUNT)
      expect(actualFeeAmount).to.equal(initialFeeAmount - discount)
    })
    it('test calculateProtocolFee with protocol fee as zero', async () => {
      const zeroProtocolFee = 0
      await swap.connect(deployer).setProtocolFee(zeroProtocolFee)
      const initialFeeAmount = (DEFAULT_AMOUNT * zeroProtocolFee) / FEE_DIVISOR
      const discount = await swap
        .connect(deployer)
        .calculateDiscount(10000000, initialFeeAmount)
      const actualFeeAmount = await swap
        .connect(deployer)
        .calculateProtocolFee(sender.address, DEFAULT_AMOUNT)
      expect(actualFeeAmount).to.equal(initialFeeAmount - discount)
    })
  })

  describe('Test swap', async () => {
    it('test swaps', async () => {
      const order = await createSignedOrder({}, signer)

      await expect(swap.connect(sender).swap(sender.address, ...order)).to.emit(
        swap,
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

      await expect(swap.connect(anyone).authorize(signer.address))
        .to.emit(swap, 'Authorize')
        .withArgs(signer.address, anyone.address)

      await expect(swap.connect(sender).swap(sender.address, ...order)).to.emit(
        swap,
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

      await expect(
        swap.connect(sender).swap(sender.address, ...order)
      ).to.be.revertedWith('UNAUTHORIZED')
    })

    it('test when order is expired', async () => {
      const order = await createSignedOrder(
        {
          expiry: '0',
        },
        signer
      )
      await expect(
        swap.connect(sender).swap(sender.address, ...order)
      ).to.be.revertedWith('EXPIRY_PASSED')
    })

    it('test when nonce has already been used', async () => {
      const order = await createSignedOrder(
        {
          nonce: '0',
        },
        signer
      )
      await swap.connect(sender).swap(sender.address, ...order)
      await expect(
        swap.connect(sender).swap(sender.address, ...order)
      ).to.be.revertedWith('NONCE_ALREADY_USED')
    })

    it('test when nonce has been cancelled', async () => {
      const order = await createSignedOrder(
        {
          nonce: '1',
        },
        signer
      )
      await swap.connect(signer).cancel([1])
      await expect(
        swap.connect(sender).swap(sender.address, ...order)
      ).to.be.revertedWith('NONCE_ALREADY_USED')
    })

    it('test invalid signature', async () => {
      const order = await createSignedOrder({}, signer)
      order[7] = '29' // Change "v" of signature
      await expect(
        swap.connect(sender).swap(sender.address, ...order)
      ).to.be.revertedWith('SIGNATURE_INVALID')
    })
  })

  describe('Test light swap', async () => {
    it('test light swaps', async () => {
      const order = await createSignedOrder(
        {
          protocolFee: PROTOCOL_FEE_LIGHT,
        },
        signer
      )

      await expect(swap.connect(sender).light(...order)).to.emit(swap, 'Swap')
    })
    it('test light swaps with authorized', async () => {
      const order = await createSignedOrder(
        {
          protocolFee: PROTOCOL_FEE_LIGHT,
          signerWallet: anyone.address,
        },
        signer
      )

      await expect(swap.connect(anyone).authorize(signer.address))
        .to.emit(swap, 'Authorize')
        .withArgs(signer.address, anyone.address)

      await expect(swap.connect(sender).light(...order)).to.emit(swap, 'Swap')
    })
    it('test when expiration has passed', async () => {
      const order = await createSignedOrder(
        {
          protocolFee: PROTOCOL_FEE_LIGHT,
        },
        signer
      )
      const block = await ethers.provider.getBlock()
      await ethers.provider.send('evm_mine', [block.timestamp + SECONDS_IN_DAY])
      await expect(swap.connect(sender).light(...order)).to.be.revertedWith(
        'EXPIRY_PASSED'
      )
    })
    it('test when signatory is invalid', async () => {
      const order = await createSignedOrder({}, signer)
      order[7] = '29' // Change "v" of signature
      await expect(swap.connect(sender).light(...order)).to.be.revertedWith(
        'SIGNATURE_INVALID'
      )
    })
    it('test when nonce has already been used', async () => {
      const order = await createSignedOrder(
        {
          protocolFee: PROTOCOL_FEE_LIGHT,
          nonce: '0',
        },
        signer
      )
      await swap.connect(sender).light(...order)
      await expect(swap.connect(sender).light(...order)).to.be.revertedWith(
        'NONCE_ALREADY_USED'
      )
    })
    it('test when signer not authorized', async () => {
      const order = await createSignedOrder(
        {
          protocolFee: PROTOCOL_FEE_LIGHT,
          signerWallet: signer.address,
        },
        anyone
      )
      await expect(swap.connect(sender).light(...order)).to.be.revertedWith(
        'UNAUTHORIZED'
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
      ).to.be.revertedWith('INVALID_FEE_WALLET')
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
      await expect(swap.connect(sender).swap(sender.address, ...order)).to.emit(
        swap,
        'Swap'
      )
    })

    it('test invalid fee', async () => {
      await expect(
        swap.connect(deployer).setProtocolFee(FEE_DIVISOR + 1)
      ).to.be.revertedWith('INVALID_FEE')
    })

    it('test when signed with incorrect fee', async () => {
      const order = await createSignedOrder(
        {
          protocolFee: HIGHER_FEE / 2,
        },
        signer
      )
      await expect(
        swap.connect(sender).swap(sender.address, ...order)
      ).to.be.revertedWith('UNAUTHORIZED')
    })
  })

  describe('Test NFTs', async () => {
    before(async () => {
      signerNFT = await deployMockContract(deployer, IERC721.abi)
      senderNFT = await deployMockContract(deployer, IERC721.abi)
      await signerNFT.mock.transferFrom.returns()
      await senderNFT.mock.transferFrom.returns()
    })
    it('test buy NFT', async () => {
      const order = await createSignedOrder(
        {
          signerToken: signerNFT.address,
          signerAmount: '123',
        },
        signer
      )
      await expect(swap.connect(sender).buyNFT(...order)).to.emit(swap, 'Swap')
    })
    it('test sell NFT', async () => {
      const order = await createSignedOrder(
        {
          signerToken: signerNFT.address,
          signerAmount: '123',
        },
        signer
      )
      await expect(swap.connect(sender).sellNFT(...order)).to.emit(swap, 'Swap')
    })
    it('test swap NFT', async () => {
      const order = await createSignedOrder(
        {
          signerToken: signerNFT.address,
          signerAmount: '123',
        },
        signer
      )
      await expect(swap.connect(sender).swapNFTs(...order)).to.emit(
        swap,
        'Swap'
      )
    })
  })

  describe('Test staking', async () => {
    it('test set staking by non-owner', async () => {
      await expect(
        swap.connect(anyone).setStaking(staking.address)
      ).to.be.revertedWith('Ownable: caller is not the owner')
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
      ).to.be.revertedWith('SIGNER_INVALID')
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

  describe('Test validate', () => {
    it('properly detects an invalid signature', async () => {
      await setUpAllowances(DEFAULT_AMOUNT, DEFAULT_AMOUNT + SWAP_FEE)
      await setUpBalances(DEFAULT_BALANCE, DEFAULT_BALANCE)
      const order = await createSignedOrder({}, signer)
      order[7] = '29'
      const [errCount, messages] = await getErrorInfo(order)
      expect(errCount).to.equal(1)
      expect(ethers.utils.parseBytes32String(messages[0])).to.equal(
        'SIGNATURE_INVALID'
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
        .withArgs(signer.address, protocolFeeWallet.address, SWAP_FEE)
        .returns(true)
      const order = await createSignedOrder(
        {
          nonce: '1',
        },
        signer
      )
      await swap.connect(sender).swap(sender.address, ...order)
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
