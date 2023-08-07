// Adapted from OpenZeppelin
// https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/test/helpers/merkleTree.js

import { keccak256, keccakFromString, bufferToHex } from 'ethereumjs-util'
import { hexToBytes } from 'web3-utils'

// Merkle tree called with 32 byte hex values
export class MerkleTree {
  public elements: any
  public layers: any
  public id: any

  public constructor(elements: Array<string>) {
    this.elements = elements
      .filter((el) => el)
      .map((el) => Buffer.from(hexToBytes(el)))

    // Sort elements
    this.elements.sort(Buffer.compare)
    // Deduplicate elements
    this.elements = this.bufDedup(this.elements)

    // Create layers
    this.layers = this.getLayers(this.elements)
  }

  public getLayers(elements: Array<string>): Array<Array<string>> {
    if (elements.length === 0) {
      return [['']]
    }

    const layers: any = []
    layers.push(elements)

    // Get next layer until we reach the root
    while (layers[layers.length - 1].length > 1) {
      layers.push(this.getNextLayer(layers[layers.length - 1]))
    }

    return layers
  }

  public getNextLayer(elements: Array<Buffer>): Array<Buffer> {
    return elements.reduce(
      (layer: Buffer[], el: Buffer, idx: number, arr: Buffer[]) => {
        if (idx % 2 === 0) {
          // Hash the current element with its pair element
          layer.push(this.combinedHash(el, arr[idx + 1]))
        }

        return layer
      },
      []
    )
  }

  public combinedHash(first: Buffer, second: Buffer): Buffer {
    if (!first) {
      return second
    }
    if (!second) {
      return first
    }

    return keccak256(this.sortAndConcat(first, second))
  }

  public getRoot(): Buffer {
    return this.layers[this.layers.length - 1][0]
  }

  public getHexRoot(): string {
    return bufferToHex(this.getRoot())
  }

  public getProof(el: Buffer): Array<Buffer> {
    let idx = this.bufIndexOf(el, this.elements)

    if (idx === -1) {
      throw new Error('Element does not exist in Merkle tree')
    }

    return this.layers.reduce((proof: string[], layer: any) => {
      const pairElement = this.getPairElement(idx, layer)

      if (pairElement) {
        proof.push(pairElement)
      }

      idx = Math.floor(idx / 2)

      return proof
    }, [])
  }

  // external call - convert to buffer
  public getHexProof(_el: string): Array<string> {
    const el = Buffer.from(hexToBytes(_el))

    const proof = this.getProof(el)

    return this.bufArrToHexArr(proof)
  }

  public getPairElement(idx: number, layer: string): string | null {
    const pairIdx = idx % 2 === 0 ? idx + 1 : idx - 1

    if (pairIdx < layer.length) {
      return layer[pairIdx]
    } else {
      return null
    }
  }

  public bufIndexOf(el: Buffer | string, arr: Array<string>): number {
    let hash

    // Convert element to 32 byte hash if it is not one already
    if (el.length !== 32 || !Buffer.isBuffer(el)) {
      hash = keccakFromString(String(el))
    } else {
      hash = el
    }

    for (let i = 0; i < arr.length; i++) {
      if (hash.equals(Buffer.from(arr[i]))) {
        return i
      }
    }

    return -1
  }

  public bufDedup(elements: Array<Buffer>): Array<Buffer> {
    return elements.filter((el, idx) => {
      return idx === 0 || !elements[idx - 1].equals(el)
    })
  }

  public bufArrToHexArr(arr: Array<Buffer>): Array<string> {
    if (arr.some((el) => !Buffer.isBuffer(el))) {
      throw new Error('Array is not an array of buffers')
    }

    return arr.map((el) => '0x' + el.toString('hex'))
  }

  public sortAndConcat(...args: Array<any>): Buffer {
    return Buffer.concat([...args].sort(Buffer.compare))
  }
}
