const { expect } = require('chai')
const { toAtomicString } = require('@airswap/utils')
const { generateTreeFromData, getRoot, getProof } = require('@airswap/merkle')
const { soliditySha3 } = require('web3-utils')

const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json')
const STAKING = require('@airswap/staking/build/contracts/Staking.sol/Staking.json')
const { ADDRESS_ZERO } = require('@airswap/constants')

function toWei(value, places) {
  return toAtomicString(value, places || 18)
}

describe('Pool Unit', () => {
  let deployer
  let alice
  let bob
  let stakeContract

  const CHAIN_ID = 31337
  const CLAIM_SCALE = 10
  const CLAIM_MAX = 50

  const ALICE_SCORE = toWei(10000, 4)
  const BOB_SCORE = toWei(100000, 4)
  const CAROL_SCORE = toWei(1000000, 4)

  let tree
  let score
  let feeToken
  let feeToken2
  let pool
  let snapshotId

  function stringifiedProof(proof) {
    return proof.map((x, idx) => {
      if (idx === 0) {
        return `"${x}"`
      } else {
        return ` "${x}"`
      }
    })
  }

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
    await feeToken.mock.allowance.returns(0)
    feeToken2 = await deployMockContract(deployer, IERC20.abi)

    stakeContract = await (
      await ethers.getContractFactory(STAKING.abi, STAKING.bytecode)
    ).deploy('StakedAST', 'sAST', feeToken.address, 100, 10)
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
      const max = 101
      await expect(
        (
          await ethers.getContractFactory('Pool')
        ).deploy(CLAIM_SCALE, max, stakeContract.address, feeToken.address)
      ).to.be.revertedWith(`MaxTooHigh(${max})`)
    })

    it('constructor reverts when scale is too high', async () => {
      const scale = 78
      await expect(
        (
          await ethers.getContractFactory('Pool')
        ).deploy(scale, CLAIM_MAX, stakeContract.address, feeToken.address)
      ).to.be.revertedWith(`ScaleTooHigh(${scale})`)
    })
  })

  describe('Test admin functions', async () => {
    it('enable a claim for a merkle root suceeds', async () => {
      const root = getRoot(tree)
      expect(await pool.connect(deployer).enable(root)).to.emit(pool, 'Enable')
    })

    it('enable a claim for a merkle root fails when not admin', async () => {
      const root = getRoot(tree)
      await expect(pool.connect(bob).enable(root)).to.be.revertedWith(
        'Unauthorized()'
      )
    })

    it('enable a root twice fails', async () => {
      const root = getRoot(tree)
      await pool.connect(deployer).enable(root)
      await expect(pool.connect(deployer).enable(root)).to.be.revertedWith(
        `RootExists("${root}")`
      )
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
      ).to.be.revertedWith('AlreadyClaimed()')
    })

    it('Test setclaimed with non-admin reverts', async () => {
      await feeToken.mock.balanceOf.returns('100000')

      const root = getRoot(tree)

      await expect(
        pool.connect(alice).setClaimed(root, [bob.address])
      ).to.be.revertedWith('Unauthorized()')
    })

    it('Test setclaimed reverts with claim already made', async () => {
      await feeToken.mock.balanceOf.returns('100000')

      const root = getRoot(tree)
      await pool.connect(deployer).setClaimed(root, [bob.address])

      await expect(
        pool.connect(deployer).setClaimed(root, [bob.address])
      ).to.be.revertedWith('AlreadyClaimed()')
    })
  })

  describe('Test staking variables', async () => {
    it('set stake contract successful', async () => {
      await pool.connect(deployer).setStakingContract(stakeContract.address)
      expect(await pool.stakingContract()).to.equal(stakeContract.address)
    })

    it('set stake contract fails when not owner', async () => {
      await expect(
        pool.connect(alice).setStakingContract(stakeContract.address)
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('set stake contract reverts', async () => {
      await expect(
        pool.connect(deployer).setStakingContract(ADDRESS_ZERO)
      ).to.be.revertedWith(`AddressInvalid("${ADDRESS_ZERO}")`)
    })

    it('set stake token successful', async () => {
      await feeToken2.mock.approve.returns(true)
      await feeToken2.mock.allowance.returns(0)
      await pool.connect(deployer).setStakingToken(feeToken2.address)
      expect(await pool.stakingToken()).to.equal(feeToken2.address)
    })

    it('set stake contract fails when not owner', async () => {
      await feeToken2.mock.approve.returns(true)
      await feeToken2.mock.allowance.returns(0)
      await expect(
        pool.connect(alice).setStakingToken(feeToken2.address)
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('set stake token reverts', async () => {
      await expect(
        pool.connect(deployer).setStakingToken(ADDRESS_ZERO)
      ).to.be.revertedWith(`AddressInvalid("${ADDRESS_ZERO}")`)
    })
  })

  describe('Test withdraw', async () => {
    it('withdraw success', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transfer.returns(true)

      await pool.addAdmin(alice.address)
      const root = getRoot(tree)
      await pool.connect(alice).enable(root)
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
      ).to.emit(pool, 'Withdraw')

      const isClaimed = await pool.claimed(root, bob.address)
      expect(isClaimed).to.equal(true)
    })

    it('withdraw reverts with no claim provided', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transfer.returns(true)

      await pool.addAdmin(alice.address)
      const root = getRoot(tree)
      await pool.connect(alice).enable(root)

      await expect(
        pool.connect(bob).withdraw([], feeToken.address)
      ).to.be.revertedWith(`ClaimsNotProvided()`)

      const isClaimed = await pool.claimed(root, bob.address)
      expect(isClaimed).to.equal(false)
    })

    it('withdraw reverts with no root enabled', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transfer.returns(true)

      await pool.addAdmin(alice.address)
      const root = getRoot(tree)
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
      ).to.be.revertedWith(`RootDisabled("${root}")`)

      const isClaimed = await pool.claimed(root, bob.address)
      expect(isClaimed).to.equal(false)
    })

    it('withdraw reverts with claim already made', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transfer.returns(true)

      await pool.addAdmin(alice.address)
      const root = getRoot(tree)
      await pool.connect(alice).enable(root)
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
      ).to.emit(pool, 'Withdraw')

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
      ).to.be.revertedWith(`AlreadyClaimed()`)

      const isClaimed = await pool.claimed(root, bob.address)
      expect(isClaimed).to.equal(true)
    })

    it('withdraw reverts with score of zero', async () => {
      score = 0

      await pool.addAdmin(alice.address)
      const root = getRoot(tree)
      await pool.connect(alice).enable(root)
      let proof = getProof(tree, soliditySha3(bob.address, BOB_SCORE))

      await expect(
        pool.connect(bob).withdraw(
          [
            {
              root: getRoot(tree),
              score: score,
              proof,
            },
          ],
          feeToken.address
        )
      ).to.be.revertedWith(`ProofInvalid([${stringifiedProof(proof)}])`)

      const isClaimed = await pool.claimed(root, bob.address)
      expect(isClaimed).to.equal(false)
    })

    it('withdraw with different recipient success', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transfer.returns(true)

      await pool.addAdmin(alice.address)
      const root = getRoot(tree)
      await pool.connect(alice).enable(root)
      let proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))

      const withdrawMinimum = 0

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
      ).to.emit(pool, 'Withdraw')

      const isClaimed = await pool.claimed(root, alice.address)
      expect(isClaimed).to.equal(true)
    })

    it('withdraw with different recipient reverts with minimumAmount not met', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transfer.returns(true)

      await pool.addAdmin(alice.address)
      const root = getRoot(tree)
      await pool.connect(alice).enable(root)
      let proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))
      const withdrawMinimum = 496

      const amount = await pool
        .connect(alice)
        .calculate(ALICE_SCORE, feeToken.address)

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
      ).to.be.revertedWith(`AmountInsufficient(${amount})`)

      const isClaimed = await pool.claimed(root, alice.address)
      expect(isClaimed).to.equal(false)
    })

    it('withdraw with different recipient reverts if caller not participant', async () => {
      await feeToken.mock.balanceOf.returns('100000')

      await pool.addAdmin(alice.address)
      const root = getRoot(tree)
      await pool.connect(alice).enable(root)
      let proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))

      const withdrawMinimum = 496

      await expect(
        pool.connect(bob).withdrawWithRecipient(
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
      ).to.be.revertedWith(`ProofInvalid([${stringifiedProof(proof)}]`)
    })

    it('withdrawAndStake success', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transferFrom.returns(true)

      await pool.addAdmin(alice.address)
      const root = getRoot(tree)
      await pool.connect(alice).enable(root)
      let proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))

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
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transferFrom.returns(true)

      await pool.addAdmin(alice.address)
      const root = getRoot(tree)
      await pool.connect(alice).enable(root)
      let proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))

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
      ).to.be.revertedWith(`TokenInvalid("${feeToken2.address}")`)
    })

    it('withdrawAndStake for a recipient success', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.approve.returns(true)
      await feeToken.mock.allowance.returns(0)
      await feeToken.mock.transferFrom.returns(true)

      await pool.addAdmin(alice.address)
      const root = getRoot(tree)
      await pool.connect(alice).enable(root)
      let proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))

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

    it('withdrawAndStake for a recipient reverts with wrong token', async () => {
      await pool.addAdmin(alice.address)
      const root = getRoot(tree)
      await pool.connect(alice).enable(root)
      let proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))

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
      ).to.be.revertedWith(`TokenInvalid("${feeToken2.address}")`)
    })
  })

  describe('Test Calculate', async () => {
    it('Test calculation input and output', async () => {
      await feeToken.mock.balanceOf.returns('100000')

      const amount = await pool.calculate(ALICE_SCORE, feeToken.address)
      expect(amount).to.equal('495')
    })
  })

  describe('Test Verify', async () => {
    it('Test verification is valid', async () => {
      await pool.addAdmin(alice.address)
      const root = getRoot(tree)
      await pool.connect(alice).enable(root)
      let proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))

      const isValid = await pool.verify(alice.address, root, ALICE_SCORE, proof)
      expect(isValid).to.be.equal(true)
    })

    it('Test verification is invalid with wrong participant', async () => {
      await pool.addAdmin(alice.address)
      const root = getRoot(tree)
      await pool.connect(alice).enable(root)
      let proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))

      const isValid = await pool.verify(bob.address, root, ALICE_SCORE, proof)
      expect(isValid).to.be.equal(false)
    })

    it('Test verification is invalid with wrong scroe', async () => {
      await pool.addAdmin(alice.address)
      const root = getRoot(tree)
      await pool.connect(alice).enable(root)
      let proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))

      const isValid = await pool.verify(alice.address, root, BOB_SCORE, proof)
      expect(isValid).to.be.equal(false)
    })
  })

  describe('Test setting Scale', async () => {
    it('Test setScale is successful', async () => {
      const scale = 77
      await expect(pool.setScale(scale)).to.emit(pool, 'SetScale')
      expect(await pool.scale()).to.be.equal(`${scale}`)
    })

    it('Test setScale reverts when not owner', async () => {
      const scale = 77
      await expect(pool.connect(alice).setScale(scale)).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )
    })

    it('Test setScale reverts', async () => {
      const scale = 1000
      await expect(pool.setScale(scale)).to.be.revertedWith(
        `ScaleTooHigh(${scale})`
      )
    })
  })

  describe('Test setting Max', async () => {
    it('Test setMax is successful', async () => {
      const max = 10
      await expect(pool.setMax(max)).to.emit(pool, 'SetMax')
      expect(await pool.scale()).to.be.equal(`${max}`)
    })

    it('Test setMax reverts when not owner', async () => {
      const max = 10
      await expect(pool.connect(alice).setMax(max)).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )
    })

    it('Test setMax reverts', async () => {
      const max = 101
      await expect(pool.setMax(max)).to.be.revertedWith(`MaxTooHigh(${max})`)
    })
  })

  describe('Test setting admin', async () => {
    it('Test addAdmin is successful', async () => {
      await expect(pool.addAdmin(alice.address)).to.emit(pool, 'AddAdmin')
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
      ).to.be.revertedWith(`AddressInvalid("${ADDRESS_ZERO}")`)
    })

    it('Test removeAdmin is successful', async () => {
      await expect(pool.addAdmin(alice.address)).to.emit(pool, 'AddAdmin')
      await expect(pool.removeAdmin(alice.address)).to.emit(pool, 'RemoveAdmin')
      expect(await pool.admins(alice.address)).to.be.equal(false)
    })

    it('Test removeAdmin reverts', async () => {
      await expect(pool.addAdmin(alice.address)).to.emit(pool, 'AddAdmin')
      await expect(
        pool.connect(alice).removeAdmin(alice.address)
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('Test removeAdmin executed by non-admin reverts', async () => {
      await expect(
        pool.connect(deployer).removeAdmin(alice.address)
      ).to.be.revertedWith(`AdminNotSet("${alice.address}")`)
    })
  })

  describe('Test drain to', async () => {
    it('Test drain to is successful', async () => {
      await feeToken.mock.balanceOf.returns('10')
      await feeToken.mock.transfer.returns(true)
      await feeToken2.mock.balanceOf.returns('10')
      await feeToken2.mock.transfer.returns(true)

      await expect(
        pool
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
