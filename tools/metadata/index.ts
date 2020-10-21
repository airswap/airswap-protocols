import axios from 'axios'
import * as ethers from 'ethers'
import contractMap, {
  MetamaskToken,
  MetamaskTokens,
} from 'eth-contract-metadata'
import { NormalizedToken, IdexToken, IdexResponse } from './src/types'
import {
  IDEX_TOKEN_API,
  TRUST_WALLET_IMAGE_API,
  METAMASK_IMAGE_API,
  rinkebyTokensByAddress,
  goerliTokensByAddress,
  kovanTokensByAddress,
  getOpenSeaUrl,
} from './src/constants'

import {
  chainIds,
  ADDRESS_ZERO,
  tokenKinds,
  chainNames,
} from '@airswap/constants'
import { getTokenName, getTokenSymbol, getTokenDecimals } from './src/helpers'

export function getTrustImage(address: string): string {
  return `${TRUST_WALLET_IMAGE_API}/${ethers.utils.getAddress(
    address
  )}/logo.png`
}

export function getMetamaskImage(logo: string): string {
  return `${METAMASK_IMAGE_API}/${logo}`
}

function getOpenseaContractMetadata(
  address,
  chainId = 1
): Promise<Record<string, any>> {
  const openSeaUrl = getOpenSeaUrl(chainId)
  return axios.get(`${openSeaUrl}/asset_contract/${address}`).then(response => {
    return response.data
  })
}

function normalizeIdexToken(
  token: IdexToken & { symbol: string }
): NormalizedToken {
  return {
    name: token.name,
    address: token.contractAddress,
    decimals: token.assetDecimals,
    symbol: token.symbol,
    kind: tokenKinds.ERC20,
    image: getTrustImage(token.contractAddress),
  }
}

function normalizeMetamaskToken(
  token: MetamaskToken & { address: string }
): NormalizedToken {
  if (typeof token.decimals !== 'number') {
    token.decimals = parseFloat(token.decimals)
  }
  return {
    name: token.name,
    address: token.address,
    decimals: token.decimals,
    symbol: token.symbol,
    kind: tokenKinds.ERC20,
    image: getTrustImage(token.address),
  }
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
    switch (this.chainId) {
      case chainIds.RINKEBY:
        this.tokensByAddress = rinkebyTokensByAddress
        this.tokens = Object.values(this.tokensByAddress)
        return this.tokens
      case chainIds.GOERLI:
        this.tokensByAddress = goerliTokensByAddress
        this.tokens = Object.values(this.tokensByAddress)
        return this.tokens
      case chainIds.KOVAN:
        this.tokensByAddress = kovanTokensByAddress
        this.tokens = Object.values(this.tokensByAddress)
        return this.tokens
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
      .filter(token => token.address !== ADDRESS_ZERO)
      .map(normalizeMetamaskToken)

    // fetch and normalize idex data
    const { data }: IdexResponse = await axios.get(IDEX_TOKEN_API)

    const normalizedIdexTokens: NormalizedToken[] = data
      .map(token => {
        if (token.contractAddress) {
          return {
            ...token,
            contractAddress: token.contractAddress.toLowerCase(),
          }
        }
      })
      .filter(token => token.contractAddress !== ADDRESS_ZERO)
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

  public getERC20Tokens(): NormalizedToken[] {
    return this.getTokens().filter(token => token.kind === tokenKinds.ERC20)
  }

  public getERC721Tokens(): NormalizedToken[] {
    return this.getTokens().filter(token => token.kind === tokenKinds.ERC721)
  }

  // get token objects in an object keyed by address
  public getTokensByAddress(): { [address: string]: NormalizedToken } {
    return this.tokensByAddress
  }

  // get token objects with symbols that match a query
  public findTokensBySymbol(query: string): NormalizedToken[] {
    const tokens = []
    this.tokens.forEach(token => {
      if (token.symbol.toUpperCase() === query.toUpperCase()) {
        tokens.push(token)
      }
    })
    return tokens
  }

  // this will fail if the token you search isn't present in the Trust Wallet metadata, or if the letter casing doesn't match Trust's metadata
  public fetchImageBinaryUnstable = (address: string): Promise<string> => {
    return axios.get(getTrustImage(address))
  }

  // given a token address, try to fetch name, symbol, and decimals from the contract and store it in memory tokens array
  public async fetchToken(searchAddress: string): Promise<NormalizedToken> {
    const match = this.tokens.find(
      ({ address }) => address.toLowerCase() === searchAddress.toLowerCase()
    )
    if (match) {
      return match
    }

    // check if the token is an NFT
    let openseaContractData = null
    try {
      if (this.chainId === '1' || this.chainId === '4') {
        openseaContractData = await getOpenseaContractMetadata(
          searchAddress,
          Number(this.chainId)
        )
      }
    } catch (error) {
      openseaContractData = null
    }

    if (openseaContractData && openseaContractData.schema_name === 'ERC721') {
      const normalizedOpenSeaToken: NormalizedToken = {
        name: openseaContractData.name,
        symbol:
          openseaContractData.symbol || openseaContractData.name.toUpperCase(),
        address: openseaContractData.address,
        decimals: 0,
        kind: tokenKinds.ERC721,
        image: openseaContractData.image_url,
      }

      this.tokens.push(normalizedOpenSeaToken)
      this._storeTokensByAddress()
      return normalizedOpenSeaToken
    }

    const [tokenSymbol, tokenName, tokenDecimals] = await Promise.all([
      getTokenSymbol(searchAddress, chainNames[this.chainId]),
      getTokenName(searchAddress, chainNames[this.chainId]),
      getTokenDecimals(searchAddress, chainNames[this.chainId]),
    ])

    const newToken: NormalizedToken = {
      name: tokenName,
      symbol: tokenSymbol,
      address: searchAddress,
      decimals: tokenDecimals,
      image: getTrustImage(searchAddress),
      kind: tokenKinds.ERC20,
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
