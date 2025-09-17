# AirSwap Trading Protocol TypeScript Client

A TypeScript client for the AirSwap Trading Protocol, generated from the OpenRPC specification.

## Installation

```bash
yarn add @airswap/client
```

## Quick Start

```typescript
import { AirSwapClient } from '@airswap/client'

const client = new AirSwapClient({
  url: 'https://forwarder.airswap.xyz/jsonrpc',
})

// Get supported protocols
const protocols = await client.getProtocols()
console.info('Supported protocols:', protocols)

// Get a quote for trading
const order = await client.getSignerSideOrderERC20({
  chainId: '1',
  swapContractAddress: '0x...',
  senderAmount: '1000000000000000000',
  signerToken: '0x...',
  senderToken: '0x...',
  senderWallet: '0x...',
  minExpiry: Math.floor(Date.now() / 1000) + 3600,
})
```

## API Reference

### Client Options

```typescript
interface ClientOptions {
  /** The JSON-RPC endpoint URL */
  url: string
  /** Optional timeout in milliseconds (default: 30000) */
  timeout?: number
  /** Optional custom headers */
  headers?: Record<string, string>
}
```

### Available Methods

- `getProtocols()` - Get supported protocols and configuration
- `getTokens()` - Get all supported tokens organized by chain
- `getSignerSideOrderERC20(params)` - Get a signer-side order for ERC20 tokens
- `getSenderSideOrderERC20(params)` - Get a sender-side order for ERC20 tokens
- `getPricingERC20(params)` - Get pricing information for ERC20 token pairs

For complete API documentation with examples, see the generated documentation in the package.

## Development

This package is generated from an OpenRPC specification. To generate the client after updating the spec:

```bash
yarn generate
```

## License

MIT
