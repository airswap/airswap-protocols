/**
 * Updates the version in the package.json files of the specified folders.
 *
 * @param {string} version - The new version to set.
 * @param {string[]} excludeFolders - An array of folder names to exclude from the update.
 */
const fs = require('fs')
const path = require('path')

function updateVersion(version, excludeFolders) {
  const rootDir = path.join(__dirname, '..')

  // Folders to be updated
  const foldersToCheck = ['source', 'tools']

  // Iterate through the folders where the version needs to be updated
  foldersToCheck.forEach((mainFolder) => {
    const folderPath = path.join(rootDir, mainFolder)
    const folders = fs
      .readdirSync(folderPath, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name)

    folders.forEach((folder) => {
      console.log(`Updating ${mainFolder}/${folder} version to ${version}`)
      // Skip excluded packages
      if (!excludeFolders.includes(folder)) {
        const packageJsonPath = path.join(folderPath, folder, 'package.json')

        if (fs.existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(
            fs.readFileSync(packageJsonPath, 'utf8')
          )
          packageJson.version = version

          if (packageJson) {
            // Update @airswap dependencies in both dependencies and devDependencies
            ;['dependencies', 'devDependencies'].forEach((depType) => {
              if (packageJson[depType]) {
                Object.keys(packageJson[depType]).forEach((dep) => {
                  // Update @airswap dependencies, excluding jsonrpc-client-websocket and any excluded packages
                  if (
                    dep.startsWith('@airswap/') &&
                    dep !== '@airswap/jsonrpc-client-websocket'
                  ) {
                    const packageName = dep.split('/')[1]
                    if (!excludeFolders.includes(packageName)) {
                      packageJson[depType][dep] = version
                      console.log(
                        `Updated ${dep} to ${version} in ${mainFolder}/${folder}/package.json (${depType})`
                      )
                    }
                  }
                })
              }
            })
          }

          fs.writeFileSync(
            packageJsonPath,
            JSON.stringify(packageJson, null, 2)
          )
          console.log(
            `Updated version in ${mainFolder}/${folder}/package.json to ${version}`
          )
        } else {
          console.log(`No package.json found in ${mainFolder}/${folder}`)
        }
      } else {
        console.log(`Skipping ${mainFolder}/${folder}`)
      }
    })
  })
}

const [, , version, ...excludeFolders] = process.argv

if (!version) {
  console.error('Please provide a version number as the first argument')
  process.exit(1)
}

updateVersion(version, excludeFolders)
