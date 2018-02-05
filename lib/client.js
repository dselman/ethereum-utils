/**
 *  Copyright 2018 Clause Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const fs = require('fs');
const solc = require('solc');
const Web3 = require('web3');

/**
 * This code illustrates:
 * 1. How to connect to an Ethereum node using RPC and the web3 library
 * 2. How to compile a Solidity smart contract from source
 * 3. How to deploy the compiled contract, signing the deploy transaction using a private key
 * 4. How to invoke read-only methods on the smart contract
 * 5. How to modify the state of the smart contract by submitting a transaction signed using a private key
 * 
 * This code was written for educational purposes only. Use it at your own risk! It has only been
 * tested on the rinkeby test network.
 */

var argv = require('yargs')
    .usage('Usage: $0 [options]')
    .example('$0 -a 0x123 -p 0x123 -d 0x123 -r http://myhost:8545', 'Deploy and interact with the Smart Contract')
    .alias('a', 'account')
    .nargs('a', 1)
    .describe('a', 'Account owner for the Smart Contract')
    .demandOption(['a'])
    .alias('p', 'privateKey')
    .nargs('p', 1)
    .describe('p', 'Private Key for the Account')
    .demandOption(['p'])
    .alias('d', 'destinationAccount')
    .nargs('d', 1)
    .describe('d', 'Destination Ethereum Account')
    .demandOption(['d'])
    .alias('r', 'rpc')
    .nargs('r', 1)
    .describe('r', 'RPC host and port for the Ethereum Node')
    .default('r', 'http://127.0.0.1:8545')
    .help('h')
    .alias('h', 'help')
    .epilog('Copyright Dan Selman 2018')
    .argv;

 /**
  * The account number used to deploy the smart contract
  * the account can be created using the geth command line (REPL) by typing
  * personal.newAccount()
  */
const account = argv.a;

/**
 * Private key for the account, used to sign transactions
 * 
 * On the Mac for the rinkeby test network this will be under:
 * /Users/<user>/Library/Ethereum/rinkeby/keystore/
 * Use https://www.myetherwallet.com/#view-wallet-info to upload a Keystore/JSON file
 * and then display the unencrypted private key
 */ 
const privateKey = argv.p;

/**
 * A destination account for test
 * 
 * You can grab any valid account from https://rinkeby.etherscan.io
 */
const dest_account = argv.d;

/**
 * RPC URL to use. E.g. Launch geth locally with:
 * geth --rinkeby --rpc --verbosity 2 console
 */ 
const ethereumRpcUrl = argv.r;

/**
 * Wrap in an async function so we can await. This code is heavily async and 
 * transaction can take 30+ seconds to confirm.
 */
(async function () {
    const web3 = new Web3(new Web3.providers.HttpProvider(ethereumRpcUrl));

    // compile the Solidity code
    const input = fs.readFileSync('Token.sol');
    const output = solc.compile(input.toString(), 1);
    const bytecode = output.contracts[':Token'].bytecode;

    // the ABI is the Interface Definition Language for the smart contract
    const abi = JSON.parse(output.contracts[':Token'].interface);

    // how much we are prepared to spend in gas executing a transaction
    const gasLimitHex = web3.utils.toHex(200000);

    // get the gas price used by recent blocks
    let gasPrice = await web3.eth.getGasPrice();
    console.log('gasPrice: ' + gasPrice);
    gasPrice = Math.ceil(gasPrice * 1.2); // inflate by 20% so we can replace failed transactions and get mined quickly
    const gasPriceHex = web3.utils.toHex(gasPrice);
    console.log('using account: ' + account);

    // the nonce should be a monotonically increasing number
    // it is scoped to an account and allows failed transactions to be retried
    let nonce = await web3.eth.getTransactionCount(account);
    console.log('nonce: ' + nonce);

    // create the deploy smart contract transaction so we can sign it
    const tx = {
        nonce: web3.utils.toHex(nonce),
        // gas : undefined, // calculate the gas required for the tx
        gasPrice: gasPriceHex, // the higher this is the more likely the tx is to get included in a block
        gasLimit: gasLimitHex, // the max amount of gas we are prepared to pay for the computation fo this tx
        // value: '0x00', // the endowment for the contract
        data: '0x' + bytecode, // the bytecode we want to deploy
        from: account // the account performing the action that will be debited
    };

    // we sign the transaction with the account's private key so we do not have to
    // interactively unlock the account in geth
    const signed = await web3.eth.accounts.signTransaction(tx, privateKey);

    // submit the deploy smart contract transaction 
    const receipt = await web3.eth.sendSignedTransaction(signed.rawTransaction);

    // the transaction was mined, we can retrieve the contract address
    console.log('smart contract deployed at address: ' + receipt.contractAddress);

    // create a contract instance, using the ABI - this generates dynamic methods
    const tokenContract = new web3.eth.Contract(abi, receipt.contractAddress, {
        from: account,
        gasPrice: gasPriceHex,
        gasLimit: gasLimitHex,
    });

    // assert initial account balance, should be 100000 (hardcoded in the Solidity code)
    // this is a read operation on the contract, so we do not need to sign this
    const balance1 = await tokenContract.methods.balances(account).call({
        from: account
    });
    console.log('smart contract has balance for account: ' + balance1);
    if(balance1 !== '1000000') {
        throw new Error('balance is incorrect: ' + balance1);
    }

    // 'send' the transfer function - this needs to be signed as it modifies the contract
    // abiData captures the details of a method call on the contract
    const abiData = tokenContract.methods.transfer(dest_account, 100).encodeABI();
    nonce++; // increment to the next nonce

    // create the transaction that calls abiData
    const tx2 = {
        nonce: web3.utils.toHex(nonce),
        // gas : undefined, // automatically calculate the gas required for the tx
        gasPrice: gasPriceHex, // the higher this is the more likely the tx is to get included in a block
        gasLimit: gasLimitHex, // the max amount of gas we are prepared to pay for the computation fo this tx
        // value: '0x00', // the endowment for the contract
        data: abiData, // the RPC data
        to: tokenContract.options.address, // the address of the contract
        from: account // the account performing the action that will be debited
    };

    // we sign the transaction with the account's private key so we do not have to
    // interactively unlock the account in geth
    const signed2 = await web3.eth.accounts.signTransaction(tx2, privateKey);

    // submit the 'send' transfer transaction 
    const res = await web3.eth.sendSignedTransaction(signed2.rawTransaction);

    // get the destination account balance, should be 100 
    const balance2 = await tokenContract.methods.balances(dest_account).call({
        from: account
    });
    console.log('smart contract has balance for destination acccount: ' + balance2);
    if(balance2 !== '100') {
        throw new Error('balance is incorrect: ' + balance2);
    }
})();