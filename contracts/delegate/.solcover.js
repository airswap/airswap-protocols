module.exports = {
    port: 8545,
    norpc: true,
    compileCommand: 'yarn compile',
    testCommand: 'yarn test --network coverage',
    copyPackages: ['openzeppelin-solidity'],
    skipFiles: ['analysis', 'interfaces', 'contracts/Imports.sol'],
    compilers: {
        solc: {
          version: "0.5.10" // A version or constraint - Ex. "^0.5.0"
        }
    }
};