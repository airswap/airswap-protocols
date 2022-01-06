import { expect } from 'chai'
import { soliditySha3 } from 'web3-utils'
import { generateTreeFromData, getRoot, getProof } from '../index'

describe('Merkle', async () => {
  let tree
  const treeRoot =
    '0xad519504d6845f9f2529e80a2247d751af56af868ed9f23398705a1ec1bd9fc4'
  const proof = [
    '0xc361555652533965d9a3cda90060cb77c14bbaec689e062a4ca8ce8976836719',
    '0xe2ad42ca8c17510e58dca1ba6f472caafa90b9fee56f679b0e000881096562f6',
  ]

  it('Creates and validates tree', async () => {
    tree = generateTreeFromData({
      a: '1',
      b: '2',
      c: '3',
    })
    expect(getRoot(tree)).to.equal(treeRoot)
  })

  it('Validates proof', async () => {
    const element = soliditySha3('a', '1')
    expect(getProof(tree, element).join()).to.equal(proof.join())
  })
})
