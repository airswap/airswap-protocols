export function lowerCaseAddresses(obj: any): any {
  for (const key in obj) {
    if (typeof obj[key] === 'object') {
      lowerCaseAddresses(obj[key])
    } else if (typeof obj[key] === 'string' && obj[key].indexOf('0x') === 0) {
      obj[key] = obj[key] && obj[key].toLowerCase()
    } else {
      obj[key] = obj[key] && obj[key].toString()
    }
  }
  return obj
}

export function stringify(
  types: { [key: string]: { type: string; name: string }[] },
  primaryType: string
): string {
  return types[primaryType].reduce((str, value, index, values) => {
    const isEnd = index !== values.length - 1
    return str + `${value.type} ${value.name}${isEnd ? ',' : ')'}`
  }, `${primaryType}(`)
}
