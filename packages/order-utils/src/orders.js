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

const { SECONDS_IN_DAY, defaults, NULL_ADDRESS } = require('./constants')

const signatures = require('./signatures')

let nonce = 100

let getLatestTimestamp = async () => {
  return (await web3.eth.getBlock('latest')).timestamp
}

module.exports = {
  _knownAccounts: [],
  _verifyingContract: NULL_ADDRESS,
  setKnownAccounts(knownAccounts) {
    this._knownAccounts = knownAccounts
  },
  setVerifyingContract(verifyingContract) {
    this._verifyingContract = verifyingContract
  },
  generateNonce() {
    nonce = nonce + 1
    return nonce
  },
  async generateExpiry(days) {
    return (await getLatestTimestamp()) + SECONDS_IN_DAY * days
  },
  async getOrder(
    {
      expiry = 0,
      nonce = this.generateNonce(),
      signer = NULL_ADDRESS,
      maker = defaults.Party,
      taker = defaults.Party,
      affiliate = defaults.Party,
    },
    noSignature
  ) {
    if (expiry == 0) {
      expiry = await this.generateExpiry(1)
    }
    const order = {
      expiry,
      nonce,
      maker: { ...defaults.Party, ...maker },
      taker: { ...defaults.Party, ...taker },
      affiliate: { ...defaults.Party, ...affiliate },
    }
    const wallet = signer !== NULL_ADDRESS ? signer : order.maker.wallet
    if (!noSignature && this._knownAccounts.indexOf(wallet) !== -1) {
      order.signature = await signatures.getWeb3Signature(
        order,
        wallet,
        this._verifyingContract
      )
    } else {
      order.signature = signatures.getEmptySignature()
    }
    return order
  },
}
