export function stringify(
  types: { [key: string]: { type: string; name: string }[] },
  primaryType: string
): string {
  return types[primaryType].reduce((str, value, index, values) => {
    const isEnd = index !== values.length - 1
    return str + `${value.type} ${value.name}${isEnd ? ',' : ')'}`
  }, `${primaryType}(`)
}
