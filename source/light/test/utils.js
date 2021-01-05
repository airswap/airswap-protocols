const ethUtil = require('ethereumjs-util')
const sigUtil = require('eth-sig-util')
const ethers = require('ethers')
const bip39 = require('bip39')
const hdkey = require('ethereumjs-wallet/hdkey')

const { EIP712Light } = require('@airswap/types')

// We assume deterministic ganache mnemonic is being used
const GANACHE_MNEMONIC =
  'myth like bonus scare over problem client lizard pioneer submit female collect'

const HD_PATH = "m/44'/60'/0'/0/"

const hdwallet = hdkey.fromMasterSeed(bip39.mnemonicToSeed(GANACHE_MNEMONIC))

const DOMAIN_NAME = 'SWAP_LIGHT'
const DOMAIN_VERSION = '3'
const DOMAIN_CHAIN_ID = 1

function getTypedDataSignature(order, privateKey, verifyingContract) {
  const sig = sigUtil.signTypedData_v4(ethUtil.toBuffer(privateKey), {
    data: {
      types: EIP712Light,
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
  signOrder,
}
