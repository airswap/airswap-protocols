/*
  Copyright 2020 Swap Holdings Ltd.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

const { SECONDS_IN_DAY, defaults, EMPTY_ADDRESS } = require('./constants')

const signatures = require('./signatures')

let nonce = 100

const getLatestTimestamp = async () => {
  return (await web3.eth.getBlock('latest')).timestamp
}

const isValidOrder = order => {
  return (
    'nonce' in order &&
    'expiry' in order &&
    'signer' in order &&
    'sender' in order &&
    'affiliate' in order &&
    'signature' in order &&
    'wallet' in order['signer'] &&
    'wallet' in order['sender'] &&
    'wallet' in order['affiliate'] &&
    'token' in order['signer'] &&
    'token' in order['sender'] &&
    'token' in order['affiliate'] &&
    'amount' in order['signer'] &&
    'amount' in order['sender'] &&
    'amount' in order['affiliate'] &&
    'id' in order['signer'] &&
    'id' in order['sender'] &&
    'id' in order['affiliate'] &&
    'signatory' in order['signature'] &&
    'validator' in order['signature'] &&
    'r' in order['signature'] &&
    's' in order['signature'] &&
    'v' in order['signature']
  )
}

function lowerCaseAddresses(order) {
  for (var key in order) {
    if (typeof order[key] === 'object') {
      lowerCaseAddresses(order[key])
    }
    if (typeof order[key] === 'string' && order[key].indexOf('0x') === 0) {
      order[key] = order[key].toLowerCase()
    }
  }
  return order
}

module.exports = {
  _verifyingContract: EMPTY_ADDRESS,
  setVerifyingContract(verifyingContract) {
    this._verifyingContract = verifyingContract
  },
  generateNonce() {
    nonce = nonce + 1
    return nonce.toString()
  },
  async generateExpiry(days) {
    return (await getLatestTimestamp()) + SECONDS_IN_DAY * days
  },
  async getOrder({
    expiry = '0',
    nonce = this.generateNonce(),
    signer = defaults.Party,
    sender = defaults.Party,
    affiliate = defaults.Party,
  }) {
    if (expiry === '0') {
      expiry = await this.generateExpiry(1)
    }
    return lowerCaseAddresses({
      expiry: String(expiry),
      nonce: String(nonce),
      signer: { ...defaults.Party, ...signer },
      sender: { ...defaults.Party, ...sender },
      affiliate: { ...defaults.Party, ...affiliate },
      signature: signatures.getEmptySignature(this._verifyingContract),
    })
  },
  isValidQuote(quote) {
    return (
      'signer' in quote &&
      'sender' in quote &&
      'token' in quote['signer'] &&
      'token' in quote['sender'] &&
      'amount' in quote['signer'] &&
      'amount' in quote['sender'] &&
      'id' in quote['signer'] &&
      'id' in quote['sender'] &&
      !('signature' in quote)
    )
  },
  isValidOrder: isValidOrder,
}
