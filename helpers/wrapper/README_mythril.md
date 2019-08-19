## Mythril Modifications

~/ refers to the root directory of airswap-protocols

1. Comment out lines 3-6 ~/helpers/wrapper/contracts/Imports.sol.
2. Change the path in ~/helpers/wrapper/contracts/Wrapper.sol to be absolute paths.

* @airswap/swap/interfaces/ISwap.sol -> ~/protocols/swap/interfaces/ISwap.sol
* @airswap/tokens/interfaces/IWETH.sol -> ~/helpers/tokens/interfaces/IWETH.sol
* openzeppelin-solidity/contracts/token/ERC20/IERC20.sol -> ~/node_modules/openzeppelin-solidity/contracts/token/ERC20/IERC20.sol

3. Do the same thing for ../../protocols/swap/contracts/Swap.sol to replace ISwap with the absolute path.
4. Do the same thing for ../../protocols/swap/interfaces/ISwap.sol to replace Types with the absolute path.

Create a new virtualenv folder named venv
```
virtualenv venv
```

Activate the virtualenv
```
source venv/bin/activate
```

Install mythril. requirements.txt is in the submodule for wrapper
```
pip install -r requirments/txt
```

Run mythril
```
myth -v 5 analyze contracts/Wrapper.sol --solv 0.5.10 --truffle --solc-args "--allow-paths  ~/airswap-protocols/protocols/swap/interfaces/ISwap.sol ~/airswap-protocols/helpers/tokens/interfaces/IWETH.sol ~/airswap-protocols/node_modules/openzeppelin-solidity/contracts/token/ERC20/IERC20.sol ~/airswap-protocols/protocols/types/contracts/Types.sol" --max-depth 428 --create-timeout 10000
```

