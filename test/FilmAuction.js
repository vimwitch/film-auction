const auction = artifacts.require('FilmAuction')
const assert = require('assert')

contract('FilmAuction tests', async accounts => {
  describe('auctions', () => {
    it('should fail to contribute to inactive auction', async () => {
      const contract = await auction.deployed()
      try {
        await contract.contribute(0, {
          from: accounts[1],
          value: '100000'
        })
        assert(false)
      } catch (err) {
        assert.equal(err.reason, 'Round has ended')
      }
    })

    it('should fail if gasprice is too high', async () => {
      const contract = await auction.deployed()
      const maxGasPrice = await contract.maxGasPrice()
      try {
        await contract.contribute(0, {
          from: accounts[1],
          value: '100000',
          gasPrice: (+maxGasPrice + 1).toString(),
        })
        assert(false)
      } catch (err) {
        assert.equal(err.reason, 'Gas price too high')
      }
    })
  })
})
