/*
  Copyright 2020 Swap Holdings Ltd.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

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
