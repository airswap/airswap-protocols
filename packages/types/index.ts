export * from './src/eip712'
export * from './src/pool'
export * from './src/swap'
export * from './src/swapERC20'
export * from './src/typescript'

export function stringify(
  types: { [key: string]: { type: string; name: string }[] },
  primaryType: string
): string {
  return types[primaryType].reduce((str, value, index, values) => {
    const isEnd = index !== values.length - 1
    return str + `${value.type} ${value.name}${isEnd ? ',' : ')'}`
  }, `${primaryType}(`)
}
