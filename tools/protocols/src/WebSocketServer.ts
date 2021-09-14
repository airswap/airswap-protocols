// FIXME: temporary for wip commit precommit check.
/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Server, SupportedProtocolInfo } from './Server'

import * as url from 'url'
import { Client as WebSocketClient } from 'rpc-websockets'

export class WebSocketServer extends Server {
  private ws: WebSocketClient

  public _initClient() {
    // FIXME: deprecated method (import {URL} from  'url' instead)
    this.ws = new WebSocketClient(url.format(this.locatorUrl))

    // TODO: connection timeout:
    // this.ws.on('open', cleartimeout....)

    // Add initialise listener.
    this.ws.on('initialize', message => {
      // TODO: swapcontract is included in the initialize protocol payloads
      // need to check it.
      this.isInitialized = true
      this.initialize(message)
    })

    this.ws.on('updatePricing', this.updatePricing)
  }

  protected async callRPCMethod<T>(
    method: string,
    params?: Record<string, string> | Array<any>
  ): Promise<T> {
    this.ws.call(method, params)
    return
  }
}
