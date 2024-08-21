const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const subfolders = [
  'batch-call',
  'delegate',
  'pool',
  'registry',
  'staking',
  'swap',
  'swap-erc20',
  'wrapper',
]

function getLatestCommitForContract(contractPath) {
  const branches = ['main', 'develop']
  for (const branch of branches) {
    try {
      const commit = execSync(
        `git log -1 --format=%H ${branch} -- ${contractPath}/contracts`
      )
        .toString()
        .trim()
      let tag
      try {
        tag = execSync(`git describe --tags --contains ${commit}`)
          .toString()
          .trim()
          .split('-')[0] // Get the most recent tag
      } catch {
        tag = 'No tag found'
      }
      return { branch, tag, commit }
    } catch (error) {
      // No changes in this branch, continue to the next one
    }
  }
  return {
    branch: 'No branch found',
    tag: 'No tag found',
    commit: 'No commit found',
  }
}

const repoUrl = 'https://github.com/airswap/airswap-protocols'

subfolders.forEach((folder) => {
  const contractPath = path.join('source', folder)
  const deploysBlocksPath = path.join(
    __dirname,
    contractPath,
    'deploys-blocks.js'
  )
  const deploysCommitsPath = path.join(
    __dirname,
    contractPath,
    'deploys-commits.js'
  )

  const deploysBlocks = require(deploysBlocksPath)
  const { branch, tag, commit } = getLatestCommitForContract(contractPath)

  console.log(`Contract: ${folder}`)
  console.log(`Branch: ${branch}`)
  console.log(`Latest tag: ${tag}`)
  console.log(`Commit: ${commit}`)
  console.log(`Commit link: ${repoUrl}/commit/${commit}`)
  console.log('---')

  let content = 'module.exports = {\n'

  Object.keys(deploysBlocks).forEach((chainId) => {
    content += `  ${chainId}: '${commit}',\n`
  })

  content += '}\n'

  fs.writeFileSync(deploysCommitsPath, content)
  console.log(`Updated ${deploysCommitsPath}`)
})

console.log('All deploys-commits.js files have been updated successfully.')
