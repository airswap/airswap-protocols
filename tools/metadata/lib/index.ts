import axios from 'axios'
import * as ethers from 'ethers'
import contractMap, {
  MetamaskToken,
  MetamaskTokens,
} from 'eth-contract-metadata'
import {
  IDEX_TOKEN_API,
  TRUST_WALLET_IMAGE_API,
  METAMASK_IMAGE_API,
  rinkebyTokensByAddress,
} from './constants'

import { chainIds } from '@airswap/constants'
import { getTokenName, getTokenSymbol, getTokenDecimals } from './helpers'

export interface NormalizedToken {
  name: string
  address: string
  symbol: string
  decimals: number
  image?: string
}

interface IdexToken {
  name: string
  decimals: number
  address: string
  slug: string
}

interface IdexTokens {
  [symbol: string]: IdexToken
}

class TokenMetadata {
  public chainId: string
  public ready: Promise<NormalizedToken[]>
  private tokens: NormalizedToken[]
  private tokensByAddress: { [address: string]: NormalizedToken }

  public constructor(chainId = chainIds.MAINNET) {
    this.chainId = String(chainId)
    this.tokens = []
    this.tokensByAddress = {}
    this.ready = this.fetchKnownTokens()
  }

  public async fetchKnownTokens(): Promise<Array<NormalizedToken>> {
    if (this.chainId === chainIds.RINKEBY) {
      this.tokensByAddress = rinkebyTokensByAddress
      this.tokens = Object.values(this.tokensByAddress)
      return this.tokens
    }

    const normalizeIdexToken = (
      token: IdexToken & { symbol: string }
    ): NormalizedToken => {
      return {
        name: token.name,
        address: token.address,
        decimals: token.decimals,
        symbol: token.symbol,
        image: this.getImageURL(token.address),
      }
    }

    const normalizeMetamaskToken = (
      token: MetamaskToken & { address: string }
    ): NormalizedToken => {
      if (typeof token.decimals !== 'number') {
        token.decimals = parseFloat(token.decimals)
      }
      return {
        name: token.name,
        address: token.address,
        decimals: token.decimals,
        symbol: token.symbol,
        image: `${METAMASK_IMAGE_API}/${token.logo}`,
      }
    }

    // normalize metamask data
    const metamaskTokenHashMap: { [key: string]: boolean } = {}
    const normalizedMetamaskTokens: NormalizedToken[] = Object.entries(
      contractMap as MetamaskTokens
    )
      .map(([address, data]) => {
        // keep a hash map to give us O(1) lookup later
        metamaskTokenHashMap[address.toLowerCase()] = true
        const token: MetamaskToken = Object.assign(
          { address: address.toLowerCase() },
          data
        )
        return token
      })
      .filter(
        contract => !!contract.erc20 && typeof contract.decimals === 'number'
      )
      .map(normalizeMetamaskToken)

    // fetch and normalize idex data
    const { data }: IdexTokens = await axios.get(IDEX_TOKEN_API)
    const normalizedIdexTokens: NormalizedToken[] = Object.entries(data)
      .map(([symbol, token]) => {
        if (token.address) {
          return { ...token, symbol }
        }
      })
      .map(normalizeIdexToken)

    // persist all metamask tokens to memory metadata array
    this.tokens.push(...normalizedMetamaskTokens)

    // persist all non-duplicate idex tokens to metadata
    normalizedIdexTokens.forEach(idexToken => {
      if (
        !Object.prototype.hasOwnProperty.call(
          metamaskTokenHashMap,
          idexToken.address
        )
      ) {
        this.tokens.push(idexToken)
      }
    })

    this._storeTokensByAddress()
    return this.tokens
  }

  // get token objects in an array
  public getTokens(): NormalizedToken[] {
    return this.tokens
  }

  // get token objects in an object keyed by address
  public getTokensByAddress(): { [address: string]: NormalizedToken } {
    return this.tokensByAddress
  }

  // returns a URL string that may link to an image if one is available in Trust Wallet metadata, else will 404
  public getImageURL(address: string): string {
    return `${TRUST_WALLET_IMAGE_API}/${ethers.utils.getAddress(
      address
    )}/logo.png`
  }

  // this will fail if the token you search isn't present in the Trust Wallet metadata, or if the letter casing doesn't match Trust's metadata
  public fetchImageBinaryUnstable = (address: string): Promise<string> => {
    return axios.get(this.getImageURL(address))
  }

  // given a token address, try to fetch name, symbol, and decimals from the contract and store it in memory tokens array
  public async fetchToken(searchAddress: string): Promise<NormalizedToken> {
    const match = this.tokens.find(
      ({ address }) => address === searchAddress.toLowerCase()
    )
    if (match) {
      return match
    }
    if (this.chainId === chainIds.RINKEBY) {
      throw new Error(
        `Can't fetch Rinkeby token data from contract. This feature is only avaialable on mainnet.`
      )
    }
    const [tokenSymbol, tokenName, tokenDecimals] = await Promise.all([
      getTokenSymbol(searchAddress),
      getTokenName(searchAddress),
      getTokenDecimals(searchAddress),
    ])

    const newToken: NormalizedToken = {
      name: tokenName,
      symbol: tokenSymbol,
      address: searchAddress,
      decimals: tokenDecimals,
      image: this.getImageURL(searchAddress),
    }

    this.tokens.push(newToken)
    this._storeTokensByAddress()
    return newToken
  }

  private _storeTokensByAddress() {
    this.tokens.forEach(token => {
      if (
        !Object.prototype.hasOwnProperty.call(
          this.tokensByAddress,
          token.address
        )
      ) {
        this.tokensByAddress[token.address] = token
      }
    })
  }
}

export default TokenMetadata
