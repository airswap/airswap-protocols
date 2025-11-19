const { expect } = require('chai')

const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json')
const SWAP_ERC20 = require('@airswap/swap-erc20/build/contracts/SwapERC20.sol/SwapERC20.json')
const {
  ADDRESS_ZERO,
  createOrderERC20,
  createOrderERC20Signature,
  SECONDS_IN_DAY,
} = require('@airswap/utils')
const CHAIN_ID = 31337
const DEFAULT_BALANCE = '100000'
const DEFAULT_SENDER_AMOUNT = '5000'
const DEFAULT_SIGNER_AMOUNT = '10000'
const PROTOCOL_FEE = '5'
const REBATE_SCALE = '10'
const REBATE_MAX = '100'
const UPDATE_SWAP_ERC20_ADDRESS = '0x0000000000000000000000000000000000001337'
const RULE_EXPIRY =
  Math.round(Date.now() / 1000 + SECONDS_IN_DAY).toString() + 1

describe('DelegateERC20 Unit', () => {
  let deployer
  let sender
  let signer
  let swapERC20
  let senderToken
  let signerToken
  let delegate
  let manager
  let snapshotId

  async function createSignedOrderERC20(params, signatory) {
    const unsignedOrder = createOrderERC20({
      protocolFee: PROTOCOL_FEE,
      signerWallet: signer.address,
      signerToken: signerToken.address,
      signerAmount: DEFAULT_SIGNER_AMOUNT,
      senderWallet: delegate.address,
      senderToken: senderToken.address,
      senderAmount: DEFAULT_SENDER_AMOUNT,
      ...params,
    })
    return {
      ...unsignedOrder,
      ...(await createOrderERC20Signature(
        unsignedOrder,
        signatory,
        swapERC20.address,
        CHAIN_ID
      )),
    }
  }

  async function setUpAllowances(
    senderWallet,
    senderAmount,
    signerWallet,
    signerAmount
  ) {
    await senderToken.mock.allowance
      .withArgs(senderWallet, delegate.address)
      .returns(senderAmount)
    await signerToken.mock.allowance
      .withArgs(signerWallet, swapERC20.address)
      .returns(signerAmount)
  }

  async function setUpBalances(senderWallet, signerWallet) {
    await senderToken.mock.balanceOf
      .withArgs(senderWallet)
      .returns(DEFAULT_BALANCE)
    await signerToken.mock.balanceOf
      .withArgs(signerWallet)
      .returns(DEFAULT_BALANCE)
    await signerToken.mock.balanceOf
      .withArgs(delegate.address)
      .returns(DEFAULT_SIGNER_AMOUNT)
  }

  async function setUpApprovals(senderAmount, signerAmount) {
    await senderToken.mock.approve
      .withArgs(delegate.address, senderAmount)
      .returns(true)

    await senderToken.mock.approve
      .withArgs(swapERC20.address, senderAmount)
      .returns(true)

    await signerToken.mock.approve
      .withArgs(swapERC20.address, signerAmount)
      .returns(true)
  }

  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot')
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  before(async () => {
    ;[deployer, sender, signer, manager, anyone, feeReceiver] = await ethers.getSigners()

    const swapERC20Factory = await ethers.getContractFactory(
      SWAP_ERC20.abi,
      SWAP_ERC20.bytecode
    )
    swapERC20 = await swapERC20Factory.deploy(
      PROTOCOL_FEE,
      PROTOCOL_FEE,
      deployer.address,
      REBATE_SCALE,
      REBATE_MAX
    )

    // Authorize fee receiver in SwapERC20
    await swapERC20.connect(deployer).setFeeReceiver(feeReceiver.address)

    delegate = await (
      await ethers.getContractFactory('DelegateERC20')
    ).deploy(swapERC20.address)
    await delegate.deployed()

    // Set fee receiver in DelegateERC20
    await delegate.connect(deployer).setFeeReceiver(feeReceiver.address)

    senderToken = await deployMockContract(deployer, IERC20.abi)
    signerToken = await deployMockContract(deployer, IERC20.abi)
    await senderToken.mock.transferFrom.returns(true)
    await signerToken.mock.transferFrom.returns(true)
    await senderToken.mock.transfer.returns(true)
    await signerToken.mock.transfer.returns(true)

    await setUpApprovals(DEFAULT_SENDER_AMOUNT, DEFAULT_SIGNER_AMOUNT)
  })

  describe('Constructor and admin functions', async () => {
    it('swap ERC20 address is set', async () => {
      expect(await delegate.swapERC20Contract()).to.equal(swapERC20.address)
    })

    it('sets the swapERC20Contract address', async () => {
      await delegate.setSwapERC20Contract(UPDATE_SWAP_ERC20_ADDRESS)
      expect(await delegate.swapERC20Contract()).to.equal(
        UPDATE_SWAP_ERC20_ADDRESS
      )
    })

    it('the swapERC20Contract address cannot be address(0)', async () => {
      await expect(
        delegate.setSwapERC20Contract(ADDRESS_ZERO)
      ).to.be.revertedWith('AddressInvalid')
    })

    it('only the owner can set the swapERC20Contract address', async () => {
      await expect(
        delegate.connect(anyone).setSwapERC20Contract(UPDATE_SWAP_ERC20_ADDRESS)
      ).to.be.revertedWith('Unauthorized')
    })
    it('test setFeeReceiver', async () => {
      await expect(delegate.connect(deployer).setFeeReceiver(anyone.address)).to.emit(
        delegate,
        'SetFeeReceiver'
      )
      expect(await delegate.feeReceiver()).to.equal(anyone.address)
    })
    it('test setFeeReceiver with zero address', async () => {
      await expect(
        delegate.connect(deployer).setFeeReceiver(ADDRESS_ZERO)
      ).to.be.revertedWith('AddressInvalid')
    })
    it('test setFeeReceiver as non-owner', async () => {
      await expect(
        delegate.connect(anyone).setFeeReceiver(anyone.address)
      ).to.be.revertedWith('Unauthorized')
    })
    it('test swapERC20 fails when fee receiver not set', async () => {
      const newDelegate = await (
        await ethers.getContractFactory('DelegateERC20')
      ).deploy(swapERC20.address)
      await newDelegate.deployed()

      await newDelegate
        .connect(sender)
        .setRuleERC20(
          sender.address,
          senderToken.address,
          DEFAULT_SENDER_AMOUNT,
          signerToken.address,
          DEFAULT_SIGNER_AMOUNT,
          RULE_EXPIRY
        )

      const order = await createSignedOrderERC20({}, signer)

      await expect(
        newDelegate.connect(signer).swapERC20(sender.address, order, feeReceiver.address)
      ).to.be.revertedWith('FeeReceiverNotSet')
    })
    it('test swapERC20 fails when fee receiver mismatch', async () => {
      const order = await createSignedOrderERC20({}, signer)

      await delegate
        .connect(sender)
        .setRuleERC20(
          sender.address,
          senderToken.address,
          DEFAULT_SENDER_AMOUNT,
          signerToken.address,
          DEFAULT_SIGNER_AMOUNT,
          RULE_EXPIRY
        )

      await expect(
        delegate.connect(signer).swapERC20(sender.address, order, anyone.address)
      ).to.be.revertedWith('FeeReceiverMismatch')
    })
  })

  describe('RulesERC20', async () => {
    it('sets a Rule', async () => {
      await expect(
        delegate
          .connect(sender)
          .setRuleERC20(
            sender.address,
            senderToken.address,
            DEFAULT_SENDER_AMOUNT,
            signerToken.address,
            DEFAULT_SIGNER_AMOUNT,
            RULE_EXPIRY
          )
      )
        .to.emit(delegate, 'SetRuleERC20')
        .withArgs(
          sender.address,
          senderToken.address,
          DEFAULT_SENDER_AMOUNT,
          signerToken.address,
          DEFAULT_SIGNER_AMOUNT,
          RULE_EXPIRY
        )
    })

    it('unsets a Rule', async () => {
      await expect(
        delegate
          .connect(sender)
          .unsetRuleERC20(
            sender.address,
            senderToken.address,
            signerToken.address
          )
      )
        .to.emit(delegate, 'UnsetRuleERC20')
        .withArgs(sender.address, senderToken.address, signerToken.address)
    })

    it('a manager can set a Rule', async () => {
      await delegate.connect(sender).authorize(manager.address)
      await expect(
        delegate
          .connect(manager)
          .setRuleERC20(
            sender.address,
            senderToken.address,
            DEFAULT_SENDER_AMOUNT,
            signerToken.address,
            DEFAULT_SIGNER_AMOUNT,
            RULE_EXPIRY
          )
      )
        .to.emit(delegate, 'SetRuleERC20')
        .withArgs(
          sender.address,
          senderToken.address,
          DEFAULT_SENDER_AMOUNT,
          signerToken.address,
          DEFAULT_SIGNER_AMOUNT,
          RULE_EXPIRY
        )
    })

    it('an unauthorized manager cannot set a rule', async () => {
      await delegate.connect(sender).authorize(manager.address)
      await expect(
        delegate
          .connect(signer)
          .setRuleERC20(
            sender.address,
            senderToken.address,
            DEFAULT_SENDER_AMOUNT,
            signerToken.address,
            DEFAULT_SIGNER_AMOUNT,
            RULE_EXPIRY
          )
      ).to.be.revertedWith('SenderInvalid')
    })

    it('a manager cannot set a rule without prior authorization', async () => {
      await expect(
        delegate
          .connect(manager)
          .setRuleERC20(
            sender.address,
            senderToken.address,
            DEFAULT_SENDER_AMOUNT,
            signerToken.address,
            DEFAULT_SIGNER_AMOUNT,
            RULE_EXPIRY
          )
      ).to.be.revertedWith('SenderInvalid')
    })

    it('a manager can unset a Rule', async () => {
      await delegate.connect(sender).authorize(manager.address)
      await delegate
        .connect(manager)
        .setRuleERC20(
          sender.address,
          senderToken.address,
          DEFAULT_SENDER_AMOUNT,
          signerToken.address,
          DEFAULT_SIGNER_AMOUNT,
          RULE_EXPIRY
        )

      await expect(
        delegate
          .connect(manager)
          .unsetRuleERC20(
            sender.address,
            senderToken.address,
            signerToken.address
          )
      )
        .to.emit(delegate, 'UnsetRuleERC20')
        .withArgs(sender.address, senderToken.address, signerToken.address)
    })

    it('an unauthorized manager cannot unset a rule', async () => {
      await delegate.connect(sender).authorize(manager.address)
      await delegate
        .connect(manager)
        .setRuleERC20(
          sender.address,
          senderToken.address,
          DEFAULT_SENDER_AMOUNT,
          signerToken.address,
          DEFAULT_SIGNER_AMOUNT,
          RULE_EXPIRY
        )

      await expect(
        delegate
          .connect(signer)
          .unsetRuleERC20(
            sender.address,
            senderToken.address,
            signerToken.address
          )
      ).to.be.revertedWith('SenderInvalid')
    })

    it('a revoked manager cannot unset a rule', async () => {
      await delegate.connect(sender).authorize(manager.address)
      await delegate
        .connect(manager)
        .setRuleERC20(
          sender.address,
          senderToken.address,
          DEFAULT_SENDER_AMOUNT,
          signerToken.address,
          DEFAULT_SIGNER_AMOUNT,
          RULE_EXPIRY
        )

      await delegate.connect(sender).revoke()

      await expect(
        delegate
          .connect(manager)
          .unsetRuleERC20(
            sender.address,
            senderToken.address,
            signerToken.address
          )
      ).to.be.revertedWith('SenderInvalid')
    })

    it('setting a Rule updates the rule balance', async () => {
      await delegate
        .connect(sender)
        .setRuleERC20(
          sender.address,
          senderToken.address,
          DEFAULT_SENDER_AMOUNT,
          signerToken.address,
          DEFAULT_SIGNER_AMOUNT,
          RULE_EXPIRY
        )

      const rule = await delegate.rulesERC20(
        sender.address,
        senderToken.address,
        signerToken.address
      )

      expect(rule.senderAmount.toString()).to.equal(DEFAULT_SENDER_AMOUNT)
    })

    it('unsetting a Rule updates the rule balance', async () => {
      await delegate
        .connect(sender)
        .setRuleERC20(
          sender.address,
          senderToken.address,
          DEFAULT_SENDER_AMOUNT,
          signerToken.address,
          DEFAULT_SIGNER_AMOUNT,
          RULE_EXPIRY
        )

      let rule = await delegate.rulesERC20(
        sender.address,
        senderToken.address,
        signerToken.address
      )

      await delegate
        .connect(sender)
        .unsetRuleERC20(
          sender.address,
          senderToken.address,
          signerToken.address
        )

      rule = await delegate.rulesERC20(
        sender.address,
        senderToken.address,
        signerToken.address
      )

      expect(rule.senderAmount.toString()).to.equal('0')
    })
  })

  describe('Test authorization', async () => {
    it('test authorized is set', async () => {
      await delegate.connect(anyone).authorize(signer.address)
      expect(await delegate.authorized(anyone.address)).to.equal(signer.address)
    })

    it('test authorize with zero address', async () => {
      await expect(
        delegate.connect(deployer).authorize(ADDRESS_ZERO)
      ).to.be.revertedWith('ManagerInvalid')
    })

    it('test revoke', async () => {
      await delegate.connect(anyone).revoke()
      expect(await delegate.authorized(anyone.address)).to.equal(ADDRESS_ZERO)
    })
  })

  describe('SwapERC20', async () => {
    it('successfully swaps', async () => {
      await delegate
        .connect(sender)
        .setRuleERC20(
          sender.address,
          senderToken.address,
          DEFAULT_SENDER_AMOUNT,
          signerToken.address,
          DEFAULT_SIGNER_AMOUNT,
          RULE_EXPIRY
        )

      const order = await createSignedOrderERC20({}, signer)

      await setUpAllowances(
        sender.address,
        DEFAULT_SENDER_AMOUNT,
        signer.address,
        DEFAULT_SIGNER_AMOUNT + PROTOCOL_FEE
      )
      await setUpBalances(signer.address, sender.address)

      await expect(
        delegate.connect(signer).swapERC20(sender.address, order, feeReceiver.address)
      ).to.emit(delegate, 'DelegatedSwapERC20For')
    })

    it('successfully swaps with rounded-down values - Upper bound', async () => {
      const senderAmount = '1100'
      const signerAmount = '1600'

      await delegate
        .connect(sender)
        .setRuleERC20(
          sender.address,
          senderToken.address,
          senderAmount,
          signerToken.address,
          signerAmount,
          RULE_EXPIRY
        )

      //1100 * 10 / 220 = 5000
      const senderPartialFill = (
        (BigInt(senderAmount) * BigInt(10)) /
        BigInt(220)
      ).toString()

      //1600 * 10 / 22 = 72.7272727...
      // rounds down to 72
      const signerPartialFill = (
        (BigInt(signerAmount) * BigInt(10)) /
        BigInt(220)
      ).toString()

      expect(signerPartialFill).to.equal('72')

      const order = await createSignedOrderERC20(
        {
          senderAmount: senderPartialFill,
          signerAmount: signerPartialFill,
        },
        signer
      )

      await setUpAllowances(
        sender.address,
        senderPartialFill,
        signer.address,
        (BigInt(signerPartialFill) + BigInt(PROTOCOL_FEE)).toString()
      )
      await setUpBalances(signer.address, sender.address)

      await setUpApprovals(
        senderPartialFill,
        (BigInt(signerPartialFill) + BigInt(PROTOCOL_FEE)).toString()
      )

      await expect(
        delegate.connect(signer).swapERC20(sender.address, order, feeReceiver.address)
      ).to.emit(delegate, 'DelegatedSwapERC20For')
    })

    it('successfully swaps with rounded-down values - Lower bound', async () => {
      const senderAmount = '1100'
      const signerAmount = '1600'

      await delegate
        .connect(sender)
        .setRuleERC20(
          sender.address,
          senderToken.address,
          senderAmount,
          signerToken.address,
          signerAmount,
          RULE_EXPIRY
        )

      //1100 * 10 / 22 = 500
      const senderPartialFill = (
        (BigInt(senderAmount) * BigInt(10)) /
        BigInt(22)
      ).toString()

      //1600 * 10 / 22 = 727.272727...
      // rounds down to 727
      const signerPartialFill = (
        (BigInt(signerAmount) * BigInt(10)) /
        BigInt(22)
      ).toString()

      expect(signerPartialFill).to.equal('727')

      const order = await createSignedOrderERC20(
        {
          senderAmount: senderPartialFill,
          signerAmount: signerPartialFill,
        },
        signer
      )
      await setUpAllowances(
        sender.address,
        senderPartialFill,
        signer.address,
        (BigInt(signerPartialFill) + BigInt(PROTOCOL_FEE)).toString()
      )
      await setUpBalances(signer.address, sender.address)
      await setUpApprovals(
        senderPartialFill,
        (BigInt(signerPartialFill) + BigInt(PROTOCOL_FEE)).toString()
      )
      await expect(
        delegate.connect(signer).swapERC20(sender.address, order, feeReceiver.address)
      ).to.emit(delegate, 'DelegatedSwapERC20For')
    })

    it('successfully swaps with a manager', async () => {
      await delegate.connect(sender).authorize(manager.address)

      await delegate
        .connect(manager)
        .setRuleERC20(
          sender.address,
          senderToken.address,
          DEFAULT_SENDER_AMOUNT,
          signerToken.address,
          DEFAULT_SIGNER_AMOUNT,
          RULE_EXPIRY
        )

      const order = await createSignedOrderERC20({}, signer)

      await setUpAllowances(
        sender.address,
        DEFAULT_SENDER_AMOUNT,
        signer.address,
        DEFAULT_SIGNER_AMOUNT + PROTOCOL_FEE
      )
      await setUpBalances(signer.address, sender.address)

      await expect(
        delegate.connect(signer).swapERC20(sender.address, order, feeReceiver.address)
      ).to.emit(delegate, 'DelegatedSwapERC20For')
    })

    it('fails to swap with no rule', async () => {
      const order = await createSignedOrderERC20({}, signer)

      await setUpAllowances(
        signer.address,
        DEFAULT_SENDER_AMOUNT + PROTOCOL_FEE,
        sender.address,
        DEFAULT_SIGNER_AMOUNT
      )
      await setUpBalances(signer.address, sender.address)

      await signerToken.mock.balanceOf
        .withArgs(delegate.address)
        .returns(DEFAULT_SIGNER_AMOUNT)

      await expect(
        delegate.connect(signer).swapERC20(sender.address, order, feeReceiver.address)
      ).to.be.revertedWith('RuleERC20ExpiredOrDoesNotExist')
    })

    it('fails to swap with a rule expired', async () => {
      await delegate
        .connect(sender)
        .setRuleERC20(
          sender.address,
          senderToken.address,
          DEFAULT_SENDER_AMOUNT,
          signerToken.address,
          DEFAULT_SIGNER_AMOUNT,
          Math.round(Date.now() / 1000) - 10
        )

      const order = await createSignedOrderERC20({}, signer)

      await setUpAllowances(
        sender.address,
        DEFAULT_SENDER_AMOUNT,
        signer.address,
        DEFAULT_SIGNER_AMOUNT + PROTOCOL_FEE
      )
      await setUpBalances(signer.address, sender.address)

      await expect(
        delegate.connect(signer).swapERC20(sender.address, order, feeReceiver.address)
      ).to.be.revertedWith('RuleERC20ExpiredOrDoesNotExist')
    })

    it('fails to swap with sender amount above rule sender amount', async () => {
      await senderToken.mock.approve
        .withArgs(delegate.address, DEFAULT_SENDER_AMOUNT / 2)
        .returns(true)

      await delegate
        .connect(sender)
        .setRuleERC20(
          sender.address,
          senderToken.address,
          DEFAULT_SENDER_AMOUNT / 2,
          signerToken.address,
          DEFAULT_SIGNER_AMOUNT / 2,
          RULE_EXPIRY
        )

      const order = await createSignedOrderERC20({}, signer)

      await setUpAllowances(
        sender.address,
        DEFAULT_SENDER_AMOUNT,
        signer.address,
        DEFAULT_SIGNER_AMOUNT + PROTOCOL_FEE
      )
      await setUpBalances(signer.address, sender.address)

      await signerToken.mock.balanceOf
        .withArgs(signer.address)
        .returns(DEFAULT_SIGNER_AMOUNT)

      await expect(
        delegate.connect(signer).swapERC20(sender.address, order, feeReceiver.address)
      ).to.be.revertedWith('SenderAmountInvalid')
    })

    it('fails to swap with sender amount above remaining rule sender amount', async () => {
      await senderToken.mock.approve
        .withArgs(delegate.address, DEFAULT_SENDER_AMOUNT / 2)
        .returns(true)

      await delegate
        .connect(sender)
        .setRuleERC20(
          sender.address,
          senderToken.address,
          DEFAULT_SENDER_AMOUNT,
          signerToken.address,
          DEFAULT_SIGNER_AMOUNT,
          RULE_EXPIRY
        )

      const order = await createSignedOrderERC20({}, signer)

      await setUpAllowances(
        sender.address,
        DEFAULT_SENDER_AMOUNT,
        signer.address,
        DEFAULT_SIGNER_AMOUNT + PROTOCOL_FEE
      )
      await setUpBalances(signer.address, sender.address)

      await signerToken.mock.balanceOf
        .withArgs(signer.address)
        .returns(DEFAULT_SIGNER_AMOUNT)

      await expect(
        delegate.connect(signer).swapERC20(sender.address, order, feeReceiver.address)
      ).to.emit(delegate, 'DelegatedSwapERC20For')

      const order2 = await createSignedOrderERC20({}, signer)

      await expect(
        delegate.connect(signer).swapERC20(sender.address, order2, feeReceiver.address)
      ).to.be.revertedWith('SenderAmountInvalid')
    })

    it('fails to swap with insufficient signer amount on Rule', async () => {
      await senderToken.mock.approve
        .withArgs(delegate.address, DEFAULT_SENDER_AMOUNT - 1)
        .returns(true)

      await delegate
        .connect(sender)
        .setRuleERC20(
          sender.address,
          senderToken.address,
          DEFAULT_SENDER_AMOUNT,
          signerToken.address,
          DEFAULT_SIGNER_AMOUNT,
          RULE_EXPIRY
        )

      const order = await createSignedOrderERC20(
        {
          senderAmount: DEFAULT_SENDER_AMOUNT,
          signerAmount: DEFAULT_SIGNER_AMOUNT / 4,
        },
        signer
      )

      await setUpAllowances(
        sender.address,
        DEFAULT_SENDER_AMOUNT,
        signer.address,
        DEFAULT_SIGNER_AMOUNT + PROTOCOL_FEE
      )
      await setUpBalances(signer.address, sender.address)

      await signerToken.mock.balanceOf
        .withArgs(signer.address)
        .returns(DEFAULT_SIGNER_AMOUNT - 1)

      await expect(
        delegate.connect(signer).swapERC20(sender.address, order, feeReceiver.address)
      ).to.be.revertedWith('SignerAmountInvalid')
    })
  })
})
