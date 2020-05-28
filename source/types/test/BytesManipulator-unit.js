const MockBytesManipulator = artifacts.require('MockBytesManipulator')
const { equal } = require('@airswap/test-utils').assert

const { takeSnapshot, revertToSnapshot } = require('@airswap/test-utils').time

contract('BytesManipulator Unit Tests', async () => {
  let bytesManipulator
  let snapshotId

  const data =
    '0x67641c2f00000000000000000000000000000000000000000000000000000171db1fe2e3000000000000000000000000000000000000000000000000000000005eb032c036372b07000000000000000000000000000000000000000000000000000000000000000000000000000000005567d988dbd49a740d77fc0394f231043c6787a70000000000000000000000000ba45a8b5d5575935b8158a88c631e9f9c95a2e500000000000000000000000000000000000000000000010f0cf064dd59200000000000000000000000000000000000000000000000000000000000000000000036372b07000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec700000000000000000000000000000000000000000000000000000005d21dba00000000000000000000000000000000000000000000000000000000000000000036372b0700000000000000000000000000000000000000000000000000000000000000000000000000000000ff98f0052bda391f8fad266685609ffb192bef250000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005567d988dbd49a740d77fc0394f231043c6787a70000000000000000000000004572f2554421bd64bef1c22c8a81840e8d496bea0100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001b0eff36a51120e4ce067579c126f0449ce0ade09445fec84281e236c2a74ad1400a60ad444341cb7fff30aad4abdb4aeb94eaf4d338d0ede3aa5ce669fe99b418'

  beforeEach(async () => {
    const snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapshot(snapshotId)
  })

  before('deploy MockBytesManipulator', async () => {
    bytesManipulator = await MockBytesManipulator.new()
  })

  describe('Test getBytes32', async () => {
    it('Test get first 32 bytes ', async () => {
      const result = await bytesManipulator.getBytes32.call(data, 0)

      equal(result, data.slice(0, 66), 'result incorrect')
    })

    it('Test get first 32 bytes of 32 bytes', async () => {
      const data32bytes =
        '0x67641c2f00000000000000000000000000000000000000000000000000000171'

      const result = await bytesManipulator.getBytes32.call(data32bytes, 0)

      equal(result, data32bytes.slice(0, 66), 'result incorrect')
    })

    it('Test get first 32 bytes of 64 bytes', async () => {
      const data64bytes =
        '0x67641c2f0000000000000000000000000000000000000000000000000000017167641c2f00000000000000000000000000000000000000000000000000000171'

      const result = await bytesManipulator.getBytes32.call(data64bytes, 0)

      equal(result, data64bytes.slice(0, 66), 'result incorrect')
    })

    it('Test get second 32 bytes', async () => {
      const result = await bytesManipulator.getBytes32.call(data, 32)

      equal(result, `0x${data.slice(66, 130)}`, 'result incorrect')
    })
  })

  describe('Test getUint256', async () => {
    it('Test get first 32 bytes ', async () => {
      const result = await bytesManipulator.getUint256.call(data, 5)

      equal(
        parseInt(result),
        parseInt(data.slice(2 * 5 + 2, 2 * 37 + 2), 16),
        'result incorrect'
      )
    })
  })

  describe('Test getBytesAssembly', async () => {
    it('Test get first 32 bytes', async () => {
      const start = 32
      const length = 47
      const result = await bytesManipulator.getBytesAssembly.call(
        data,
        start,
        length
      )
      equal(
        result,
        `0x${data.slice(2 * start + 2, 2 * (start + length) + 2)}`,
        'result incorrect'
      )
    })
  })
})
