const auction = artifacts.require('FilmAuction')
const assert = require('assert')

const defaultGasPrice = '1000000000'

contract('FilmAuction tests', async accounts => {

  describe('create auction', () => {
    it('should fail for non-creator', async () => {
      const contract = await auction.deployed()
      const auctionLength = await contract.MIN_AUCTION_LENGTH()
      const auctionLeadTime = await contract.MIN_AUCTION_LEAD_TIME()
      const auctionStart = (1000 * +new Date()) + auctionLeadTime + 30
      const auctionEnd = auctionStart + auctionLength
      try {
        await contract.createAuctionRound(
          '100',
          '10000',
          auctionStart.toString(),
          auctionEnd.toString(),
          {
            from: accounts[1],
          }
        )
        assert(false)
      } catch (err) {
        assert.equal(err.reason, 'You must be a creator')
      }
    })
  })

  describe('contribute', () => {

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

    it('should fail for invalid round', async () => {
      const contract = await auction.deployed()
      try {
        await contract.contribute(5, {
          from: accounts[1],
          value: '100000',
          gasPrice: defaultGasPrice,
        })
      } catch (err) {
        assert.equal(err.reason, 'Invalid round index')
      }
    })

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

  })
})
