const path = require("path");
const HDWalletProvider = require('@truffle/hdwallet-provider');
require('dotenv').config();
module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  contracts_build_directory: path.join(__dirname, "client/src/contracts"),
  networks: {
    
     development: {
      host: "127.0.0.1",     // Localhost (default: none)
      port: 8545,            // Standard Ethereum port (default: none)
      network_id: "*",       // Any network (default: none)
     },
     rinkberry:{
       provider: function(){return new HDWalletProvider(`${process.env.MNEMONIC}`,`https://rinkberry.infura.io/v3/${process.env.INFURA_ID}`)},
       network_id: 4
     },
     ropsten:{
       provider: function(){return new HDWalletProvider(`${process.env.MNEMONIC}`,`https://ropsten.infura.io/v3/${process.env.INFURA_ID}`)},
       network_id: 3,
       from:"0x3C4103f533927F4cB1F0DA9913937588f46EB4F6",
     },
     kovan:{
      provider: function(){return new HDWalletProvider({mnemonic:{phrase:`${process.env.MNEMONIC}`},providerOrUrl:`https://kovan.infura.io/v3/${process.env.INFURA_ID}`})},
      network_id: 42,
      from:"0x3C4103f533927F4cB1F0DA9913937588f46EB4F6",
    },
     main:{
       provider: ()=>{return new HDWalletProvider(`${process.env.MNEMONIC}`,`https://mainnet.infura.io/v3/${process.env.INFURA_ID}`)},
       network_id: 1,
       gas: 3000000,
       gasPrice: 10000000000,
     },
     coverage:{
       gas:0x1fffffffffffff,
       host:'127.0.0.1',
       port:8555,
       network_id:"*",
     },
  },
  // Set default mocha options here, use special reporters etc.
  plugins: ["solidity-coverage"],
  mocha: {
    reporter:'eth-gas-reporter',
    reporterOptions:{
      gasPrice:1,
      token:'ETH',
    }
    // timeout: 100000
  },
  // Configure your compilers
  compilers: {
    solc: {
      version: "0.8.13",      // Fetch exact version from solc-bin (default: truffle's version)
      // docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
       settings: {          // See the solidity docs for advice about optimization and evmVersion
        optimizer: {
          enabled: true,
          runs: 200
        },
      //  evmVersion: "byzantium"
       }
    },
  },
};
