const MakerDelegate = artifacts.require('MakerDelegate')
const Swap = artifacts.require('Swap')
const Types = artifacts.require('Types')
const FungibleToken = artifacts.require('FungibleToken')

const { emitted, reverted, equal } = require('@airswap/test-utils').assert
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time
const { orders } = require('@airswap/order-utils')

let snapshotId

contract('MakerDelegate', async accounts => {
  let aliceAddress = accounts[0]
  let bobAddress = accounts[1]
  let carolAddress = accounts[2]
  let davidAddress = accounts[3]

  let aliceMakerDelegate

  let swapContract
  let swapAddress

  let tokenDAI
  let tokenWETH

  orders.setKnownAccounts([
    aliceAddress,
    bobAddress,
    carolAddress,
    davidAddress,
  ])

  before('Setup', async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  after(async () => {
    await revertToSnapShot(snapshotId)
  })

  describe('Deploying...', async () => {})

  describe('Checks set and unset rule', async () => {})

  describe('Checks pricing logic from the MakerDelegate', async () => {})

  describe('Checks quotes from the MakerDelegate', async () => {})

  describe('Provide some orders to the MakerDelegate', async () => {})
})
