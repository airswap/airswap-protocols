import { Server } from './Server'

import * as url from 'url'
import { isBrowser } from 'browser-or-node'
import { isValidQuote } from '@airswap/utils'
import { Client } from 'jayson'

export class HTTPServer extends Server {
  private client: Client
  public _initClient() {
    // TODO: check this - version is probably wrong and I think swap contract
    // needs to go in the params.
    this.supportedProtocols = [{ name: 'request-for-quote', version: '2.0.0' }]

    if (isBrowser) {
      const jaysonClient = require('jayson/lib/client/browser')
      this.client = new jaysonClient((request, callback) => {
        fetch(url.format(this.locatorUrl), {
          method: 'POST',
          body: request,
          headers: {
            'Content-Type': 'application/json',
          },
        })
          .then(res => {
            return res.text()
          })
          .then(text => {
            callback(null, text)
          })
          .catch(err => {
            callback(err)
          })
      }, this.locatorOptions)
    } else {
      const jaysonClient = require('jayson/lib/client')
      if (this.locatorOptions.protocol === 'https:') {
        this.client = jaysonClient.https(this.locatorOptions)
      } else {
        this.client = jaysonClient.http(this.locatorOptions)
      }
    }
  }

  protected callRPCMethod<T>(
    method: string,
    params: Record<string, string>
  ): Promise<T> {
    params.swapContract = this.swapContract
    return new Promise((resolve, reject) => {
      this.client.request(
        method,
        params,
        (connectionError: any, serverError: any, result: any) => {
          if (connectionError) {
            reject({ code: -1, message: connectionError.message })
          } else if (serverError) {
            reject(serverError)
          } else {
            const errors = this.compare(params, result)
            if (errors.length) {
              reject({
                code: -1,
                message: `Server response differs from request params: ${errors}`,
              })
            } else {
              if (method.indexOf('Quote') !== -1 && !isValidQuote(result)) {
                reject({
                  code: -1,
                  message: `Server response is not a valid quote: ${JSON.stringify(
                    result
                  )}`,
                })
              } else {
                resolve(result)
              }
            }
          }
        }
      )
    })
  }
}
