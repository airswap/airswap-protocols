// FIXME: temporary for wip commit precommit check.
/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Server, SupportedProtocolInfo } from './Server'

import * as url from 'url'
import { Client as WebSocketClient } from 'rpc-websockets'
import { JSONRPCVersionTwoRequest } from 'jayson'

export class WebSocketServer extends Server {
  private ws: WebSocketClient

  /**
   * Promise that will resolve once the websocket connection has been opened
   * successfully.
   */
  private isOpen: Promise<void>
  private isInitialized: Promise<void>

  public _initClient() {
    // FIXME: deprecated method (import {URL} from  'url' instead)
    this.ws = new WebSocketClient(url.format(this.locatorUrl))

    // TODO: timeout and handle accordingly.
    this.isOpen = new Promise(res => {
      this.ws.on('open', res)
    })

    // Add initialise listener.
    this.isInitialized = new Promise(resolve => {
      this.ws.on('initialize', message => {
        this.onInitialize(message)
        resolve()
      })
    })

    this.ws.on('updatePricing', this.onUpdatePricing)
  }

  public async subscribeAll() {
    await this.requireLastLookSupport()
    return await this.callRPCMethod<boolean>('subscribeAll')
  }

  protected async requireLastLookSupport(version?: string) {
    await this.isInitialized
    if (!this.supportsProtocol('last-look', version))
      throw new Error(
        `Server at ${this.locatorUrl} doesn't support this version of Last Look`
      )
  }

  protected async callRPCMethod<T>(
    method: string,
    params?: Record<string, string>
  ): Promise<T> {
    params.swapContract = this.swapContract
    this.ws.call(method, params)
    return
  }

  private onUpdatePricing(message: JSONRPCVersionTwoRequest) {
    const pricing = message.params
  }

  private onInitialize(message: JSONRPCVersionTwoRequest) {
    this.supportedProtocols = message.params as SupportedProtocolInfo[]
  }
}
