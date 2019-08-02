module.exports = {
    port: 8545,
    norpc: true,
    compileCommand: 'yarn compile',
    testCommand: 'yarn test',
    copyPackages: ['openzeppelin-solidity'],
    skipFiles: ['indexer', 'market', 'tokens', 'wrapper', 'swap', 'swap/interfaces', 'common/contracts/Imports.sol', 'swap/contracts/Imports.sol', 'swap/contracts/Migrations.sol', 'common/contracts/Imports.sol', 'Imports.sol', './coverageEnv/contracts/Imports.sol'],
    compilers: {
        solc: {
          version: "0.5.10" // A version or constraint - Ex. "^0.5.0"
        }
    }
};