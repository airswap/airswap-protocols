#!/usr/bin/env node

import * as fs from 'fs'
import * as path from 'path'

interface OpenRPCSpec {
  openrpc: string
  info: {
    title: string
    description: string
    version: string
  }
  methods: Method[]
  components: {
    schemas: Record<string, Schema>
  }
}

interface Method {
  name: string
  summary: string
  description: string
  params: Parameter[]
  result: {
    name: string
    description: string
    schema: Schema
  }
}

interface Parameter {
  name: string
  description: string
  required: boolean
  schema: Schema
}

interface Schema {
  type?: string
  pattern?: string
  items?: Schema
  properties?: Record<string, Schema>
  required?: string[]
  additionalProperties?: Schema | boolean
  $ref?: string
  description?: string
  minItems?: number
  maxItems?: number
}

export class OpenRPCClientGenerator {
  private spec: OpenRPCSpec
  private outputDir: string

  public constructor(specPath: string, outputDir: string) {
    this.spec = JSON.parse(fs.readFileSync(specPath, 'utf8'))
    this.outputDir = outputDir
  }

  public generate(): void {
    console.info('Generating TypeScript client from OpenRPC specification...')

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true })
    }

    // Generate types
    this.generateTypes()

    // Generate client
    this.generateClient()

    // Generate examples
    this.generateExamples()

    // Generate documentation
    this.generateDocumentation()

    // Generate index file
    this.generateIndex()

    console.info('Client generation completed!')
  }

  private generateTypes(): void {
    const typesContent = this.buildTypesContent()
    fs.writeFileSync(path.join(this.outputDir, 'types.ts'), typesContent)
  }

  private buildTypesContent(): string {
    let content = '// Generated types from OpenRPC specification\n\n'

    // Generate schema types
    for (const [schemaName, schema] of Object.entries(
      this.spec.components.schemas
    )) {
      content += this.generateSchemaType(schemaName, schema)
      content += '\n\n'
    }

    // Generate method parameter types
    for (const method of this.spec.methods) {
      if (method.params.length > 0) {
        const paramTypeName = `${this.capitalize(method.name)}Params`
        content += `export interface ${paramTypeName} {\n`

        for (const param of method.params) {
          const optional = !param.required ? '?' : ''
          const type = this.schemaToTypeScript(param.schema)
          content += `  /** ${param.description} */\n`
          content += `  ${param.name}${optional}: ${type}\n`
        }

        content += '}\n\n'
      }
    }

    // Generate method result types
    for (const method of this.spec.methods) {
      const resultTypeName = `${this.capitalize(method.name)}Result`
      const resultType = this.schemaToTypeScript(method.result.schema)
      content += `/** ${method.result.description} */\n`
      content += `export type ${resultTypeName} = ${resultType}\n\n`
    }

    return content
  }

  private generateSchemaType(name: string, schema: Schema): string {
    let content = `/** ${schema.description || `${name} schema`} */\n`

    if (schema.type === 'object' && schema.properties) {
      content += `export interface ${name} {\n`

      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const optional = schema.required?.includes(propName) ? '' : '?'
        const type = this.schemaToTypeScript(propSchema)
        content += `  /** ${
          propSchema.description || `${propName} property`
        } */\n`
        content += `  ${propName}${optional}: ${type}\n`
      }

      content += '}'
    } else {
      const type = this.schemaToTypeScript(schema)
      content += `export type ${name} = ${type}`
    }

    return content
  }

  private schemaToTypeScript(schema: Schema): string {
    if (schema.$ref) {
      return schema.$ref.split('/').pop() || 'unknown'
    }

    switch (schema.type) {
      case 'string':
        return 'string'
      case 'number':
      case 'integer':
        return 'number'
      case 'boolean':
        return 'boolean'
      case 'array':
        if (schema.items) {
          return `${this.schemaToTypeScript(schema.items)}[]`
        }
        return 'unknown[]'
      case 'object':
        if (schema.additionalProperties === true) {
          return 'Record<string, unknown>'
        }
        if (
          schema.additionalProperties &&
          typeof schema.additionalProperties === 'object'
        ) {
          return `Record<string, ${this.schemaToTypeScript(
            schema.additionalProperties
          )}>`
        }
        if (schema.properties) {
          let objType = '{\n'
          for (const [propName, propSchema] of Object.entries(
            schema.properties
          )) {
            const optional = schema.required?.includes(propName) ? '' : '?'
            objType += `    ${propName}${optional}: ${this.schemaToTypeScript(
              propSchema
            )}\n`
          }
          objType += '  }'
          return objType
        }
        return 'Record<string, unknown>'
      default:
        return 'unknown'
    }
  }

  private generateClient(): void {
    const clientContent = this.buildClientContent()
    fs.writeFileSync(path.join(this.outputDir, 'client.ts'), clientContent)
  }

  private buildClientContent(): string {
    let content = `// Generated AirSwap Trading Protocol Client
import { ethers } from 'ethers'
import * as types from './types'

export interface ClientOptions {
  /** The JSON-RPC endpoint URL */
  url: string
  /** Optional timeout in milliseconds (default: 30000) */
  timeout?: number
  /** Optional custom headers */
  headers?: Record<string, string>
}

export class AirSwapClient {
  private url: string
  private timeout: number
  private headers: Record<string, string>
  private requestId: number = 1

  constructor(options: ClientOptions) {
    this.url = options.url
    this.timeout = options.timeout || 30000
    this.headers = options.headers || {}
  }

  private async request<T>(method: string, params?: unknown): Promise<T> {
    const body = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method,
      params: params || []
    }

    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeout)
    })

    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`)
    }

    const result = await response.json()

    if (result.error) {
      throw new Error(\`JSON-RPC error: \${result.error.message}\`)
    }

    return result.result
  }

`

    // Generate method implementations
    for (const method of this.spec.methods) {
      content += this.generateMethodImplementation(method)
      content += '\n'
    }

    content += '}\n'
    return content
  }

  private generateMethodImplementation(method: Method): string {
    const methodName = method.name
    const hasParams = method.params.length > 0
    const paramTypeName = hasParams
      ? `types.${this.capitalize(methodName)}Params`
      : 'void'
    const resultTypeName = `types.${this.capitalize(methodName)}Result`

    let content = `  /**\n`
    content += `   * ${method.summary}\n`
    content += `   * ${method.description}\n`

    if (hasParams) {
      content += `   * @param params - Method parameters\n`
      for (const param of method.params) {
        content += `   * @param params.${param.name} - ${param.description}\n`
      }
    }

    content += `   * @returns ${method.result.description}\n`
    content += `   */\n`

    if (hasParams) {
      content += `  async ${methodName}(params: ${paramTypeName}): Promise<${resultTypeName}> {\n`

      // Build params array
      content += `    const rpcParams = [\n`
      for (const param of method.params) {
        if (param.required) {
          content += `      params.${param.name},\n`
        } else {
          content += `      params.${param.name} ?? '',\n`
        }
      }
      content += `    ]\n`

      content += `    return this.request<${resultTypeName}>('${methodName}', rpcParams)\n`
    } else {
      content += `  async ${methodName}(): Promise<${resultTypeName}> {\n`
      content += `    return this.request<${resultTypeName}>('${methodName}')\n`
    }

    content += `  }\n`

    return content
  }

  private generateExamples(): void {
    const examplesContent = this.buildExamplesContent()
    fs.writeFileSync(path.join(this.outputDir, 'examples.ts'), examplesContent)
  }

  private buildExamplesContent(): string {
    let content = `// Example usage of the AirSwap Trading Protocol Client
import { AirSwapClient } from './client'

async function examples() {
  // Initialize the client
  const client = new AirSwapClient({
    url: 'https://forwarder.airswap.xyz/jsonrpc',
    timeout: 30000
  })

  try {
`

    // Generate example for each method
    for (const method of this.spec.methods) {
      content += `    // ${method.summary}\n`
      content += `    console.info('${method.description}')\n`

      if (method.params.length > 0) {
        content += `    const ${method.name}Result = await client.${method.name}({\n`

        for (const param of method.params) {
          const exampleValue = this.generateExampleValue(
            param.schema,
            param.name
          )
          content += `      ${param.name}: ${exampleValue}, // ${param.description}\n`
        }

        content += `    })\n`
      } else {
        content += `    const ${method.name}Result = await client.${method.name}()\n`
      }

      content += `    console.info('${method.name} result:', ${method.name}Result)\n\n`
    }

    content += `  } catch (error) {
    console.error('Error:', error)
  }
}

// Run examples
examples().catch(console.error)
`

    return content
  }

  private generateExampleValue(schema: Schema, paramName: string): string {
    if (schema.pattern === '^0x[a-fA-F0-9]{40}$') {
      return "'0x742d35Cc6634C0532925a3b8D400E4C0532925a3b8D400E4C'"
    }

    if (schema.pattern === '^[0-9]+$') {
      if (paramName.toLowerCase().includes('amount')) {
        return "'1000000000000000000'" // 1 ETH in wei
      }
      if (paramName.toLowerCase().includes('expiry')) {
        return `'${Math.floor(Date.now() / 1000) + 3600}'` // 1 hour from now
      }
      if (paramName.toLowerCase().includes('chain')) {
        return "'1'" // Ethereum mainnet
      }
      return "'123456789'"
    }

    switch (schema.type) {
      case 'string':
        return `'example-${paramName}'`
      case 'number':
      case 'integer':
        return '42'
      case 'boolean':
        return 'true'
      case 'array':
        if (
          schema.items?.type === 'array' &&
          schema.items.items?.pattern === '^0x[a-fA-F0-9]{40}$'
        ) {
          return "[['0x742d35Cc6634C0532925a3b8D400E4C', '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984']]"
        }
        return '[]'
      case 'object':
        return '{}'
      default:
        return 'null'
    }
  }

  private generateDocumentation(): void {
    const docsContent = this.buildDocumentationContent()
    fs.writeFileSync(path.join(this.outputDir, 'README.md'), docsContent)
  }

  private buildDocumentationContent(): string {
    let content = `# ${this.spec.info.title} - TypeScript Client

${this.spec.info.description}

**Version:** ${this.spec.info.version}

## Installation

\`\`\`bash
yarn add @airswap/client
\`\`\`

## Quick Start

\`\`\`typescript
import { AirSwapClient } from '@airswap/client'

const client = new AirSwapClient({
  url: 'https://forwarder.airswap.xyz/jsonrpc'
})

// Get supported protocols
const protocols = await client.getProtocols()
console.info('Supported protocols:', protocols)
\`\`\`

## API Reference

### Client Options

\`\`\`typescript
interface ClientOptions {
  /** The JSON-RPC endpoint URL */
  url: string
  /** Optional timeout in milliseconds (default: 30000) */
  timeout?: number
  /** Optional custom headers */
  headers?: Record<string, string>
}
\`\`\`

### Methods

`

    // Document each method
    for (const method of this.spec.methods) {
      content += `#### \`${method.name}\`

${method.description}

`

      if (method.params.length > 0) {
        content += `**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
`
        for (const param of method.params) {
          const type = this.schemaToMarkdownType(param.schema)
          const required = param.required ? 'Yes' : 'No'
          content += `| \`${param.name}\` | ${type} | ${required} | ${param.description} |\n`
        }
        content += '\n'
      }

      content += `**Returns:** ${method.result.description}

**Example:**

\`\`\`typescript
`

      if (method.params.length > 0) {
        content += `const result = await client.${method.name}({\n`
        for (const param of method.params) {
          const exampleValue = this.generateExampleValue(
            param.schema,
            param.name
          )
          content += `  ${param.name}: ${exampleValue}\n`
        }
        content += `})\n`
      } else {
        content += `const result = await client.${method.name}()\n`
      }

      content += `\`\`\`

---

`
    }

    content += `## Types

All TypeScript types are automatically generated from the OpenRPC specification and exported from the main module:

\`\`\`typescript
import { ProtocolInfo, OrderERC20Response } from '@airswap/client'
\`\`\`

## Error Handling

The client throws errors for:
- Network failures
- HTTP errors
- JSON-RPC errors
- Timeout errors

\`\`\`typescript
try {
  const result = await client.getProtocols()
} catch (error) {
  if (error.message.includes('timeout')) {
    console.error('Request timed out')
  } else if (error.message.includes('JSON-RPC error')) {
    console.error('Server returned an error:', error.message)
  } else {
    console.error('Network or other error:', error.message)
  }
}
\`\`\`

## License

MIT
`

    return content
  }

  private schemaToMarkdownType(schema: Schema): string {
    if (schema.$ref) {
      return `\`${schema.$ref.split('/').pop()}\``
    }

    switch (schema.type) {
      case 'string':
        return '`string`'
      case 'number':
      case 'integer':
        return '`number`'
      case 'boolean':
        return '`boolean`'
      case 'array':
        if (schema.items) {
          return `\`${this.schemaToMarkdownType(schema.items)}[]\``
        }
        return '`unknown[]`'
      case 'object':
        return '`object`'
      default:
        return '`unknown`'
    }
  }

  private generateIndex(): void {
    const indexContent = `// AirSwap Trading Protocol TypeScript Client
export * from './client'
export * from './types'
`
    fs.writeFileSync(path.join(this.outputDir, 'index.ts'), indexContent)

    // Note: The main package index.ts should export from './build/generated'
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }
}

// CLI functionality
function main() {
  const specPath = path.join(
    __dirname,
    '..',
    '..',
    'src',
    'airswap-open-rpc.json'
  )
  const outputDir = path.join(__dirname, '..', 'generated')

  console.info('AirSwap OpenRPC Client Generator')
  console.info('================================')
  console.info(`Spec file: ${specPath}`)
  console.info(`Output directory: ${outputDir}`)
  console.info('')

  try {
    const generator = new OpenRPCClientGenerator(specPath, outputDir)
    generator.generate()
  } catch (error) {
    console.error('❌ Error generating client:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}
