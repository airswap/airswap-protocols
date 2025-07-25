const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json')
const SWAP = require('@airswap/swap/build/contracts/Swap.sol/Swap.json')
const ERC20_ADAPTER = require('@airswap/swap/build/contracts/adapters/ERC20Adapter.sol/ERC20Adapter.json')
const ERC721_ADAPTER = require('@airswap/swap/build/contracts/adapters/ERC721Adapter.sol/ERC721Adapter.json')
const ERC1155_ADAPTER = require('@airswap/swap/build/contracts/adapters/ERC1155Adapter.sol/ERC1155Adapter.json')
const {
  ADDRESS_ZERO,
  createOrder,
  createOrderSignature,
  TokenKinds,
  SECONDS_IN_DAY,
} = require('@airswap/utils')

const CHAIN_ID = 31337
const DEFAULT_BALANCE = '100000'
const DEFAULT_SENDER_AMOUNT = '5000'
const DEFAULT_SIGNER_AMOUNT = '10000'
const PROTOCOL_FEE = '30'
const UPDATE_SWAP_ADDRESS = '0x0000000000000000000000000000000000001337'
const RULE_EXPIRY = Math.round(Date.now() / 1000 + SECONDS_IN_DAY).toString()
const MAX_ROYALTY = '1000'

describe('Delegate Unit', () => {
  let deployer
  let sender
  let signer
  let manager
  let anyone
  let swap
  let erc20Adapter
  let erc721Adapter
  let erc1155Adapter
  let delegate
  let senderToken
  let signerToken
  let snapshotId

  async function createSignedOrder(params = {}, signatory) {
    const unsignedOrder = createOrder({
      nonce: Date.now().toString(),
      expiry: RULE_EXPIRY,
      protocolFee: PROTOCOL_FEE,
      signer: {
        wallet: signer.address,
        token: signerToken.address,
        kind: TokenKinds.ERC20,
        id: '0',
        amount: DEFAULT_SIGNER_AMOUNT,
      },
      sender: {
        wallet: delegate.address, // Delegate contract must be the sender wallet
        token: senderToken.address,
        kind: TokenKinds.ERC20,
        id: '0',
        amount: DEFAULT_SENDER_AMOUNT,
      },
      affiliateWallet: ADDRESS_ZERO,
      affiliateAmount: '0',
      ...params,
    })
    return {
      ...unsignedOrder,
      ...(await createOrderSignature(
        unsignedOrder,
        signatory,
        swap.address,
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
      .withArgs(signerWallet, swap.address)
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
      .withArgs(swap.address, senderAmount)
      .returns(true)
    await signerToken.mock.approve
      .withArgs(swap.address, signerAmount)
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

    // Deploy adapters
    erc20Adapter = await (
      await ethers.getContractFactory(ERC20_ADAPTER.abi, ERC20_ADAPTER.bytecode)
    ).deploy()
    await erc20Adapter.deployed()

    erc721Adapter = await (
      await ethers.getContractFactory(
        ERC721_ADAPTER.abi,
        ERC721_ADAPTER.bytecode
      )
    ).deploy()
    await erc721Adapter.deployed()

    erc1155Adapter = await (
      await ethers.getContractFactory(
        ERC1155_ADAPTER.abi,
        ERC1155_ADAPTER.bytecode
      )
    ).deploy()
    await erc1155Adapter.deployed()

    // Deploy Swap contract
    swap = await (
      await ethers.getContractFactory(SWAP.abi, SWAP.bytecode)
    ).deploy(
      [erc20Adapter.address, erc721Adapter.address, erc1155Adapter.address], // adapters
      TokenKinds.ERC20, // requiredSenderKind
      PROTOCOL_FEE,
      deployer.address // protocolFeeWallet
    )
    await swap.deployed()

    // Deploy Delegate contract
    delegate = await (
      await ethers.getContractFactory('Delegate')
    ).deploy(
      swap.address,
      erc20Adapter.address,
      erc721Adapter.address,
      erc1155Adapter.address
    )
    await delegate.deployed()

    // Deploy mock tokens
    senderToken = await deployMockContract(deployer, IERC20.abi)
    signerToken = await deployMockContract(deployer, IERC20.abi)

    // Setup mock token behavior - only set up what's needed for the tests
    await senderToken.mock.transferFrom.returns(true)
    await signerToken.mock.transferFrom.returns(true)
    await senderToken.mock.transfer.returns(true)
    await signerToken.mock.transfer.returns(true)

    await setUpApprovals(DEFAULT_SENDER_AMOUNT, DEFAULT_SIGNER_AMOUNT)
  })

  describe('Constructor and admin functions', () => {
    it('sets the swap contract address', async () => {
      expect(await delegate.swapContract()).to.equal(swap.address)
    })

    it('sets the adapters correctly', async () => {
      expect(await delegate.adapters(TokenKinds.ERC20)).to.equal(
        erc20Adapter.address
      )
      expect(await delegate.adapters(TokenKinds.ERC721)).to.equal(
        erc721Adapter.address
      )
      expect(await delegate.adapters(TokenKinds.ERC1155)).to.equal(
        erc1155Adapter.address
      )
    })

    it('sets the swap contract address', async () => {
      await delegate.setSwapContract(UPDATE_SWAP_ADDRESS)
      expect(await delegate.swapContract()).to.equal(UPDATE_SWAP_ADDRESS)
    })

    it('the swap contract address cannot be address(0)', async () => {
      await expect(delegate.setSwapContract(ADDRESS_ZERO)).to.be.revertedWith(
        'AddressInvalid'
      )
    })

    it('only the owner can set the swap contract address', async () => {
      await expect(
        delegate.connect(anyone).setSwapContract(UPDATE_SWAP_ADDRESS)
      ).to.be.revertedWith('Unauthorized')
    })

    it('only owner can lock the contract', async () => {
      await expect(delegate.connect(anyone).setLocked(true)).to.be.revertedWith(
        'Unauthorized'
      )

      await expect(delegate.connect(deployer).setLocked(true))
        .to.emit(delegate, 'SetLocked')
        .withArgs(true)

      expect(await delegate.locked()).to.equal(true)
    })

    it('only owner can lock the contract', async () => {
      // First lock
      await expect(delegate.connect(deployer).setLocked(true))
        .to.emit(delegate, 'SetLocked')
        .withArgs(true)

      await expect(
        delegate.connect(anyone).setLocked(false)
      ).to.be.revertedWith('Unauthorized')

      await expect(delegate.connect(deployer).setLocked(false))
        .to.emit(delegate, 'SetLocked')
        .withArgs(false)

      expect(await delegate.locked()).to.equal(false)
    })

    it('cannot set rule when contract is locked', async () => {
      await delegate.connect(deployer).setLocked(true)

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
      ).to.be.revertedWith('Locked')
    })

    it('cannot swap when contract is locked', async () => {
      // First set up a valid rule
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

      // Set up the order
      const order = await createSignedOrderERC20({}, signer)
      await setUpAllowances(
        sender.address,
        DEFAULT_SENDER_AMOUNT,
        signer.address,
        DEFAULT_SIGNER_AMOUNT + PROTOCOL_FEE
      )
      await setUpBalances(signer.address, sender.address)

      // Lock the contract
      await delegate.connect(deployer).setLocked(true)

      // Try to swap
      await expect(
        delegate.connect(signer).swap(sender.address, ...order)
      ).to.be.revertedWith('Locked')
    })
  })

  describe('Rules', () => {
    it('sets a Rule', async () => {
      const order = await createSignedOrder({}, signer)

      await expect(delegate.connect(sender).setRule(sender.address, order))
        .to.emit(delegate, 'SetRule')
        .withArgs(
          sender.address,
          signerToken.address,
          senderToken.address,
          DEFAULT_SIGNER_AMOUNT,
          DEFAULT_SENDER_AMOUNT,
          RULE_EXPIRY
        )
    })

    it('unsets a Rule', async () => {
      const order = await createSignedOrder({}, signer)
      await delegate.connect(sender).setRule(sender.address, order)

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
      const order = await createSignedOrder({}, signer)

      await expect(delegate.connect(manager).setRule(sender.address, order))
        .to.emit(delegate, 'SetRule')
        .withArgs(
          sender.address,
          signerToken.address,
          senderToken.address,
          DEFAULT_SIGNER_AMOUNT,
          DEFAULT_SENDER_AMOUNT,
          RULE_EXPIRY
        )
    })

    it('an unauthorized manager cannot set a rule', async () => {
      await delegate.connect(sender).authorize(manager.address)
      const order = await createSignedOrder({}, signer)

      await expect(
        delegate.connect(anyone).setRule(sender.address, order)
      ).to.be.revertedWith('SenderInvalid')
    })

    it('a manager cannot set a rule without prior authorization', async () => {
      const order = await createSignedOrder({}, signer)

      await expect(
        delegate.connect(manager).setRule(sender.address, order)
      ).to.be.revertedWith('SenderInvalid')
    })

    it('a manager can unset a Rule', async () => {
      await delegate.connect(sender).authorize(manager.address)
      const order = await createSignedOrder({}, signer)
      await delegate.connect(manager).setRule(sender.address, order)

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
      const order = await createSignedOrder({}, signer)
      await delegate.connect(manager).setRule(sender.address, order)

      await expect(
        delegate
          .connect(anyone)
          .unsetRule(sender.address, senderToken.address, signerToken.address)
      ).to.be.revertedWith('SenderInvalid')
    })

    it('a revoked manager cannot unset a rule', async () => {
      await delegate.connect(sender).authorize(manager.address)
      const order = await createSignedOrder({}, signer)
      await delegate.connect(manager).setRule(sender.address, order)

      await delegate.connect(sender).revoke()

      await expect(
        delegate
          .connect(manager)
          .unsetRule(sender.address, senderToken.address, signerToken.address)
      ).to.be.revertedWith('SenderInvalid')
    })

    it('setting a Rule updates the rule storage', async () => {
      const order = await createSignedOrder({}, signer)
      await delegate.connect(sender).setRule(sender.address, order)

      const rule = await delegate.rules(
        sender.address,
        senderToken.address,
        signerToken.address
      )

      // Check that the rule exists and has the correct structure
      // The rule is an array representing the Order struct directly
      // [nonce, expiry, signer, sender, affiliateWallet, affiliateAmount, v, r, s]
      // signer and sender are arrays: [wallet, token, kind, id, amount]
      expect(rule[3][4].toString()).to.equal(DEFAULT_SENDER_AMOUNT) // sender.amount
      expect(rule[2][4].toString()).to.equal(DEFAULT_SIGNER_AMOUNT) // signer.amount
    })

    it('unsetting a Rule clears the rule storage', async () => {
      const order = await createSignedOrder({}, signer)
      await delegate.connect(sender).setRule(sender.address, order)

      await delegate
        .connect(sender)
        .unsetRule(sender.address, senderToken.address, signerToken.address)

      const rule = await delegate.rules(
        sender.address,
        senderToken.address,
        signerToken.address
      )

      // Check that the rule is cleared (sender wallet should be zero address)
      expect(rule[3][0]).to.equal(ADDRESS_ZERO) // sender.wallet
    })

    it('fails to set rule with invalid sender wallet', async () => {
      const order = await createSignedOrder(
        {
          sender: {
            wallet: anyone.address, // Not the delegate contract
            token: senderToken.address,
            kind: TokenKinds.ERC20,
            id: '0',
            amount: DEFAULT_SENDER_AMOUNT,
          },
        },
        signer
      )

      await expect(
        delegate.connect(sender).setRule(sender.address, order)
      ).to.be.revertedWith('SenderInvalid')
    })
  })

  describe('Authorization', () => {
    it('authorizes a manager', async () => {
      await expect(delegate.connect(sender).authorize(manager.address))
        .to.emit(delegate, 'Authorize')
        .withArgs(manager.address, sender.address)

      expect(await delegate.authorized(sender.address)).to.equal(
        manager.address
      )
      expect(await delegate.senderWallets(manager.address)).to.equal(
        sender.address
      )
    })

    it('cannot authorize with zero address', async () => {
      await expect(
        delegate.connect(sender).authorize(ADDRESS_ZERO)
      ).to.be.revertedWith('ManagerInvalid')
    })

    it('revokes a manager', async () => {
      await delegate.connect(sender).authorize(manager.address)

      await expect(delegate.connect(sender).revoke())
        .to.emit(delegate, 'Revoke')
        .withArgs(manager.address, sender.address)

      expect(await delegate.authorized(sender.address)).to.equal(ADDRESS_ZERO)
      expect(await delegate.senderWallets(manager.address)).to.equal(
        ADDRESS_ZERO
      )
    })

    it('revoke works when no manager is set', async () => {
      await expect(delegate.connect(sender).revoke())
        .to.emit(delegate, 'Revoke')
        .withArgs(ADDRESS_ZERO, sender.address)
    })
  })

  describe('Swap', () => {
    // Successful swap tests in integration
    it('fails to swap with no rule', async () => {
      const order = await createSignedOrder({}, signer)

      await setUpAllowances(
        sender.address,
        DEFAULT_SENDER_AMOUNT,
        signer.address,
        DEFAULT_SIGNER_AMOUNT
      )
      await setUpBalances(signer.address, sender.address)

      await expect(
        delegate.connect(signer).swap(order, sender.address, MAX_ROYALTY)
      ).to.be.revertedWith('RuleExpiredOrDoesNotExist')
    })

    it('fails to swap with expired rule', async () => {
      const expiredOrder = await createSignedOrder(
        {
          expiry: (Math.round(Date.now() / 1000) - 10).toString(),
        },
        signer
      )
      await delegate.connect(sender).setRule(sender.address, expiredOrder)

      await setUpAllowances(
        sender.address,
        DEFAULT_SENDER_AMOUNT,
        signer.address,
        DEFAULT_SIGNER_AMOUNT
      )
      await setUpBalances(signer.address, sender.address)

      await expect(
        delegate.connect(signer).swap(expiredOrder, sender.address, MAX_ROYALTY)
      ).to.be.revertedWith('RuleExpiredOrDoesNotExist')
    })

    it('fails to swap with sender amount mismatch', async () => {
      const order = await createSignedOrder({}, signer)
      await delegate.connect(sender).setRule(sender.address, order)

      const differentAmountOrder = await createSignedOrder(
        {
          sender: {
            wallet: delegate.address,
            token: senderToken.address,
            kind: TokenKinds.ERC20,
            id: '0',
            amount: (parseInt(DEFAULT_SENDER_AMOUNT) + 1000).toString(),
          },
        },
        signer
      )

      await setUpAllowances(
        sender.address,
        DEFAULT_SENDER_AMOUNT,
        signer.address,
        DEFAULT_SIGNER_AMOUNT
      )
      await setUpBalances(signer.address, sender.address)

      await expect(
        delegate
          .connect(signer)
          .swap(differentAmountOrder, sender.address, MAX_ROYALTY)
      ).to.be.revertedWith('SenderAmountInvalid')
    })
  })

  describe('ERC721Receiver and ERC1155Receiver', () => {
    it('implements onERC721Received correctly', async () => {
      const selector = '0x150b7a02' // onERC721Received selector
      const result = await delegate.onERC721Received(
        anyone.address,
        anyone.address,
        1,
        '0x'
      )
      expect(result).to.equal(selector)
    })

    it('implements onERC1155Received correctly', async () => {
      const selector = '0xf23a6e61' // onERC1155Received selector
      const result = await delegate.onERC1155Received(
        anyone.address,
        anyone.address,
        1,
        1,
        '0x'
      )
      expect(result).to.equal(selector)
    })

    it('implements onERC1155BatchReceived correctly', async () => {
      const selector = '0xbc197c81' // onERC1155BatchReceived selector
      const result = await delegate.onERC1155BatchReceived(
        anyone.address,
        anyone.address,
        [1, 2],
        [1, 1],
        '0x'
      )
      expect(result).to.equal(selector)
    })
  })

  describe('Edge cases and error handling', () => {
    it('handles unknown token kind in transfer', async () => {
      const order = await createSignedOrder(
        {
          sender: {
            wallet: delegate.address,
            token: senderToken.address,
            kind: '0x12345678', // Unknown token kind
            id: '0',
            amount: DEFAULT_SENDER_AMOUNT,
          },
        },
        signer
      )
      await delegate.connect(sender).setRule(sender.address, order)

      await setUpAllowances(
        sender.address,
        DEFAULT_SENDER_AMOUNT,
        signer.address,
        DEFAULT_SIGNER_AMOUNT
      )
      await setUpBalances(signer.address, sender.address)

      await expect(
        delegate.connect(signer).swap(order, sender.address, MAX_ROYALTY)
      ).to.be.revertedWith('TokenKindUnknown')
    })

    it('handles transfer failures', async () => {
      // Mock transfer failure
      await senderToken.mock.transferFrom.returns(false)

      const order = await createSignedOrder({}, signer)
      await delegate.connect(sender).setRule(sender.address, order)

      await setUpAllowances(
        sender.address,
        DEFAULT_SENDER_AMOUNT,
        signer.address,
        DEFAULT_SIGNER_AMOUNT
      )
      await setUpBalances(signer.address, sender.address)

      await expect(
        delegate.connect(signer).swap(order, sender.address, MAX_ROYALTY)
      ).to.be.revertedWith('TransferFromFailed')
    })

    it('handles multiple rules for different token pairs', async () => {
      const order1 = await createSignedOrder({}, signer)
      await delegate.connect(sender).setRule(sender.address, order1)

      // Create a different token for the second rule
      const differentToken = await deployMockContract(deployer, IERC20.abi)
      await differentToken.mock.transferFrom.returns(true)
      await differentToken.mock.transfer.returns(true)

      const order2 = await createSignedOrder(
        {
          sender: {
            wallet: delegate.address,
            token: differentToken.address, // Different token
            kind: TokenKinds.ERC721,
            id: '1',
            amount: '1',
          },
          signer: {
            wallet: signer.address,
            token: differentToken.address, // Different token
            kind: TokenKinds.ERC20,
            id: '0',
            amount: DEFAULT_SENDER_AMOUNT,
          },
        },
        signer
      )
      await delegate.connect(sender).setRule(sender.address, order2)

      // Both rules should be stored independently
      const rule1 = await delegate.rules(
        sender.address,
        senderToken.address,
        signerToken.address
      )
      const rule2 = await delegate.rules(
        sender.address,
        differentToken.address,
        differentToken.address
      )

      // The rules are arrays representing Order structs directly
      // [nonce, expiry, signer, sender, affiliateWallet, affiliateAmount, v, r, s]
      // signer and sender are arrays: [wallet, token, kind, id, amount]
      expect(rule1[3][4].toString()).to.equal(DEFAULT_SENDER_AMOUNT) // sender.amount
      expect(rule2[3][4].toString()).to.equal('1') // sender.amount
    })
  })
})
