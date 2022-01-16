const { expect } = require('chai')
const { soliditySha3 } = require('web3-utils')
const { toAtomicString } = require('@airswap/utils')
const { generateTreeFromData, getRoot, getProof } = require('@airswap/merkle')

const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json')
const STAKING = require('@airswap/staking/build/contracts/Staking.sol/Staking.json')
const {ADDRESS_ZERO} = require('@airswap/constants')

function toWei(value, places) {
  return toAtomicString(value, places || 18)
}

describe('Pool Unit Tests', () => {
  let deployer
  let alice
  let bob
  let carol
  let stakeContract

  const CLAIM_SCALE = 10
  const CLAIM_MAX = 50

  const ALICE_SCORE = toWei(10000, 4)
  const BOB_SCORE = toWei(100000, 4)
  const CAROL_SCORE = toWei(1000000, 4)

  let tree
  let feeToken
  let feeToken2
  let pool
  let snapshotId

  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot')
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  before(async () => {
    ;[deployer, alice, bob, carol] = await ethers.getSigners()

    feeToken = await deployMockContract(deployer, IERC20.abi)
    await feeToken.mock.approve.returns(true)
    feeToken2 = await deployMockContract(deployer, IERC20.abi)

    stakeContract = await (
      await ethers.getContractFactory(STAKING.abi, STAKING.bytecode)
    ).deploy(feeToken.address, 'StakedAST', 'sAST', 100, 10)
    await stakeContract.deployed()

    pool = await (
      await ethers.getContractFactory('Pool')
    ).deploy(CLAIM_SCALE, CLAIM_MAX, stakeContract.address, feeToken.address)
    await pool.deployed()

    tree = generateTreeFromData({
      [alice.address]: ALICE_SCORE,
      [bob.address]: BOB_SCORE,
      [carol.address]: CAROL_SCORE,
    })
  })

  describe('Test constructor', async () => {
    it('constructor sets values', async () => {
      const storedScale = await pool.scale()
      const storedMax = await pool.max()
      const stakingContract = await pool.stakingContract()
      const stakingToken = await pool.stakingToken()
      const adminOwner = await pool.admins(deployer.address)
      expect(storedScale).to.equal(CLAIM_SCALE)
      expect(storedMax).to.equal(CLAIM_MAX)
      expect(stakingContract).to.equal(stakeContract.address)
      expect(stakingToken).to.equal(feeToken.address)
      expect(adminOwner).to.equal(true)
    })

    it('constructor reverts when percentage is too high', async () => {
      await expect(
        (
          await ethers.getContractFactory('Pool')
        ).deploy(CLAIM_SCALE, 101, stakeContract.address, feeToken.address)
      ).to.be.revertedWith('MAX_TOO_HIGH')
    })

    it('constructor reverts when scale is too high', async () => {
      await expect(
        (
          await ethers.getContractFactory('Pool')
        ).deploy(78, CLAIM_MAX, stakeContract.address, feeToken.address)
      ).to.be.revertedWith('SCALE_TOO_HIGH')
    })
  })

  describe('Test enable', async () => {
    it('enable successful', async () => {
      const root = getRoot(tree)
      await expect(await pool.connect(deployer).enable(root)).to.emit(
        pool,
        'Enable'
      )
      expect(await pool.roots(root)).to.equal(true)
    })

    it('enable reverts', async () => {
      const root = getRoot(tree)
      await expect(await pool.connect(deployer).enable(root)).to.emit(
        pool,
        'Enable'
      )
      await expect(pool.connect(deployer).enable(root)).to.be.revertedWith(
        'ROOT_EXISTS'
      )
    })
  })

  describe('Test staking variables', async () => {
    it('set stake contract successful', async () => {
      await pool.connect(deployer).setStakingContract(stakeContract.address)
      expect(await pool.stakingContract()).to.equal(stakeContract.address)
    })

    it('set stake contract reverts', async () => {
      await expect(
        pool
          .connect(deployer)
          .setStakingContract(ADDRESS_ZERO)
      ).to.be.revertedWith('INVALID_ADDRESS')
    })

    it('set stake token successful', async () => {
      await feeToken2.mock.approve.returns(true)
      await pool.connect(deployer).setStakingToken(feeToken2.address)
      expect(await pool.stakingToken()).to.equal(feeToken2.address)
    })

    it('set stake token reverts', async () => {
      await expect(
        pool
          .connect(deployer)
          .setStakingToken(ADDRESS_ZERO)
      ).to.be.revertedWith('INVALID_ADDRESS')
    })
  })

  describe('Test withdraw', async () => {
    it('withdraw success', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transfer.returns(true)

      const root = getRoot(tree)
      await pool.connect(deployer).enable(root)

      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))
      await expect(
        await pool.connect(alice).withdraw(
          [
            {
              root: getRoot(tree),
              score: ALICE_SCORE,
              proof,
            },
          ],
          feeToken.address
        )
      ).to.emit(pool, 'Withdraw')

      const isClaimed = await pool.claimed(root, alice.address)
      expect(isClaimed).to.equal(true)
    })

    it('withdraw reverts with no claims provided', async () => {
      await expect(
        pool.connect(deployer).withdraw([], feeToken.address)
      ).to.be.revertedWith('CLAIMS_MUST_BE_PROVIDED')
    })

    it('withdraw reverts with root not enabled', async () => {
      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))

      await expect(
        pool.connect(alice).withdraw(
          [
            {
              root: getRoot(tree),
              score: ALICE_SCORE,
              proof,
            },
          ],
          feeToken.address
        )
      ).to.be.revertedWith('ROOT_NOT_ENABLED')
    })

    it('withdraw reverts with claim already made', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transfer.returns(true)

      const root = getRoot(tree)
      await pool.connect(deployer).enable(root)

      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))
      await pool.connect(alice).withdraw(
        [
          {
            root: getRoot(tree),
            score: ALICE_SCORE,
            proof,
          },
        ],
        feeToken.address
      )
      await expect(
        pool.connect(alice).withdraw(
          [
            {
              root: getRoot(tree),
              score: ALICE_SCORE,
              proof,
            },
          ],
          feeToken.address
        )
      ).to.be.revertedWith('CLAIM_ALREADY_MADE')
    })

    it('withdraw reverts with claim already made on previous pool contract', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transfer.returns(true)

      const root = getRoot(tree)

      await pool
        .connect(deployer)
        .setClaimed(root, [alice.address, bob.address])

      let proof = getProof(tree, soliditySha3(bob.address, BOB_SCORE))

      await expect(
        pool.connect(bob).withdraw(
          [
            {
              root: getRoot(tree),
              score: BOB_SCORE,
              proof,
            },
          ],
          feeToken.address
        )
      ).to.be.revertedWith('CLAIM_ALREADY_MADE')

      proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))

      await expect(
        pool.connect(alice).withdraw(
          [
            {
              root: getRoot(tree),
              score: ALICE_SCORE,
              proof,
            },
          ],
          feeToken.address
        )
      ).to.be.revertedWith('CLAIM_ALREADY_MADE')
    })

    it('withdraw reverts with invalid proof', async () => {
      await feeToken.mock.transfer.returns(true)

      const root = getRoot(tree)
      await pool.connect(deployer).enable(root)

      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))

      await expect(
        pool.connect(alice).withdraw(
          [
            {
              root: getRoot(tree),
              score: BOB_SCORE,
              proof,
            },
          ],
          feeToken.address
        )
      ).to.be.revertedWith('PROOF_INVALID')
    })

    it('withdrawWithRecipient success', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transfer.returns(true)

      const root = getRoot(tree)
      await pool.connect(deployer).enable(root)

      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))
      const withdrawMinimum = 0
      await expect(
        await pool.connect(alice).withdrawWithRecipient(
          [
            {
              root: getRoot(tree),
              score: ALICE_SCORE,
              proof,
            },
          ],
          feeToken.address,
          withdrawMinimum,
          bob.address
        )
      ).to.emit(pool, 'Withdraw')

      const isClaimed = await pool.claimed(root, alice.address)
      expect(isClaimed).to.equal(true)
    })

    it('withdrawWithRecipient reverts with minimumAmount not met', async () => {
      await feeToken.mock.balanceOf.returns('100000')

      const root = getRoot(tree)
      await pool.connect(deployer).enable(root)

      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))
      const withdrawMinimum = 496

      await expect(
        pool.connect(alice).withdrawWithRecipient(
          [
            {
              root: getRoot(tree),
              score: ALICE_SCORE,
              proof,
            },
          ],
          feeToken.address,
          withdrawMinimum,
          bob.address
        )
      ).to.be.revertedWith('INSUFFICIENT_AMOUNT')
    })

    it('withdrawAndStake success', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transferFrom.returns(true)

      const root = getRoot(tree)
      await pool.connect(deployer).enable(root)

      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))
      const withdrawMinimum = 0
      await expect(
        pool.connect(alice).withdrawAndStake(
          [
            {
              root: getRoot(tree),
              score: ALICE_SCORE,
              proof,
            },
          ],
          feeToken.address,
          withdrawMinimum
        )
      ).to.emit(pool, 'Withdraw')
      const isClaimed = await pool.claimed(root, alice.address)
      expect(isClaimed).to.equal(true)

      const balance = await stakeContract
        .connect(alice)
        .balanceOf(alice.address)
      expect(balance).to.equal('495')
    })

    it('withdrawAndStake reverts with wrong token', async () => {
      const root = getRoot(tree)
      await pool.connect(deployer).enable(root)

      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))
      const withdrawMinimum = 0
      await expect(
        pool.connect(alice).withdrawAndStake(
          [
            {
              root: getRoot(tree),
              score: ALICE_SCORE,
              proof,
            },
          ],
          feeToken2.address,
          withdrawMinimum
        )
      ).to.be.revertedWith('INVALID_TOKEN')
    })

    it('withdrawAndStakeFor success', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.approve.returns(true)
      await feeToken.mock.transferFrom.returns(true)

      const root = getRoot(tree)
      await pool.connect(deployer).enable(root)

      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))
      const withdrawMinimum = 0
      await expect(
        await pool.connect(alice).withdrawAndStakeFor(
          [
            {
              root: getRoot(tree),
              score: ALICE_SCORE,
              proof,
            },
          ],
          feeToken.address,
          withdrawMinimum,
          bob.address
        )
      ).to.emit(pool, 'Withdraw')

      const isClaimed = await pool.claimed(root, alice.address)
      expect(isClaimed).to.equal(true)

      const balance = await stakeContract.connect(bob).balanceOf(bob.address)
      expect(balance).to.equal('495')
    })

    it('withdrawAndStakeFor reverts with wrong token', async () => {
      const root = getRoot(tree)
      await pool.connect(deployer).enable(root)

      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))
      const withdrawMinimum = 0
      await expect(
        pool.connect(alice).withdrawAndStakeFor(
          [
            {
              root: getRoot(tree),
              score: ALICE_SCORE,
              proof,
            },
          ],
          feeToken2.address,
          withdrawMinimum,
          bob.address
        )
      ).to.be.revertedWith('INVALID_TOKEN')
    })

    it('withdrawWithSignature success', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transfer.returns(true)
      let amount = 100
      let nonce = 1
      let messageHash = ethers.utils.solidityKeccak256(
          ["address","uint256","address","uint256"],
          [feeToken.address, amount, deployer.address, nonce]
        )
      let messageHashBytes = ethers.utils.arrayify(messageHash)
      let sig = await deployer.signMessage(messageHashBytes)
      //for solidity, need expanded format of a signature
      let splitSig = ethers.utils.splitSignature(sig);
      await expect(
        pool.connect(deployer).withdrawWithSignature(
          splitSig.v,
          splitSig.r,
          splitSig.s,
          feeToken.address,
          amount,
          nonce
        )
      ).to.emit(pool, 'WithdrawWithSignature')
       .withArgs(deployer.address, feeToken.address, amount, deployer.address, nonce)
    })

    it('withdrawWithSignature reverts with claim already made', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transfer.returns(true)
      let amount = 100
      let nonce = 1
      let messageHash = ethers.utils.solidityKeccak256(
          ["address","uint256","address","uint256"],
          [feeToken.address, amount, deployer.address, nonce]
        )
      let messageHashBytes = ethers.utils.arrayify(messageHash)
      let sig = await deployer.signMessage(messageHashBytes)
      //for solidity, need expanded format of a signature
      let splitSig = ethers.utils.splitSignature(sig);
      await expect(
        await pool.connect(deployer).withdrawWithSignature(
          splitSig.v,
          splitSig.r,
          splitSig.s,
          feeToken.address,
          amount,
          nonce
        )
      ).to.emit(pool, 'WithdrawWithSignature')
       .withArgs(deployer.address, feeToken.address, amount, deployer.address, nonce)

       await expect(
        pool.connect(deployer).withdrawWithSignature(
          splitSig.v,
          splitSig.r,
          splitSig.s,
          feeToken.address,
          amount,
          nonce
        )
      ).to.be.revertedWith('CLAIM_ALREADY_MADE')
    })

    it('withdrawWithSignature reverts with signer who is not admin', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transfer.returns(true)
      let amount = 100
      let nonce = 1
      let messageHash = ethers.utils.solidityKeccak256(
          ["address","uint256","address","uint256"],
          [feeToken.address, amount, deployer.address, nonce]
        )
      let messageHashBytes = ethers.utils.arrayify(messageHash)
      let sig = await alice.signMessage(messageHashBytes)
      //for solidity, need expanded format of a signature
      let splitSig = ethers.utils.splitSignature(sig)
      await expect(
        pool.connect(deployer).withdrawWithSignature(
          splitSig.v,
          splitSig.r,
          splitSig.s,
          feeToken.address,
          amount,
          nonce
        )
      ).to.be.revertedWith('NOT_VERIFIED')
    })
  })

  describe('Test Calculate', async () => {
    it('Test calculation input and output', async () => {
      await feeToken.mock.balanceOf.returns('100000')

      const amount = await pool.calculate(ALICE_SCORE, feeToken.address)
      expect(amount).to.equal('495')
    })
  })

  describe('Test Calculate Multiple', async () => {
    it('Test calculation input and output', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken2.mock.balanceOf.returns('10000')

      const amounts = await pool.calculateMultiple(ALICE_SCORE, [
        feeToken.address,
        feeToken2.address,
      ])

      expect(amounts[0]).to.equal('495')
      expect(amounts[1]).to.equal('49')
    })
  })

  describe('Test Verify', async () => {
    it('Test verification is valid', async () => {
      const root = getRoot(tree)
      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))
      const isValid = await pool.verify(alice.address, root, ALICE_SCORE, proof)
      expect(isValid).to.be.equal(true)
    })

    it('Test verification is invalid', async () => {
      const root = getRoot(tree)
      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))
      const isValid = await pool.verify(alice.address, root, BOB_SCORE, proof)
      expect(isValid).to.be.equal(false)
    })
  })

  describe('Test setting Scale', async () => {
    it('Test setScale is successful', async () => {
      await expect(await pool.setScale(77)).to.emit(pool, 'SetScale')
      expect(await pool.scale()).to.be.equal('77')
    })

    it('Test setScale reverts', async () => {
      await expect(pool.setScale(1000)).to.be.revertedWith('SCALE_TOO_HIGH')
    })
  })

  describe('Test setting Max', async () => {
    it('Test setMax is successful', async () => {
      await expect(await pool.setMax(10)).to.emit(pool, 'SetMax')
      expect(await pool.scale()).to.be.equal('10')
    })

    it('Test setMax reverts', async () => {
      await expect(pool.setMax(101)).to.be.revertedWith('MAX_TOO_HIGH')
    })
  })

  describe('Test setting admin', async () => {
    it('Test addAdmin is successful', async () => {
      await pool.addAdmin(alice.address)
      expect(await pool.admins(alice.address)).to.be.equal(true)
    })

    it('Test addAdmin reverts', async () => {
      await expect(
        pool.connect(alice).addAdmin(alice.address)
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('Test addAdmin reverts with zero address', async () => {
      await expect(
        pool.connect(deployer).addAdmin(ADDRESS_ZERO)
      ).to.be.revertedWith('INVALID_ADDRESS')
    })

    it('Test removeAdmin is successful', async () => {
      await pool.addAdmin(alice.address)
      await pool.removeAdmin(alice.address)
      expect(await pool.admins(alice.address)).to.be.equal(false)
    })

    it('Test removeAdmin reverts', async () => {
      await pool.addAdmin(alice.address)
      await expect(
        pool.connect(alice).removeAdmin(alice.address)
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('Test removeAdmin executed by non-admin reverts', async () => {
      await expect(
        pool.connect(deployer).removeAdmin(alice.address)
      ).to.be.revertedWith('ADMIN_NOT_SET')
    })

    it('enable successful with admin', async () => {
      await pool.addAdmin(alice.address)
      const root = getRoot(tree)
      await expect(await pool.connect(alice).enable(root)).to.emit(
        pool,
        'Enable'
      )
      expect(await pool.roots(root)).to.equal(true)
    })

    it('Test setclaimed with admin is successful', async () => {
      await feeToken.mock.balanceOf.returns('100000')

      await pool.addAdmin(alice.address)

      const root = getRoot(tree)

      await pool.connect(alice).setClaimed(root, [bob.address])

      let proof = getProof(tree, soliditySha3(bob.address, BOB_SCORE))

      await expect(
        pool.connect(bob).withdraw(
          [
            {
              root: getRoot(tree),
              score: BOB_SCORE,
              proof,
            },
          ],
          feeToken.address
        )
      ).to.be.revertedWith('CLAIM_ALREADY_MADE')
    })

    it('Test setclaimed with non-admin reverts', async () => {
      await feeToken.mock.balanceOf.returns('100000')

      const root = getRoot(tree)

      await expect(
        pool
        .connect(alice)
        .setClaimed(
          root,
          [bob.address]
        )
      ).to.be.revertedWith('NOT_ADMIN')
    })

    it('Test setclaimed reverts with claim already made', async () => {
      await feeToken.mock.balanceOf.returns('100000')

      const root = getRoot(tree)

      await pool.connect(deployer).setClaimed(root, [bob.address])
      
      await expect(
        pool
        .connect(deployer)
        .setClaimed(
          root,
          [bob.address]
        )
      ).to.be.revertedWith('CLAIM_ALREADY_MADE')
    })
  })

  describe('Test drain to', async () => {
    it('Test drain to is successful', async () => {
      await feeToken.mock.balanceOf.returns('10')
      await feeToken.mock.transfer.returns(true)
      await feeToken2.mock.balanceOf.returns('10')
      await feeToken2.mock.transfer.returns(true)

      await expect(
        await pool
          .connect(deployer)
          .drainTo([feeToken.address, feeToken2.address], carol.address)
      ).to.emit(pool, 'DrainTo')
    })

    it('Test drain to is only callable by owner', async () => {
      await expect(
        pool
          .connect(alice)
          .drainTo([feeToken.address, feeToken2.address], carol.address)
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })
  })
})
