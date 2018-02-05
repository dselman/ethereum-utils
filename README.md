# ethereum-utils

 ## What does the code do?

 This code shows how to interact with Ethereum using the web3 JavaScript library:

 1. How to connect to an Ethereum node using RPC and the web3 library
 2. How to compile a Solidity smart contract from source
 3. How to deploy the compiled contract, signing the deploy transaction using a private key
 4. How to invoke read-only methods on the smart contract
 5. How to modify the state of the smart contract by submitting a transaction signed using a private key
  
 This code was written for educational purposes only. **Use it at your own risk!** It has only been
 tested on the rinkeby test network.

## Install

Install a local `geth` node. E.g. by following: https://github.com/ethereum/go-ethereum/wiki/Installation-Instructions-for-Mac

Launch the local `geth` node in a terminal using:

```
geth --rinkeby --rpc --verbosity 2 console
```

Then create your test account by using the `geth` REPL:

```
personal.newAccount()
eth.coinbase
```

You will then have to request some Ether for your account using the faucet service at https://faucet.rinkeby.io by pasing a URL to a Tweet containing the Ethereum address you created above.

You will also need to grab a random destination Ethereum account. You can use https://rinkeby.etherscan.io to check the status of your account or to find the address of a random Ethereum account.

## Running

You can launch the client and get help using:

```
 node ./lib/client.js --help
```

E.g.

```
dselman$ node ./lib/client.js -a 0xaaaaaa -p 0xbbbbbb -d 0xcccccc
```