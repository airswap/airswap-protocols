export * from './src/merkle'

import { soliditySha3 } from 'web3-utils'
import { MerkleTree } from './src/merkle'

export function generateTreeFromElements(elements) {
  return new MerkleTree(elements)
}

export function generateTreeFromData(data) {
  const elements = []
  for (const idx in data) {
    elements.push(soliditySha3(idx, data[idx]))
  }
  return new MerkleTree(elements)
}

export function getRoot(tree) {
  return tree.getHexRoot()
}

export function getProof(tree, element) {
  return tree.getHexProof(element)
}
