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

const ethers = require('ethers')

const {
  SECONDS_IN_DAY,
  defaults,
  EMPTY_ADDRESS,
  ERC20_INTERFACE_ID,
  ERC721_INTERFACE_ID,
} = require('./constants')

const IERC20 = require('@airswap/tokens/build/contracts/IERC20.json')
const IERC721 = require('@airswap/tokens/build/contracts/OrderTest721.json')
const IERC721Receiver = require('@airswap/tokens/build/contracts/IERC721Receiver.json')
const Swap = require('@airswap/swap/build/contracts/Swap.json')

const signatures = require('./signatures')

let nonce = 100

const getLatestTimestamp = async () => {
  return (await web3.eth.getBlock('latest')).timestamp
}

// network is 'rinkeby' , 'mainnet' etc
const checkOrder = async (order, network) => {
  let errors = []
  const provider = ethers.getDefaultProvider(network)

  // Check the order has all necessary fields
  if (!isValidOrder(order)) {
    errors.push('Order structured incorrectly')
    return errors
  }

  // Check swap address provided
  if (order['signature']['validator'] == EMPTY_ADDRESS) {
    errors.push('Order.signature.validator cannot be 0')
    return errors
  }

  // Check signer balance and allowance
  errors = await checkBalanceAndApproval(order, 'signer', provider, errors)

  // If sender, check balance and allowance
  if (order['sender']['wallet'] !== EMPTY_ADDRESS) {
    errors = await checkBalanceAndApproval(order, 'sender', provider, errors)
  }

  // If affiliate, check balance and allowance
  if (order['affiliate']['wallet'] !== EMPTY_ADDRESS) {
    errors = await checkBalanceAndApproval(order, 'affiliate', provider, errors)
  }

  // Check nonce availability
  errors = await checkNonce(
    order['signature']['validator'],
    order['signer']['wallet'],
    order['nonce'],
    provider,
    errors
  )

  // Check order expiry
  const blockNumber = await provider.getBlockNumber()
  const latestBlock = await provider.getBlock(blockNumber - 1)
  if (latestBlock.timestamp >= order['expiry']) {
    errors.push('Order expiry has passed')
  }

  // Check order signature
  if (order['signature']['v'] != 0) {
    errors = await checkOrderSignature(order, provider, errors)
  }

  return errors
}

const checkOrderSignature = async (order, provider, errors) => {
  // Check signature is valid
  const isValid = signatures.isSignatureValid(order)
  if (!isValid) {
    errors.push('Signature invalid')
  }

  // Check signer authorized signatory
  if (order['signature']['signatory'] !== order['signer']['wallet']) {
    const swapContract = new ethers.Contract(
      order['signature']['validator'],
      Swap.abi,
      provider
    )

    await swapContract
      .signerAuthorizations(
        order['signer']['wallet'],
        order['signature']['signatory']
      )
      .then(isAuthorized => {
        if (!isAuthorized) {
          errors.push(`Signatory not authorized`)
        }
      })
  }
  return errors
}

const checkERC20Transfer = async (order, partyName, provider, errors) => {
  const party = order[partyName]

  // If this is the affiliate, tokens come from the signer instead
  if (partyName == 'affiliate') {
    party['wallet'] = order['signer']['wallet']
  }

  const tokenContract = new ethers.Contract(
    party['token'],
    IERC20.abi,
    provider
  )

  // Check balance
  await tokenContract.balanceOf(party['wallet']).then(balance => {
    if (balance.lt(party['amount'])) {
      errors.push(`${partyName} balance is too low`)
    }
  })

  // check approval
  await tokenContract
    .allowance(party['wallet'], order['signature']['validator'])
    .then(allowance => {
      if (allowance.lt(party['amount'])) {
        errors.push(`${partyName} allowance is too low`)
      }
    })
  return errors
}

const checkERC721Transfer = async (order, partyName, provider, errors) => {
  const party = order[partyName]
  let recipient

  // If this is the affiliate, tokens come from the signer instead
  switch (partyName) {
    case 'affiliate':
      // the token goes from signer to affiliate
      party['wallet'] = order['signer']['wallet']
      recipient = 'affiliate'
      break
    case 'sender':
      // the token goes from sender to signer
      recipient = 'signer'
      break
    case 'signer':
      // the token goes from signer to sender
      recipient = 'sender'
  }

  const tokenContract = new ethers.Contract(
    party['token'],
    IERC721.abi,
    provider
  )

  // check balance
  await tokenContract.ownerOf(party['id']).then(owner => {
    if (owner.toLowerCase() !== party['wallet']) {
      errors.push(`${partyName} doesn't own NFT`)
    }
  })

  try {
    // try a normal erc721 approval
    await tokenContract.getApproved(party['id']).then(operator => {
      if (operator !== order['signature']['validator']) {
        errors.push(`${partyName} no NFT approval`)
      }
    })
  } catch (error) {
    // if it didn't exist try a cryptokitties approval
    await tokenContract.kittyIndexToApproved(party['id']).then(operator => {
      if (operator !== order['signature']['validator']) {
        errors.push(`${partyName} no NFT approval`)
      }
    })
  }

  // Check recipient can receive ERC721s
  const code = await provider.getCode(order[recipient]['wallet'])
  const isContract = code !== '0x'
  if (isContract) {
    const nftReceiver = new ethers.Contract(
      order[recipient]['wallet'],
      IERC721Receiver.abi,
      provider
    )

    try {
      await nftReceiver.callStatic.onERC721Received(
        party['wallet'],
        party['wallet'],
        party['id'],
        '0x00'
      )
    } catch (error) {
      if (error.code == 'CALL_EXCEPTION') {
        errors.push(`${recipient} is not configured to receive NFTs`)
      }
    }
  }

  return errors
}

const checkBalanceAndApproval = async (order, partyName, provider, errors) => {
  // Check whether this token is ERC20 or ERC721
  switch (order[partyName]['kind']) {
    case ERC20_INTERFACE_ID:
      errors = await checkERC20Transfer(order, partyName, provider, errors)
      break
    case ERC721_INTERFACE_ID:
      errors = await checkERC721Transfer(order, partyName, provider, errors)
      break
    default:
      errors.push(`${partyName} token kind invalid`)
  }

  return errors
}

const checkNonce = async (swapAddress, signer, nonce, provider, errors) => {
  const swapContract = new ethers.Contract(swapAddress, Swap.abi, provider)

  // check not cancelled
  await swapContract.signerNonceStatus(signer, nonce).then(status => {
    if (status == '0x01') {
      errors.push(`Nonce taken or cancelled`)
    }
  })

  // check above minimum
  await swapContract.signerMinimumNonce(signer).then(minimum => {
    if (minimum > nonce) {
      errors.push(`Nonce too low`)
    }
  })
  return errors
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
  checkOrder: checkOrder,
}
