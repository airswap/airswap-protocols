/*
  Copyright 2019 Swap Holdings Ltd.

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

let getLatestTimestamp = async () => {
  return (await web3.eth.getBlock('latest')).timestamp
}

module.exports = {
  _knownAccounts: [],
  _verifyingContract: EMPTY_ADDRESS,
  setKnownAccounts(knownAccounts) {
    this._knownAccounts = knownAccounts
  },
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
  async getOrder(
    {
      expiry = '0',
      nonce = this.generateNonce(),
      signatory = EMPTY_ADDRESS,
      signer = defaults.Party,
      sender = defaults.Party,
      affiliate = defaults.Party,
    },
    noSignature
  ) {
    if (expiry === '0') {
      expiry = await this.generateExpiry(1)
    }
    const order = {
      expiry,
      nonce,
      signer: { ...defaults.Party, ...signer },
      sender: { ...defaults.Party, ...sender },
      affiliate: { ...defaults.Party, ...affiliate },
    }

    const wallet = signatory !== EMPTY_ADDRESS ? signatory : order.signer.wallet
    if (!noSignature) {
      if (this._knownAccounts.indexOf(wallet) !== -1) {
        order.signature = await signatures.getWeb3Signature(
          order,
          wallet,
          this._verifyingContract
        )
      } else {
        order.signature = signatures.getEmptySignature()
      }
    }
    return order
  },
  isValidQuote(quote) {
    return (
      'signer' in quote &&
      'sender' in quote &&
      'token' in quote['signer'] &&
      'token' in quote['sender'] &&
      'param' in quote['signer'] &&
      'param' in quote['sender'] &&
      !('signature' in quote)
    )
  },
  isValidOrder(order) {
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
      'param' in order['signer'] &&
      'param' in order['sender'] &&
      'param' in order['affiliate'] &&
      'signatory' in order['signature'] &&
      'validator' in order['signature'] &&
      'r' in order['signature'] &&
      's' in order['signature'] &&
      'v' in order['signature']
    )
  },
}
