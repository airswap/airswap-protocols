const ethUtil = require('ethereumjs-util')
const abi = require('ethereumjs-abi')
const { DOMAIN_NAME, DOMAIN_VERSION, types } = require('./constants')

function stringify(type) {
  let str = `${type}(`
  const keys = Object.keys(types[type])
  for (let i = 0; i < keys.length; i++) {
    str += `${types[type][i].type} ${types[type][i].name}`
    if (i !== keys.length - 1) {
      str += ','
    }
  }
  return `${str})`
}

const EIP712_DOMAIN_TYPEHASH = web3.utils.soliditySha3(
  stringify('EIP712Domain')
)
const ORDER_TYPEHASH = web3.utils.soliditySha3(
  stringify('Order') + stringify('Party')
)
const PARTY_TYPEHASH = web3.utils.soliditySha3(stringify('Party'))

function hashParty(party) {
  return ethUtil.keccak256(
    abi.rawEncode(
      ['bytes32', 'address', 'address', 'uint256'],
      [PARTY_TYPEHASH, party.wallet, party.token, party.param]
    )
  )
}

function hashOrder(order) {
  return ethUtil.keccak256(
    abi.rawEncode(
      ['uint256', 'uint256', 'uint256', 'bytes32', 'bytes32', 'bytes32'],
      [
        ORDER_TYPEHASH,
        order.nonce,
        order.expiry,
        hashParty(order.maker),
        hashParty(order.taker),
        hashParty(order.affiliate),
      ]
    )
  )
}

function hashDomain(verifyingContract) {
  return ethUtil.keccak256(
    abi.rawEncode(
      ['bytes32', 'bytes32', 'bytes32', 'address'],
      [
        EIP712_DOMAIN_TYPEHASH,
        ethUtil.keccak256(DOMAIN_NAME),
        ethUtil.keccak256(DOMAIN_VERSION),
        verifyingContract,
      ]
    )
  )
}

module.exports = {
  getOrderHash(order, verifyingContract) {
    return ethUtil.keccak256(
      Buffer.concat([
        Buffer.from('1901', 'hex'),
        hashDomain(verifyingContract),
        hashOrder(order),
      ])
    )
  },
}
