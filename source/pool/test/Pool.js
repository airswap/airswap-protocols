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
  let stakingContract

  const GROUP_ID =
    '0x0000000000000000000000000000000000000000000000000000000000000000'
  const NEW_GROUP_ID =
    '0x0000000000000000000000000000000000000000000000000000000000000001'

  const CLAIM_SCALE = 10
  const CLAIM_MAX = 50

  const ALICE_SCORE = toWei(10000, 4)
  const BOB_SCORE = toWei(100000, 4)
  const CAROL_SCORE = toWei(1000000, 4)

  const BOB_NEW_SCORE = toWei(200000, 4)

  let tree
  let newTree
  let score
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
    await feeToken.mock.allowance.returns(0)
    feeToken2 = await deployMockContract(deployer, IERC20.abi)
    await feeToken2.mock.approve.returns(true)
    await feeToken2.mock.allowance.returns(0)

    stakingContract = await (
      await ethers.getContractFactory(STAKING.abi, STAKING.bytecode)
    ).deploy('StakedAST', 'sAST', feeToken.address, 100, 10)
    await stakingContract.deployed()

    pool = await (
      await ethers.getContractFactory('Pool')
    ).deploy(CLAIM_SCALE, CLAIM_MAX)
    await pool.deployed()

    await pool.setStaking(feeToken.address, stakingContract.address)
    await pool.addAdmin(deployer.address)

    tree = generateTreeFromData({
      [alice.address]: ALICE_SCORE,
      [bob.address]: BOB_SCORE,
      [carol.address]: CAROL_SCORE,
    })

    newTree = generateTreeFromData({
      [alice.address]: ALICE_SCORE,
      [bob.address]: BOB_NEW_SCORE,
      [carol.address]: CAROL_SCORE,
    })
  })

  describe('Test constructor', async () => {
    it('constructor sets values', async () => {
      const storedScale = await pool.scale()
      const storedMax = await pool.max()
      expect(storedScale).to.equal(CLAIM_SCALE)
      expect(storedMax).to.equal(CLAIM_MAX)
    })

    it('constructor reverts when percentage is too high', async () => {
      const max = 101
      await expect(
        (await ethers.getContractFactory('Pool')).deploy(CLAIM_SCALE, max)
      )
        .to.be.revertedWith(`MaxTooHigh`)
        .withArgs(max)
    })

    it('constructor reverts when scale is too high', async () => {
      const scale = 78
      await expect(
        (await ethers.getContractFactory('Pool')).deploy(scale, CLAIM_MAX)
      )
        .to.be.revertedWith(`ScaleTooHigh`)
        .withArgs(scale)
    })

    it('constructor reverts when missing an argument', async () => {
      await expect((await ethers.getContractFactory('Pool')).deploy(CLAIM_MAX))
        .to.be.reverted
    })
  })

  describe('Test admin functions', async () => {
    it('enable a claim for a merkle root suceeds', async () => {
      const root = getRoot(tree)
      expect(await pool.connect(deployer).enable(GROUP_ID, root)).to.emit(
        pool,
        'Enable'
      )
    })

    it('enable a claim for a merkle root fails when not admin', async () => {
      const root = getRoot(tree)
      await expect(pool.connect(bob).enable(GROUP_ID, root)).to.be.revertedWith(
        'Unauthorized'
      )
    })

    it('enable a root twice fails', async () => {
      const root = getRoot(tree)
      await pool.connect(deployer).enable(GROUP_ID, root)
      await expect(pool.connect(deployer).enable(GROUP_ID, root))
        .to.be.revertedWith(`GroupIdExists`)
        .withArgs(GROUP_ID)
    })

    it('enable a with the same group id twice fails', async () => {
      const root = getRoot(tree)
      await pool.connect(deployer).enable(GROUP_ID, root)
      const newRoot = getRoot(newTree)
      await expect(pool.connect(deployer).enable(GROUP_ID, newRoot))
        .to.be.revertedWith(`GroupIdExists`)
        .withArgs(GROUP_ID)
    })

    it('Test setclaimed with admin is successful', async () => {
      await feeToken.mock.balanceOf.returns('100000')

      await pool.addAdmin(alice.address)
      await pool.connect(alice).setClaimed(GROUP_ID, [bob.address])
      const proof = getProof(tree, soliditySha3(bob.address, BOB_SCORE))

      await expect(
        pool.connect(bob).withdraw(
          [
            {
              groupId: GROUP_ID,
              score: BOB_SCORE,
              proof,
            },
          ],
          feeToken.address
        )
      ).to.be.revertedWith('GroupDisabled')
    })

    it('Test setclaimed with non-admin reverts', async () => {
      await feeToken.mock.balanceOf.returns('100000')

      await expect(
        pool.connect(alice).setClaimed(GROUP_ID, [bob.address])
      ).to.be.revertedWith('Unauthorized')
    })

    it('Test setclaimed reverts with claim already made', async () => {
      await feeToken.mock.balanceOf.returns('100000')

      await pool.connect(deployer).setClaimed(GROUP_ID, [bob.address])

      await expect(
        pool.connect(deployer).setClaimed(GROUP_ID, [bob.address])
      ).to.be.revertedWith('AlreadyClaimed')
    })
  })

  describe('Test staking variables', async () => {
    it('set stake token and contract successful', async () => {
      await expect(
        pool
          .connect(deployer)
          .setStaking(feeToken.address, stakingContract.address)
      ).to.emit(pool, 'SetStaking')
      expect(await pool.stakingContract()).to.equal(stakingContract.address)
      expect(await pool.stakingToken()).to.equal(feeToken.address)
    })

    it('set stake contract fails when not owner', async () => {
      await expect(
        pool
          .connect(alice)
          .setStaking(feeToken.address, stakingContract.address)
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('set stake contract with bad token address reverts', async () => {
      await expect(
        pool.connect(deployer).setStaking(ADDRESS_ZERO, stakingContract.address)
      )
        .to.be.revertedWith(`AddressInvalid`)
        .withArgs(ADDRESS_ZERO)
    })

    it('set stake contract with bad contract address reverts', async () => {
      await expect(
        pool.connect(deployer).setStaking(feeToken.address, ADDRESS_ZERO)
      )
        .to.be.revertedWith(`AddressInvalid`)
        .withArgs(ADDRESS_ZERO)
    })
  })

  describe('Test withdraw', async () => {
    it('withdraw success', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transfer.returns(true)

      await pool.addAdmin(alice.address)
      const root = getRoot(tree)
      await pool.connect(alice).enable(GROUP_ID, root)
      const proof = getProof(tree, soliditySha3(bob.address, BOB_SCORE))

      await expect(
        pool.connect(bob).withdraw(
          [
            {
              groupId: GROUP_ID,
              score: BOB_SCORE,
              proof,
            },
          ],
          feeToken.address
        )
      ).to.emit(pool, 'Withdraw')

      const isClaimed = await pool.claimed(GROUP_ID, bob.address)
      expect(isClaimed).to.equal(true)
    })

    it('withdraw reverts with no claim provided', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transfer.returns(true)

      await pool.addAdmin(alice.address)
      const root = getRoot(tree)
      await pool.connect(alice).enable(GROUP_ID, root)

      await expect(
        pool.connect(bob).withdraw([], feeToken.address)
      ).to.be.revertedWith(`ClaimsNotProvided`)

      const isClaimed = await pool.claimed(GROUP_ID, bob.address)
      expect(isClaimed).to.equal(false)
    })

    it('withdraw reverts with no root enabled', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transfer.returns(true)

      await pool.addAdmin(alice.address)
      const proof = getProof(tree, soliditySha3(bob.address, BOB_SCORE))

      await expect(
        pool.connect(bob).withdraw(
          [
            {
              groupId: GROUP_ID,
              score: BOB_SCORE,
              proof,
            },
          ],
          feeToken.address
        )
      )
        .to.be.revertedWith(`GroupDisabled`)
        .withArgs(GROUP_ID)

      const isClaimed = await pool.claimed(GROUP_ID, bob.address)
      expect(isClaimed).to.equal(false)
    })

    it('withdraw reverts with claim already made', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transfer.returns(true)

      await pool.addAdmin(alice.address)
      const root = getRoot(tree)
      await pool.connect(alice).enable(GROUP_ID, root)
      const proof = getProof(tree, soliditySha3(bob.address, BOB_SCORE))

      await expect(
        pool.connect(bob).withdraw(
          [
            {
              groupId: GROUP_ID,
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
              groupId: GROUP_ID,
              score: BOB_SCORE,
              proof,
            },
          ],
          feeToken.address
        )
      ).to.be.revertedWith(`AlreadyClaimed`)

      const isClaimed = await pool.claimed(GROUP_ID, bob.address)
      expect(isClaimed).to.equal(true)
    })

    it('withdraw reverts with score of zero', async () => {
      score = 0

      await pool.addAdmin(alice.address)
      const root = getRoot(tree)
      await pool.connect(alice).enable(GROUP_ID, root)
      const proof = getProof(tree, soliditySha3(bob.address, BOB_SCORE))

      await expect(
        pool.connect(bob).withdraw(
          [
            {
              groupId: GROUP_ID,
              score: score,
              proof,
            },
          ],
          feeToken.address
        )
      )
        .to.be.revertedWith(`ProofInvalid`)
        .withArgs(root)

      const isClaimed = await pool.claimed(GROUP_ID, bob.address)
      expect(isClaimed).to.equal(false)
    })

    it('withdraw with different recipient success', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transfer.returns(true)

      await pool.addAdmin(alice.address)
      const root = getRoot(tree)
      await pool.connect(alice).enable(GROUP_ID, root)
      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))

      const withdrawMinimum = 0

      await expect(
        pool.connect(alice).withdrawWithRecipient(
          [
            {
              groupId: GROUP_ID,
              score: ALICE_SCORE,
              proof,
            },
          ],
          feeToken.address,
          withdrawMinimum,
          bob.address
        )
      ).to.emit(pool, 'Withdraw')

      const isClaimed = await pool.claimed(GROUP_ID, alice.address)
      expect(isClaimed).to.equal(true)
    })

    it('withdraw with different recipient reverts with minimumAmount not met', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transfer.returns(true)

      await pool.addAdmin(alice.address)
      const root = getRoot(tree)
      await pool.connect(alice).enable(GROUP_ID, root)
      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))
      const withdrawMinimum = 496

      const amount = await pool
        .connect(alice)
        .calculate(ALICE_SCORE, feeToken.address)

      await expect(
        pool.connect(alice).withdrawWithRecipient(
          [
            {
              groupId: GROUP_ID,
              score: ALICE_SCORE,
              proof,
            },
          ],
          feeToken.address,
          withdrawMinimum,
          bob.address
        )
      )
        .to.be.revertedWith(`AmountInsufficient`)
        .withArgs(amount)

      const isClaimed = await pool.claimed(GROUP_ID, alice.address)
      expect(isClaimed).to.equal(false)
    })

    it('withdraw with different recipient reverts if caller not participant', async () => {
      await feeToken.mock.balanceOf.returns('100000')

      await pool.addAdmin(alice.address)
      const root = getRoot(tree)
      await pool.connect(alice).enable(GROUP_ID, root)
      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))

      const withdrawMinimum = 496

      await expect(
        pool.connect(bob).withdrawWithRecipient(
          [
            {
              groupId: GROUP_ID,
              score: ALICE_SCORE,
              proof,
            },
          ],
          feeToken.address,
          withdrawMinimum,
          bob.address
        )
      )
        .to.be.revertedWith(`ProofInvalid`)
        .withArgs(root)
    })

    it('withdrawAndStake success', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transferFrom.returns(true)

      await pool.addAdmin(alice.address)
      const root = getRoot(tree)
      await pool.connect(alice).enable(GROUP_ID, root)
      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))

      const withdrawMinimum = 0

      await expect(
        pool.connect(alice).withdrawAndStake(
          [
            {
              groupId: GROUP_ID,
              score: ALICE_SCORE,
              proof,
            },
          ],
          feeToken.address,
          withdrawMinimum
        )
      ).to.emit(pool, 'Withdraw')

      const isClaimed = await pool.claimed(GROUP_ID, alice.address)
      expect(isClaimed).to.equal(true)

      const balance = await stakingContract
        .connect(alice)
        .balanceOf(alice.address)
      expect(balance).to.equal('495')
    })

    it('withdrawAndStake reverts with wrong token', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transferFrom.returns(true)

      await pool.addAdmin(alice.address)
      const root = getRoot(tree)
      await pool.connect(alice).enable(GROUP_ID, root)
      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))

      const withdrawMinimum = 0

      await expect(
        pool.connect(alice).withdrawAndStake(
          [
            {
              groupId: GROUP_ID,
              score: ALICE_SCORE,
              proof,
            },
          ],
          feeToken2.address,
          withdrawMinimum
        )
      )
        .to.be.revertedWith(`TokenInvalid`)
        .withArgs(feeToken2.address)
    })

    it('withdrawAndStake for a recipient success', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.approve.returns(true)
      await feeToken.mock.allowance.returns(0)
      await feeToken.mock.transferFrom.returns(true)

      await pool.addAdmin(alice.address)
      const root = getRoot(tree)
      await pool.connect(alice).enable(GROUP_ID, root)
      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))

      const withdrawMinimum = 0

      await expect(
        pool.connect(alice).withdrawAndStakeFor(
          [
            {
              groupId: GROUP_ID,
              score: ALICE_SCORE,
              proof,
            },
          ],
          feeToken.address,
          withdrawMinimum,
          bob.address
        )
      ).to.emit(pool, 'Withdraw')

      const isClaimed = await pool.claimed(GROUP_ID, alice.address)
      expect(isClaimed).to.equal(true)

      const balance = await stakingContract.connect(bob).balanceOf(bob.address)
      expect(balance).to.equal('495')
    })

    it('withdraw and stake reverts with minimumAmount not met', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transfer.returns(true)
      await feeToken.mock.allowance.returns(0)
      await feeToken.mock.transferFrom.returns(true)

      await pool.addAdmin(alice.address)
      const root = getRoot(tree)
      await pool.connect(alice).enable(GROUP_ID, root)
      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))
      const withdrawMinimum = 496

      const amount = await pool
        .connect(alice)
        .calculate(ALICE_SCORE, feeToken.address)

      await expect(
        pool.connect(alice).withdrawAndStakeFor(
          [
            {
              groupId: GROUP_ID,
              score: ALICE_SCORE,
              proof,
            },
          ],
          feeToken.address,
          withdrawMinimum,
          bob.address
        )
      )
        .to.be.revertedWith(`AmountInsufficient`)
        .withArgs(amount)

      const isClaimed = await pool.claimed(GROUP_ID, alice.address)
      expect(isClaimed).to.equal(false)
    })

    it('withdrawAndStake for a recipient reverts with wrong token', async () => {
      await pool.addAdmin(alice.address)
      const root = getRoot(tree)
      await pool.connect(alice).enable(GROUP_ID, root)
      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))

      const withdrawMinimum = 0

      await expect(
        pool.connect(alice).withdrawAndStakeFor(
          [
            {
              groupId: GROUP_ID,
              score: ALICE_SCORE,
              proof,
            },
          ],
          feeToken2.address,
          withdrawMinimum,
          bob.address
        )
      )
        .to.be.revertedWith(`TokenInvalid`)
        .withArgs(feeToken2.address)
    })

    it('withdraw marks group for address as claimed', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transfer.returns(true)

      await pool.addAdmin(alice.address)
      const root = getRoot(tree)
      const newRoot = getRoot(newTree)
      await pool.connect(alice).enable(GROUP_ID, root)
      await pool.connect(alice).enable(NEW_GROUP_ID, newRoot)
      const proof = getProof(tree, soliditySha3(bob.address, BOB_SCORE))

      await pool.connect(bob).withdraw(
        [
          {
            groupId: GROUP_ID,
            score: BOB_SCORE,
            proof,
          },
        ],
        feeToken.address
      )

      const isClaimed = await pool.hasClaimedGroups(bob.address, [
        GROUP_ID,
        NEW_GROUP_ID,
      ])
      expect(await isClaimed[0]).to.equal(true)
      expect(await isClaimed[1]).to.equal(false)
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
      await pool.connect(alice).enable(GROUP_ID, root)
      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))

      const isValid = await pool.verify(alice.address, root, ALICE_SCORE, proof)
      expect(isValid).to.be.equal(true)
    })

    it('Test verification is invalid with wrong participant', async () => {
      await pool.addAdmin(alice.address)
      const root = getRoot(tree)
      await pool.connect(alice).enable(GROUP_ID, root)
      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))

      const isValid = await pool.verify(bob.address, root, ALICE_SCORE, proof)
      expect(isValid).to.be.equal(false)
    })

    it('Test verification is invalid with wrong scroe', async () => {
      await pool.addAdmin(alice.address)
      const root = getRoot(tree)
      await pool.connect(alice).enable(GROUP_ID, root)
      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))

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
      await expect(pool.setScale(scale))
        .to.be.revertedWith(`ScaleTooHigh`)
        .withArgs(scale)
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
      await expect(pool.setMax(max))
        .to.be.revertedWith(`MaxTooHigh`)
        .withArgs(max)
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
      await expect(pool.connect(deployer).addAdmin(ADDRESS_ZERO))
        .to.be.revertedWith(`AddressInvalid`)
        .withArgs(ADDRESS_ZERO)
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
      await expect(pool.connect(deployer).removeAdmin(alice.address))
        .to.be.revertedWith(`AdminNotSet`)
        .withArgs(alice.address)
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
