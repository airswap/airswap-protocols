export * from './src/merkle'

import { soliditySha3 } from 'web3-utils'
import { MerkleTree } from './src/merkle'

export function generateTreeFromElements(elements: Array<any>): MerkleTree {
  return new MerkleTree(elements)
}

export function generateTreeFromData(data: {
  [id: string]: string
}): MerkleTree {
  const elements = []
  for (const idx in data) {
    elements.push(soliditySha3(idx, data[idx]))
  }
  return new MerkleTree(elements)
}

export function getRoot(tree: MerkleTree): string {
  return tree.getHexRoot()
}

export function getProof(tree: MerkleTree, element: string): Array<string> {
  return tree.getHexProof(element)
}
