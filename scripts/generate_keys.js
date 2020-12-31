const Web3 = require('web3')
const fs = require('fs')
const path = require('path')

const keypath = path.join(__dirname, '../keys.json')
try {
  require(keypath)
  return
} catch (err) {
  console.log('Creating keys...')
}

const networks = [
  'mainnet',
  'goerli',
  'rinkeby',
  'ropsten',
  'kovan'
]
const web3 = new Web3()
const keys = {}
for (const name of networks) {
  const { address, privateKey } = web3.eth.accounts.create()
  keys[name] = {
    public: address,
    private: privateKey
  }
}
const keyData = JSON.stringify(keys, null, 2)
fs.writeFileSync(keypath, keyData)
