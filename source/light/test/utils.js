const ethUtil = require('ethereumjs-util')
const sigUtil = require('eth-sig-util')
const ethers = require('ethers')
const bip39 = require('bip39')
const hdkey = require('ethereumjs-wallet/hdkey')

// We assume deterministic ganache mnemonic is being used
const GANACHE_MNEMONIC =
  'myth like bonus scare over problem client lizard pioneer submit female collect'

const HD_PATH = "m/44'/60'/0'/0/"

const hdwallet = hdkey.fromMasterSeed(bip39.mnemonicToSeed(GANACHE_MNEMONIC))

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

const ORDER_TYPEHASH = ethUtil.keccak256(stringify('LightOrder'))

const EIP712_DOMAIN_TYPEHASH = ethUtil.keccak256(stringify('EIP712Domain'))

const DOMAIN_NAME = 'SWAP_LIGHT'
const DOMAIN_VERSION = '3'
const DOMAIN_CHAIN_ID = 1

function hashOrder(order) {
  return ethUtil.keccak256(
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
  return ethUtil.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
      [
        EIP712_DOMAIN_TYPEHASH,
        ethUtil.keccak256(DOMAIN_NAME),
        ethUtil.keccak256(DOMAIN_VERSION),
        DOMAIN_CHAIN_ID,
        swapContract,
      ]
    )
  )
}

function getOrderHash(order, swapContract) {
  return ethUtil.keccak256(
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

function getTypedDataSignature(order, privateKey, verifyingContract) {
  const sig = sigUtil.signTypedData_v4(ethUtil.toBuffer(privateKey), {
    data: {
      types: EIP712,
      domain: {
        name: DOMAIN_NAME,
        version: DOMAIN_VERSION,
        chainId: DOMAIN_CHAIN_ID,
        verifyingContract,
      },
      primaryType: 'LightOrder',
      message: order,
    },
  })

  const v = ethers.utils.splitSignature(sig).v
  return `${sig.slice(0, 130)}${(v === 0 || v === 1 ? v + 27 : v).toString(16)}`
}

function getPrivateKeyFromGanacheAccount(account) {
  for (let i = 0; i < 100; i++) {
    const node = hdwallet.derivePath(HD_PATH + String(i))
    const key = node.getWallet().getPrivateKey()
    if (
      ethUtil.bufferToHex(ethUtil.privateToAddress(key)).toLowerCase() ===
      account.toLowerCase()
    ) {
      return ethUtil.bufferToHex(key)
    }
  }
  throw new Error('No private key found for address')
}

function signOrder(order, account, swapContract) {
  return {
    ...order,
    signature: getTypedDataSignature(
      order,
      getPrivateKeyFromGanacheAccount(account),
      swapContract
    ),
  }
}

module.exports = {
  getPrivateKeyFromGanacheAccount,
  getOrderHash,
  createSignature,
  signOrder,
}
