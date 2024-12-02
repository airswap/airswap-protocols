const { expect } = require('chai')

const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json')
const SWAP_ERC20 = require('@airswap/swap-erc20/build/contracts/SwapERC20.sol/SwapERC20.json')
const {
  ADDRESS_ZERO,
  createOrderERC20,
  orderERC20ToParams,
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

describe('Delegate Unit', () => {
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
    return orderERC20ToParams({
      ...unsignedOrder,
      ...(await createOrderERC20Signature(
        unsignedOrder,
        signatory,
        swapERC20.address,
        CHAIN_ID
      )),
    })
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

  async function setUpApprovals() {
    await senderToken.mock.approve
      .withArgs(delegate.address, DEFAULT_SENDER_AMOUNT)
      .returns(true)

    await senderToken.mock.approve
      .withArgs(swapERC20.address, DEFAULT_SENDER_AMOUNT)
      .returns(true)

    await signerToken.mock.approve
      .withArgs(swapERC20.address, DEFAULT_SIGNER_AMOUNT)
      .returns(true)
  }

  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot')
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  before(async () => {
    ;[deployer, sender, signer, manager, anyone] = await ethers.getSigners()

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

    delegate = await (
      await ethers.getContractFactory('Delegate')
    ).deploy(swapERC20.address)
    await delegate.deployed()

    senderToken = await deployMockContract(deployer, IERC20.abi)
    signerToken = await deployMockContract(deployer, IERC20.abi)
    await senderToken.mock.transferFrom.returns(true)
    await signerToken.mock.transferFrom.returns(true)
    await senderToken.mock.transfer.returns(true)
    await signerToken.mock.transfer.returns(true)

    setUpApprovals()
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
  })

  describe('Rules', async () => {
    it('sets a Rule', async () => {
      await expect(
        delegate
          .connect(sender)
          .setRule(
            sender.address,
            senderToken.address,
            DEFAULT_SENDER_AMOUNT,
            signerToken.address,
            DEFAULT_SIGNER_AMOUNT,
            RULE_EXPIRY
          )
      )
        .to.emit(delegate, 'SetRule')
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
          .unsetRule(sender.address, senderToken.address, signerToken.address)
      )
        .to.emit(delegate, 'UnsetRule')
        .withArgs(sender.address, senderToken.address, signerToken.address)
    })

    it('a manager can set a Rule', async () => {
      await delegate.connect(sender).authorize(manager.address)
      await expect(
        delegate
          .connect(manager)
          .setRule(
            sender.address,
            senderToken.address,
            DEFAULT_SENDER_AMOUNT,
            signerToken.address,
            DEFAULT_SIGNER_AMOUNT,
            RULE_EXPIRY
          )
      )
        .to.emit(delegate, 'SetRule')
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
          .setRule(
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
          .setRule(
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
        .setRule(
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
          .unsetRule(sender.address, senderToken.address, signerToken.address)
      )
        .to.emit(delegate, 'UnsetRule')
        .withArgs(sender.address, senderToken.address, signerToken.address)
    })

    it('an unauthorized manager cannot unset a rule', async () => {
      await delegate.connect(sender).authorize(manager.address)
      await delegate
        .connect(manager)
        .setRule(
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
          .unsetRule(sender.address, senderToken.address, signerToken.address)
      ).to.be.revertedWith('SenderInvalid')
    })

    it('a revoked manager cannot unset a rule', async () => {
      await delegate.connect(sender).authorize(manager.address)
      await delegate
        .connect(manager)
        .setRule(
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
          .unsetRule(sender.address, senderToken.address, signerToken.address)
      ).to.be.revertedWith('SenderInvalid')
    })

    it('setting a Rule updates the rule balance', async () => {
      await delegate
        .connect(sender)
        .setRule(
          sender.address,
          senderToken.address,
          DEFAULT_SENDER_AMOUNT,
          signerToken.address,
          DEFAULT_SIGNER_AMOUNT,
          RULE_EXPIRY
        )

      const rule = await delegate.rules(
        sender.address,
        senderToken.address,
        signerToken.address
      )

      expect(rule.senderAmount.toString()).to.equal(DEFAULT_SENDER_AMOUNT)
    })

    it('unsetting a Rule updates the rule balance', async () => {
      await delegate
        .connect(sender)
        .setRule(
          sender.address,
          senderToken.address,
          DEFAULT_SENDER_AMOUNT,
          signerToken.address,
          DEFAULT_SIGNER_AMOUNT,
          RULE_EXPIRY
        )

      let rule = await delegate.rules(
        sender.address,
        senderToken.address,
        signerToken.address
      )

      await delegate
        .connect(sender)
        .unsetRule(sender.address, senderToken.address, signerToken.address)

      rule = await delegate.rules(
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

  describe('Swap', async () => {
    it('successfully swaps', async () => {
      await delegate
        .connect(sender)
        .setRule(
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
        delegate.connect(signer).swap(sender.address, ...order)
      ).to.emit(delegate, 'DelegatedSwapFor')
    })

    it('successfully swaps with a manager', async () => {
      await delegate.connect(sender).authorize(manager.address)

      await delegate
        .connect(manager)
        .setRule(
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
        delegate.connect(signer).swap(sender.address, ...order)
      ).to.emit(delegate, 'DelegatedSwapFor')
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
        delegate.connect(signer).swap(sender.address, ...order)
      ).to.be.revertedWith('RuleExpiredOrDoesNotExist')
    })

    it('fails to swap with a rule expired', async () => {
      await delegate
        .connect(sender)
        .setRule(
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
        delegate.connect(signer).swap(sender.address, ...order)
      ).to.be.revertedWith('RuleExpiredOrDoesNotExist')
    })

    it('fails to swap with sender amount above rule sender amount', async () => {
      await senderToken.mock.approve
        .withArgs(delegate.address, DEFAULT_SENDER_AMOUNT / 2)
        .returns(true)

      await delegate
        .connect(sender)
        .setRule(
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
        delegate.connect(signer).swap(sender.address, ...order)
      ).to.be.revertedWith('SenderAmountInvalid')
    })

    it('fails to swap with sender amount above remaining rule sender amount', async () => {
      await senderToken.mock.approve
        .withArgs(delegate.address, DEFAULT_SENDER_AMOUNT / 2)
        .returns(true)

      await delegate
        .connect(sender)
        .setRule(
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
        delegate.connect(signer).swap(sender.address, ...order)
      ).to.emit(delegate, 'DelegatedSwapFor')

      const order2 = await createSignedOrderERC20({}, signer)

      await expect(
        delegate.connect(signer).swap(sender.address, ...order2)
      ).to.be.revertedWith('SenderAmountInvalid')
    })

    it('fails to swap with insufficient signer amount on Rule', async () => {
      await senderToken.mock.approve
        .withArgs(delegate.address, DEFAULT_SENDER_AMOUNT - 1)
        .returns(true)

      await delegate
        .connect(sender)
        .setRule(
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
        delegate.connect(signer).swap(sender.address, ...order)
      ).to.be.revertedWith('SignerAmountInvalid')
    })
  })
})
