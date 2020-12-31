const path = require('path')
const fs = require('fs')
const Web3 = require('web3')
const keys = require(path.join(__dirname, '../keys.json'))

const args = process.argv
const networkArg = args.indexOf('--network')
const network = networkArg === -1 ? 'goerli' : args[networkArg + 1]

const goerliUrl = 'http://192.168.1.199:9545'

const contracts = [
  'FilmAuction',
]

;(async () => {
  const web3 = new Web3(
    new Web3.providers.HttpProvider(network === 'mainnet' ? mainnetUrl : goerliUrl)
  )
  const gasPrice = '25399999999' //await web3.eth.getGasPrice()
  // return
  if (!keys[network]) {
    console.log(`No key for network "${network}"`)
    process.exit(1)
  }
  const account = web3.eth.accounts.wallet.add(keys[network].private)

  for (const contract of contracts) {
    const contractPath = path.join(__dirname, '../build/', `${contract}.bin`)
    const ABI = JSON.parse(fs.readFileSync(path.join(__dirname, '../build', `${contract}.abi`)))
    const contractBin = fs.readFileSync(contractPath, 'ascii').toString('hex')
    const _contract = new web3.eth.Contract(ABI, {
      data: `0x${contractBin}`,
      from: account.address,
    })
    const c = await _contract.deploy({
      arguments: [
        '0x5212BdE7120379b555B6c60Dd36DeCf41e50f64C'
      ],
    })
    // .estimateGas({
    //   from: account.address
    // })

    .send({
      from: account.address,
      gas: 3000000,
      gasPrice,
    })
    console.log(`Deployed at address ${c._address}`)
  }
})()
