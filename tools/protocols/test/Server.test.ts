import { fancy } from 'fancy-test'
import { expect } from 'chai'

import { createQuote, createLightOrder } from '@airswap/utils'
import { ADDRESS_ZERO } from '@airswap/constants'

import { Server } from '..'

const badQuote = { bad: 'quote' }
const emptyQuote = createQuote({})
const URL = 'maker.example.com'

function mockServer(api) {
  api.post('/').reply(200, async (uri, body) => {
    const params = body['params']
    let res
    switch (body['method']) {
      case 'getMaxQuote':
        res = emptyQuote
        break
      case 'getSignerSideQuote':
        res = badQuote
        break
      case 'getSenderSideQuote':
        res = createQuote({
          signer: {
            token: params.signerToken,
            amount: params.signerAmount,
          },
          sender: {
            token: params.senderToken,
          },
        })
        break
      case 'getSignerSideOrder':
        res = createLightOrder({
          signerToken: params.signerToken,
          senderToken: params.senderToken,
          senderAmount: params.senderAmount,
          senderWallet: params.senderWallet,
        })
        break
    }
    return {
      jsonrpc: '2.0',
      id: body['id'],
      result: res,
    }
  })
}

describe('Server', () => {
  fancy
    .nock('https://' + URL, mockServer)
    .do(async () => {
      await new Server(URL).getSignerSideQuote('', '', '')
    })
    .catch(/Server response is not a valid quote: {"bad":"quote"}/)
    .it('Server getSignerSideQuote() throws')
  fancy
    .nock('https://' + URL, mockServer)
    .do(async () => {
      await new Server(URL).getMaxQuote('', '')
    })
    .catch(
      /Server response differs from request params: signerToken,senderToken/
    )
    .it('Server getMaxQuote() throws')
  fancy
    .nock('https://' + URL, mockServer)
    .it('Server getSenderSideQuote()', async () => {
      const quote = await new Server(URL).getSenderSideQuote(
        '1',
        'SIGNERTOKEN',
        ''
      )
      expect(quote.signer.token).to.equal('SIGNERTOKEN')
    })
  fancy
    .nock('https://' + URL, mockServer)
    .it('Server getSignerSideOrder()', async () => {
      const order = await new Server(URL).getSignerSideOrder(
        '0',
        ADDRESS_ZERO,
        ADDRESS_ZERO,
        ADDRESS_ZERO
      )
      expect(order.signerToken).to.equal(ADDRESS_ZERO)
    })
})
