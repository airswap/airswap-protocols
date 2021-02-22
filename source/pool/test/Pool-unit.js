const Pool = artifacts.require('Pool')
const ERC20PresetMinterPauser = artifacts.require('ERC20PresetMinterPauser')
const MockContract = artifacts.require('MockContract')
const { soliditySha3 } = require('web3-utils')
const { toAtomicString } = require('@airswap/utils')
const { emitted, equal, reverted } = require('@airswap/test-utils').assert
const { generateTreeFromData, getRoot, getProof } = require('@airswap/merkle')
const { takeSnapshot, revertToSnapshot } = require('@airswap/test-utils').time
const { ADDRESS_ZERO } = require('@airswap/constants')

function toWei(value, places) {
  return toAtomicString(value, places || 18)
}

contract('Pool Unit Tests', async accounts => {
  const [ownerAddress, aliceAddress, bobAddress, carolAddress] = accounts

  const CLAIM_SCALE = 10
  const CLAIM_MAX = 50

  const ALICE_SCORE = toWei(10000, 4)
  const BOB_SCORE = toWei(100000, 4)
  const CAROL_SCORE = toWei(1000000, 4)

  let tree
  let feeToken
  let feeToken2
  let pool
  let mockFungibleTokenTemplate
  let snapshotId

  beforeEach(async () => {
    const snapshot = await takeSnapshot()
    snapshotId = snapshot['result']
  })

  afterEach(async () => {
    await revertToSnapshot(snapshotId)
  })

  before(async () => {
    pool = await Pool.new(CLAIM_SCALE, CLAIM_MAX, { from: ownerAddress })
    tree = generateTreeFromData({
      [aliceAddress]: ALICE_SCORE,
      [bobAddress]: BOB_SCORE,
      [carolAddress]: CAROL_SCORE,
    })
    feeToken = await MockContract.new()
    feeToken2 = await MockContract.new()
    mockFungibleTokenTemplate = await ERC20PresetMinterPauser.new('Fee', 'FEE')
  })

  describe('Test Constructor', async () => {
    it('Test Constructor successful', async () => {
      const instance = await Pool.new(CLAIM_SCALE, CLAIM_MAX, {
        from: ownerAddress,
      })
      equal((await instance.scale()).toString(), CLAIM_SCALE.toString())
      equal((await instance.max()).toString(), CLAIM_MAX.toString())
    })

    it('Test Constructor reverts when percentage is too high', async () => {
      await reverted(
        Pool.new(CLAIM_SCALE, 101, { from: ownerAddress }),
        'MAX_TOO_HIGH'
      )
    })

    it('Test Constructor reverts when scale is too high', async () => {
      await reverted(
        Pool.new(78, CLAIM_MAX, { from: ownerAddress }),
        'SCALE_TOO_HIGH'
      )
    })
  })

  describe('Test enable', async () => {
    it('Test enable successful', async () => {
      const root = getRoot(tree)
      const trx = await pool.enable(root, { from: ownerAddress })
      const isEnabled = await pool.roots(root)
      equal(isEnabled, true)
      emitted(trx, 'Enable', e => {
        return e.root == root
      })
    })

    it('Test enable reverts', async () => {
      const root = getRoot(tree)
      await pool.enable(root, { from: ownerAddress })
      // resumit the same root
      await reverted(pool.enable(root, { from: ownerAddress }), 'ROOT_EXISTS')
    })
  })

  describe('Test withdraw', async () => {
    it('Test withdraw success', async () => {
      const mockToken_balanceOf = await mockFungibleTokenTemplate.contract.methods
        .balanceOf(ADDRESS_ZERO)
        .encodeABI()
      await feeToken.givenMethodReturnUint(mockToken_balanceOf, '100000')

      const mockToken_transfer = await mockFungibleTokenTemplate.contract.methods
        .transfer(ADDRESS_ZERO, 0)
        .encodeABI()
      await feeToken.givenMethodReturnBool(mockToken_transfer, true)

      const root = getRoot(tree)
      await pool.enable(root, { from: ownerAddress })

      const proof = getProof(tree, soliditySha3(aliceAddress, ALICE_SCORE))
      const trx = await pool.withdraw(
        [
          {
            root: getRoot(tree),
            score: ALICE_SCORE,
            proof,
          },
        ],
        feeToken.address,
        {
          from: aliceAddress,
        }
      )

      emitted(trx, 'Withdraw', e => {
        return (
          e.roots[0] === root &&
          e.account === aliceAddress &&
          e.token === feeToken.address &&
          e.amount.toString() === '495'
        )
      })

      const isClaimed = await pool.claimed(root, aliceAddress)
      equal(isClaimed, true)
    })

    it('Test withdraw reverts with no claims provided', async () => {
      await reverted(
        pool.withdraw([], feeToken.address, {
          from: aliceAddress,
        }),
        'CLAIMS_MUST_BE_PROVIDED'
      )
    })

    it('Test withdraw reverts with root not enabled', async () => {
      const proof = getProof(tree, soliditySha3(aliceAddress, ALICE_SCORE))
      await reverted(
        pool.withdraw(
          [
            {
              root: getRoot(tree),
              score: ALICE_SCORE,
              proof,
            },
          ],
          feeToken.address,
          {
            from: aliceAddress,
          }
        ),
        'ROOT_NOT_ENABLED'
      )
    })

    it('Test withdraw reverts with claim already made', async () => {
      const mockToken_transfer = await mockFungibleTokenTemplate.contract.methods
        .transfer(ADDRESS_ZERO, 0)
        .encodeABI()
      await feeToken.givenMethodReturnBool(mockToken_transfer, true)

      const root = getRoot(tree)
      await pool.enable(root, { from: ownerAddress })

      const proof = getProof(tree, soliditySha3(aliceAddress, ALICE_SCORE))
      await pool.withdraw(
        [
          {
            root: getRoot(tree),
            score: ALICE_SCORE,
            proof,
          },
        ],
        feeToken.address,
        {
          from: aliceAddress,
        }
      )
      await reverted(
        pool.withdraw(
          [
            {
              root: getRoot(tree),
              score: ALICE_SCORE,
              proof,
            },
          ],
          feeToken.address,
          {
            from: aliceAddress,
          }
        ),
        'CLAIM_ALREADY_MADE'
      )
    })

    it('Test withdraw reverts with invalid proof', async () => {
      const mockToken_transfer = await mockFungibleTokenTemplate.contract.methods
        .transfer(ADDRESS_ZERO, 0)
        .encodeABI()
      await feeToken.givenMethodReturnBool(mockToken_transfer, true)

      const root = getRoot(tree)
      await pool.enable(root, { from: ownerAddress })

      const proof = getProof(tree, soliditySha3(aliceAddress, ALICE_SCORE))

      await reverted(
        pool.withdraw(
          [
            {
              root: getRoot(tree),
              score: BOB_SCORE,
              proof,
            },
          ],
          feeToken.address,
          {
            from: aliceAddress,
          }
        ),
        'PROOF_INVALID'
      )
    })
  })

  describe('Test Calculate', async () => {
    it('Test calculation input and output', async () => {
      const mockToken_balanceOf = await mockFungibleTokenTemplate.contract.methods
        .balanceOf(ADDRESS_ZERO)
        .encodeABI()
      await feeToken.givenMethodReturnUint(mockToken_balanceOf, '100000')

      const amount = await pool.calculate(ALICE_SCORE, feeToken.address)
      equal(amount.toString(), '495')
    })
  })

  describe('Test Calculate Multiple', async () => {
    it('Test calculation input and output', async () => {
      const mockToken_balanceOf = await mockFungibleTokenTemplate.contract.methods
        .balanceOf(ADDRESS_ZERO)
        .encodeABI()
      await feeToken.givenMethodReturnUint(mockToken_balanceOf, '100000')
      await feeToken2.givenMethodReturnUint(mockToken_balanceOf, '10000')

      const amounts = await pool.calculateMultiple(ALICE_SCORE, [
        feeToken.address,
        feeToken2.address,
      ])
      equal(amounts[0].toString(), '495')
      equal(amounts[1].toString(), '49')
    })
  })

  describe('Test Verify', async () => {
    it('Test verification is valid', async () => {
      const root = getRoot(tree)
      const proof = getProof(tree, soliditySha3(aliceAddress, ALICE_SCORE))
      const isValid = await pool.verify(aliceAddress, root, ALICE_SCORE, proof)
      equal(isValid, true)
    })

    it('Test verification is invalid', async () => {
      const root = getRoot(tree)
      const proof = getProof(tree, soliditySha3(aliceAddress, ALICE_SCORE))
      const isValid = await pool.verify(aliceAddress, root, BOB_SCORE, proof)
      equal(isValid, false)
    })
  })

  describe('Test setting Scale', async () => {
    it('Test setScale is successful', async () => {
      const trx = await pool.setScale(77)
      const scale = await pool.scale()
      equal(scale.toString(), '77')
      emitted(trx, 'SetScale', e => {
        return e.scale.toString() === '77'
      })
    })

    it('Test setScale reverts', async () => {
      await reverted(pool.setScale(1000), 'SCALE_TOO_HIGH')
    })
  })

  describe('Test setting Max', async () => {
    it('Test setMax is successful', async () => {
      const trx = await pool.setMax(10)
      const max = await pool.max()
      equal(max.toString(), '10')
      emitted(trx, 'SetMax', e => {
        return e.max.toString() === '10'
      })
    })

    it('Test setMax reverts', async () => {
      await reverted(pool.setMax(101), 'MAX_TOO_HIGH')
    })
  })

  describe('Test drain to', async () => {
    it('Test drain to is successful', async () => {
      const mockToken_transfer = await mockFungibleTokenTemplate.contract.methods
        .transfer(ADDRESS_ZERO, 0)
        .encodeABI()
      const mockToken_balanceOf = await mockFungibleTokenTemplate.contract.methods
        .balanceOf(ADDRESS_ZERO)
        .encodeABI()
      await feeToken.givenMethodReturnBool(mockToken_transfer, true)
      await feeToken.givenMethodReturnUint(mockToken_balanceOf, 10)
      await feeToken2.givenMethodReturnBool(mockToken_transfer, true)
      await feeToken2.givenMethodReturnUint(mockToken_balanceOf, 10)

      const trx = await pool.drainTo(
        [feeToken.address, feeToken2.address],
        carolAddress
      )

      emitted(trx, 'DrainTo', e => {
        return (
          e.tokens[0] === feeToken.address &&
          e.tokens[1] === feeToken2.address &&
          e.dest === carolAddress
        )
      })
    })

    it('Test dtain to is only callable by owner', async () => {
      await reverted(
        pool.drainTo([feeToken.address, feeToken2.address], carolAddress, {
          from: aliceAddress,
        }),
        'Ownable: caller is not the owner'
      )
    })
  })
})
