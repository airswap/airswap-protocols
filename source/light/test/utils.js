const util = require('ethereumjs-util')
const { ethers } = require('ethers')

const EIP712 = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
  ],
  LightOrder: [
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' },
    { name: 'sender', type: 'address' },
    { name: 'signerToken', type: 'address' },
    { name: 'signerAmount', type: 'uint256' },
    { name: 'senderToken', type: 'address' },
    { name: 'senderAmount', type: 'uint256' },
  ],
}

function stringify(type) {
  let str = `${type}(`
  const keys = Object.keys(EIP712[type])
  for (let i = 0; i < keys.length; i++) {
    str += `${EIP712[type][i].type} ${EIP712[type][i].name}`
    if (i !== keys.length - 1) {
      str += ','
    }
  }
  return `${str})`
}

const ORDER_TYPEHASH = util.keccak256(stringify('LightOrder'))

const EIP712_DOMAIN_TYPEHASH = util.keccak256(stringify('EIP712Domain'))

const DOMAIN_NAME = 'SWAP_LIGHT'
const DOMAIN_VERSION = '3'
const DOMAIN_CHAIN_ID = 1

function hashOrder(order) {
  return util.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      [
        'bytes32',
        'uint256',
        'uint256',
        'address',
        'address',
        'uint256',
        'address',
        'uint256',
      ],
      [
        ORDER_TYPEHASH,
        order.nonce,
        order.expiry,
        order.sender,
        order.signerToken,
        order.signerAmount,
        order.senderToken,
        order.senderAmount,
      ]
    )
  )
}

function hashDomain(swapContract) {
  return util.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
      [
        EIP712_DOMAIN_TYPEHASH,
        util.keccak256(DOMAIN_NAME),
        util.keccak256(DOMAIN_VERSION),
        DOMAIN_CHAIN_ID,
        swapContract,
      ]
    )
  )
}

function getOrderHash(order, swapContract) {
  return util.keccak256(
    Buffer.concat([
      Buffer.from('1901', 'hex'),
      hashDomain(swapContract),
      hashOrder(order),
    ])
  )
}

async function createSignature(order, wallet, swapContract) {
  const orderHash = getOrderHash(order, swapContract)
  const sig = await wallet.signMessage(ethers.utils.arrayify(orderHash))
  const v = ethers.utils.splitSignature(sig).v
  return `${sig.slice(0, 130)}${(v === 0 || v === 1 ? v + 27 : v).toString(16)}`
}

async function signOrder(order, wallet, swapContract) {
  return {
    ...order,
    signature: await createSignature(order, wallet, swapContract),
  }
}

module.exports = {
  getOrderHash,
  createSignature,
  signOrder,
}
