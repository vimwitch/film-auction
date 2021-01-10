const auction = artifacts.require('FilmAuction')
const assert = require('assert')
const timeMachine = require('ganache-time-traveler')
const BN = require('bn.js')

const defaultGasPrice = '1000000000'

const now = () => Math.floor(+new Date() / 1000)

async function createRound(account, startOffset = 0, auctionMin = '1000', auctionMax = '100000') {
  const contract = await auction.deployed()
  const MIN_AUCTION_LENGTH = +(await contract.MIN_AUCTION_LENGTH()).toString()
  const MIN_AUCTION_LEAD_TIME = +(await contract.MIN_AUCTION_LEAD_TIME()).toString()
  const auctionStart = startOffset + now() + MIN_AUCTION_LEAD_TIME + 30
  const auctionEnd = auctionStart + MIN_AUCTION_LENGTH
  await contract.createAuctionRound(
    auctionMin,
    auctionMax,
    auctionStart.toString(),
    auctionEnd.toString(),
    {
      from: account,
    },
  )
  return {
    roundIndex: (+(await contract.roundCount()) - 1).toString(),
    auctionStart,
    auctionEnd,
    minWei: auctionMin,
    maxWei: auctionMax,
  }
}

contract('FilmAuction tests', async accounts => {

  let snapshotId
  beforeEach(async () => {
    const { result } = await timeMachine.takeSnapshot()
    snapshotId = result
  })

  afterEach(async () => {
    await timeMachine.revertToSnapshot(snapshotId)
  })

  let MIN_AUCTION_LENGTH, MIN_AUCTION_LEAD_TIME, OWNER_FACTOR, contract
  before('Load variables', async () => {
    contract = await auction.deployed()
    MIN_AUCTION_LENGTH = +(await contract.MIN_AUCTION_LENGTH()).toString()
    MIN_AUCTION_LEAD_TIME = +(await contract.MIN_AUCTION_LEAD_TIME()).toString()
    OWNER_FACTOR = +(await contract.OWNER_FACTOR()).toString()
  })

  describe('create auction', () => {
    it('should fail for non-creator', async () => {
      const auctionStart = now() + MIN_AUCTION_LEAD_TIME + 30
      const auctionEnd = auctionStart + MIN_AUCTION_LENGTH
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
        assert.equal(err.reason, 'Must be creator')
      }
    })

    it('should fail for invalid timing', async () => {
      const auctionStart = now() + MIN_AUCTION_LEAD_TIME + 30
      const auctionEnd = auctionStart - 1
      try {
        await contract.createAuctionRound(
          '100',
          '10000',
          auctionStart.toString(),
          auctionEnd.toString(),
          {
            from: accounts[0],
          }
        )
        assert(false)
      } catch (err) {
        assert.equal(err.reason, 'Invalid timing')
      }
    })

    it('should fail for too short auction', async () => {
      const auctionStart = now() + MIN_AUCTION_LEAD_TIME + 30
      const auctionEnd = auctionStart + MIN_AUCTION_LENGTH - 1
      try {
        await contract.createAuctionRound(
          '100',
          '10000',
          auctionStart.toString(),
          auctionEnd.toString(),
          {
            from: accounts[0],
          }
        )
        assert(false)
      } catch (err) {
        assert.equal(err.reason, 'Invalid auction length')
      }
    })

    it('should fail for invalid start time', async () => {
      const auctionStart = now() - 1
      const auctionEnd = auctionStart + MIN_AUCTION_LENGTH
      try {
        await contract.createAuctionRound(
          '100',
          '10000',
          auctionStart.toString(),
          auctionEnd.toString(),
          {
            from: accounts[0],
          }
        )
        assert(false)
      } catch (err) {
        assert.equal(err.reason, 'Start time is in past')
      }
    })

    it('should fail for invalid lead time', async () => {
      const auctionStart = now() + MIN_AUCTION_LEAD_TIME - 1
      const auctionEnd = auctionStart + MIN_AUCTION_LENGTH
      try {
        await contract.createAuctionRound(
          '100',
          '10000',
          auctionStart.toString(),
          auctionEnd.toString(),
          {
            from: accounts[0],
          }
        )
        assert(false)
      } catch (err) {
        assert.equal(err.reason, 'Too close to start time')
      }
    })

    it('should fail for invalid target amounts', async () => {
      const auctionStart = now() + MIN_AUCTION_LEAD_TIME + 60
      const auctionEnd = auctionStart + MIN_AUCTION_LENGTH
      try {
        await contract.createAuctionRound(
          '10000',
          '100',
          auctionStart.toString(),
          auctionEnd.toString(),
          {
            from: accounts[0],
          }
        )
        assert(false)
      } catch (err) {
        assert.equal(err.reason, 'Invalid target amounts')
      }
      try {
        await contract.createAuctionRound(
          '10000',
          '10000',
          auctionStart.toString(),
          auctionEnd.toString(),
          {
            from: accounts[0],
          }
        )
        assert(false)
      } catch (err) {
        assert.equal(err.reason, 'Invalid target amounts')
      }
    })

    it('should fail for invalid minimum', async () => {
      const auctionStart = now() + MIN_AUCTION_LEAD_TIME + 60
      const auctionEnd = auctionStart + MIN_AUCTION_LENGTH
      try {
        await contract.createAuctionRound(
          OWNER_FACTOR.toString(),
          (OWNER_FACTOR + 1).toString(),
          auctionStart,
          auctionEnd,
          {
            from: accounts[0],
          }
        )
        assert(false)
      } catch (err) {
        assert.equal(err.reason, 'Invalid min wei')
      }
    })

    it('should fail to create overlapping auction', async () => {
      const auctionStart = now() + MIN_AUCTION_LEAD_TIME + 60
      const auctionEnd = auctionStart + MIN_AUCTION_LENGTH
      await contract.createAuctionRound(
        '1000',
        '100000',
        auctionStart,
        auctionEnd,
        {
          from: accounts[0],
        }
      )
      const overlapAuctionStart = auctionEnd - 10
      const overlapAuctionEnd = overlapAuctionStart + MIN_AUCTION_LENGTH
      try {
        await contract.createAuctionRound(
          '1000',
          '10000',
          overlapAuctionStart,
          overlapAuctionEnd,
          {
            from: accounts[0],
          }
        )
        assert(false)
      } catch (err) {
        assert.equal(err.reason, 'Auction overlap not allowed')
      }
    })

    it('should create new auction', async () => {
      const auctionStart = now() + MIN_AUCTION_LEAD_TIME + 60
      const auctionEnd = auctionStart + MIN_AUCTION_LENGTH
      await contract.createAuctionRound(
        '1000',
        '100000',
        auctionStart,
        auctionEnd,
        {
          from: accounts[0],
        }
      )
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

    it('should fail for auction that has not started', async () => {
      const auctionStart = now() + MIN_AUCTION_LEAD_TIME + 30
      const auctionEnd = auctionStart + MIN_AUCTION_LENGTH
      await contract.createAuctionRound(
        '1000',
        '100000',
        auctionStart.toString(),
        auctionEnd.toString(),
        {
          from: accounts[0],
        },
      )
      const auctionIndex = 1
      try {
        await contract.contribute(auctionIndex, {
          from: accounts[1],
          value: '100',
        })
        assert(false)
      } catch (err) {
        assert.equal(err.reason, 'Round has not started')
      }
    })

    it('should fail for auction at max contribution', async () => {
      const auctionStart = now() + MIN_AUCTION_LEAD_TIME + 30
      const auctionEnd = auctionStart + MIN_AUCTION_LENGTH
      await contract.createAuctionRound(
        '1000',
        '100000',
        auctionStart.toString(),
        auctionEnd.toString(),
        {
          from: accounts[0],
        },
      )
      await timeMachine.advanceTimeAndBlock(10 + auctionStart - now())
      const auctionIndex = 1
      await contract.contribute(auctionIndex, {
        from: accounts[1],
        value: '100000000',
      })
      try {
        await contract.contribute(auctionIndex, {
          from: accounts[2],
          value: '100',
        })
        assert(false)
      } catch (err) {
        assert.equal(err.reason, 'Round max reached')
      }
    })

    it('should fail for individual at max contribution', async () => {
      const auctionStart = now() + MIN_AUCTION_LEAD_TIME + 30
      const auctionEnd = auctionStart + MIN_AUCTION_LENGTH
      await contract.createAuctionRound(
        '100000',
        '100000000',
        auctionStart.toString(),
        auctionEnd.toString(),
        {
          from: accounts[0],
        },
      )
      const maxContribution = '1000'
      await contract.setMaxContribution(maxContribution, {
        from: accounts[0],
      })
      await timeMachine.advanceTimeAndBlock(10 + auctionStart - now())
      const auctionIndex = 1
      await contract.contribute(auctionIndex, {
        from: accounts[1],
        value: '100000000',
      })
      try {
        await contract.contribute(auctionIndex, {
          from: accounts[1],
          value: '100',
        })
        assert(false)
      } catch (err) {
        assert.equal(err.reason, 'Max contribution reached')
      }
      const latestRound = await contract.latestRound()
      assert.equal(latestRound.actualWei, maxContribution)
    })

    it('should fail for zero contribution', async () => {
      const auctionStart = now() + MIN_AUCTION_LEAD_TIME + 30
      const auctionEnd = auctionStart + MIN_AUCTION_LENGTH
      await contract.createAuctionRound(
        '1000',
        '100000',
        auctionStart.toString(),
        auctionEnd.toString(),
        {
          from: accounts[0],
        },
      )
      await timeMachine.advanceTimeAndBlock(10 + auctionStart - now())
      const auctionIndex = 1
      try {
        await contract.contribute(auctionIndex, {
          from: accounts[1],
          value: '0',
        })
        assert(false)
      } catch (err) {
        assert.equal(err.reason, 'Invalid contribution value')
      }
    })

    it('should contribute to auction', async () => {
      const auctionStart = now() + MIN_AUCTION_LEAD_TIME + 30
      const auctionEnd = auctionStart + MIN_AUCTION_LENGTH
      await contract.createAuctionRound(
        '1000',
        '100000',
        auctionStart.toString(),
        auctionEnd.toString(),
        {
          from: accounts[0],
        },
      )
      const maxContribution = '10000'
      await contract.setMaxContribution(maxContribution, {
        from: accounts[0],
      })
      await timeMachine.advanceTimeAndBlock(10 + auctionStart - now())
      const auctionIndex = 1
      await contract.contribute(auctionIndex, {
        from: accounts[1],
        value: maxContribution,
      })
      const latestRound = await contract.latestRound()
      assert.equal(latestRound.actualWei, maxContribution)
    })

    it('should refund excess', async () => {
      const auctionStart = now() + MIN_AUCTION_LEAD_TIME + 30
      const auctionEnd = auctionStart + MIN_AUCTION_LENGTH
      const auctionLimit = '100000'
      await contract.createAuctionRound(
        '1000',
        auctionLimit,
        auctionStart.toString(),
        auctionEnd.toString(),
        {
          from: accounts[0],
        },
      )
      const maxContribution = '10000'
      await contract.setMaxContribution(maxContribution, {
        from: accounts[0],
      })
      await timeMachine.advanceTimeAndBlock(10 + auctionStart - now())
      const auctionIndex = 1
      {
        const startBalance = await web3.eth.getBalance(contract.address)
        await contract.contribute(auctionIndex, {
          from: accounts[1],
          value: (+maxContribution + 10).toString(),
        })
        const endBalance = await web3.eth.getBalance(contract.address)
        // individual contrib limit
        assert.equal(endBalance.toString(), (+startBalance + +maxContribution).toString())
      }

      await contract.setMaxContribution((10 ** 18).toString(), {
        from: accounts[0],
      })
      const startBalance = await web3.eth.getBalance(contract.address)
      await contract.contribute(auctionIndex, {
        from: accounts[2],
        value: '10000000',
      })
      const endBalance = await web3.eth.getBalance(contract.address)
      // auction contrib limit
      assert.equal(endBalance.toString(), auctionLimit)
    })

  })

  describe('finish round', () => {
    it('should fail on invalid index', async () => {
      const { roundIndex, auctionEnd } = await createRound(accounts[0])
      await timeMachine.advanceTimeAndBlock(10 + +auctionEnd - now())
      try {
        await contract.finishRound(roundIndex + 1)
        assert(false)
      } catch (err) {
        assert.equal(err.reason, 'Invalid round index')
      }
    })

    it('should fail if before finish and maxWei not reached', async () => {
      const { roundIndex, auctionStart } = await createRound(accounts[0])
      await timeMachine.advanceTimeAndBlock(10 + +auctionStart - now())
      try {
        await contract.finishRound(roundIndex)
        assert(false)
      } catch (err) {
        assert.equal(err.reason, 'Round has not finished')
      }
    })

    it('should fail if already finished', async () => {
      const { roundIndex, auctionEnd } = await createRound(accounts[0])
      await timeMachine.advanceTimeAndBlock(10 + +auctionEnd - now())
      await contract.finishRound(roundIndex)
      try {
        await contract.finishRound(roundIndex)
        assert(false)
      } catch (err) {
        assert.equal(err.reason, 'Round already finished')
      }
    })

    it('should not change balances if fail', async () => {
      const { roundIndex, minWei, auctionStart, auctionEnd } = await createRound(accounts[0])
      await timeMachine.advanceTimeAndBlock(10 + +auctionStart - now())
      // contribute some
      await contract.contribute(roundIndex, {
        from: accounts[2],
        value: (+minWei - 10).toString(),
      })
      await timeMachine.advanceTimeAndBlock(10 + +auctionEnd - now())
      const startBalance = await contract.totalBalance()
      const startSupply = await contract.totalSupply()
      const { logs } = await contract.finishRound(roundIndex)
      assert.equal(logs.length, 1)
      assert.equal(logs[0].event, 'RoundFinished')
      assert.equal(logs[0].args.roundIndex.toString(), roundIndex)
      assert.equal(logs[0].args.success, false)
      const latestRound = await contract.latestRound()
      assert.equal(latestRound.finished, true)
      assert.equal(latestRound.success, false)
      assert.equal(startBalance.toString(), (await contract.totalBalance()).toString())
      assert.equal(startSupply.toString(), (await contract.totalSupply()).toString())
    })

    it('should update balances if sucess', async () => {
      const { roundIndex, minWei, auctionStart, auctionEnd } = await createRound(accounts[0])
      await timeMachine.advanceTimeAndBlock(10 + +auctionStart - now())
      // contribute some
      const contributionWei = (+minWei + 10).toString()
      await contract.contribute(roundIndex, {
        from: accounts[2],
        value: contributionWei,
      })
      await timeMachine.advanceTimeAndBlock(10 + +auctionEnd - now())
      const startBalance = await contract.totalBalance()
      const startSupply = await contract.totalSupply()
      const originalCreator = await contract.originalCreator()
      const { logs } = await contract.finishRound(roundIndex)
      const finalBalance = await contract.totalBalance()
      const finalSupply = await contract.totalSupply()
      const expectedOwnerDelta = Math.floor(+contributionWei / +OWNER_FACTOR)
      const expectedDelta = +contributionWei + expectedOwnerDelta
      const expectedSupply = +startSupply.toString() + expectedDelta
      assert.equal(logs.length, 2)
      for (const { event: _event, args } of logs) {
        if (_event !== 'Transfer' && _event !== 'RoundFinished') {
          assert(false)
        }
        if (_event === 'RoundFinished') {
          assert.equal(args.roundIndex.toString(), roundIndex)
          assert.equal(args.success, true)
        }
        if (_event === 'Transfer') {
          assert.equal(args.from, '0x0000000000000000000000000000000000000000')
          assert.equal(args.to, originalCreator)
          assert.equal(args.value.toString(), expectedOwnerDelta.toString())
        }
      }
      assert.equal(+startBalance.toString() + +contributionWei.toString(), +finalBalance.toString())
      assert.equal(+expectedSupply, +finalSupply.toString())
    })
  })

  describe('settle tokens', () => {
    it('should noop if nothing to settle', async () => {
      const { roundIndex, minWei, auctionStart, auctionEnd } = await createRound(accounts[0])
      await timeMachine.advanceTimeAndBlock(10 + +auctionStart - now())
      // contribute some
      const contributionWei = (+minWei + 10).toString()
      await contract.contribute(roundIndex, {
        from: accounts[2],
        value: contributionWei,
      })
      await timeMachine.advanceTimeAndBlock(10 + +auctionEnd - now())
      const startBalance = await contract.balanceOf(accounts[2])
      const { logs } = await contract.methods['settleTokens()']({
        from: accounts[2],
      })
      const endBalance = await contract.balanceOf(accounts[2])
      assert.equal(logs.length, 0)
      assert.equal(startBalance.toString(), endBalance.toString())
    })

    it('should update token balance if round success', async () => {
      const { roundIndex, minWei, auctionStart, auctionEnd } = await createRound(accounts[0])
      await timeMachine.advanceTimeAndBlock(10 + +auctionStart - now())
      // contribute some
      const contributionWei = (+minWei + 10).toString()
      await contract.contribute(roundIndex, {
        from: accounts[2],
        value: contributionWei,
      })
      await timeMachine.advanceTimeAndBlock(10 + +auctionEnd - now())
      const startBalance = await contract.balanceOf(accounts[2])
      await contract.finishRound(roundIndex)
      const zeroBalance = await contract.balanceOf('0x0000000000000000000000000000000000000000')
      const { logs } = await contract.settleTokens(accounts[2], {
        from: accounts[4]
      })
      assert.equal(logs.length, 1)
      assert.equal(logs[0].event, 'Transfer')
      assert.equal(logs[0].args.from, '0x0000000000000000000000000000000000000000')
      assert.equal(logs[0].args.to, accounts[2])
      assert.equal(logs[0].args.value.toString(), contributionWei)
      const expectedBalance = +startBalance.toString() + +contributionWei
      const endBalance = await contract.balanceOf(accounts[2])
      const expectedZeroBalance = +zeroBalance.toString() - +contributionWei
      const finalZeroBalance = await contract.balanceOf('0x0000000000000000000000000000000000000000')
      assert.equal(expectedBalance, endBalance.toString())
      assert.equal(expectedZeroBalance, finalZeroBalance.toString())
      const { logs: _logs } = await contract.settleTokens(accounts[2])
      assert.equal(_logs.length, 0)
      const _endBalance = await contract.balanceOf(accounts[2])
      assert.equal(endBalance.toString(), _endBalance.toString())
    })

    it('should refund wei for failed round', async () => {
      let startOffset = 0
      let newNow = now()
      // run a round that the test contributor doesn't participate in
      {
        const { roundIndex, minWei, auctionStart, auctionEnd } = await createRound(accounts[0])
        startOffset += 10 + +auctionStart - now()
        await timeMachine.advanceTimeAndBlock(10 + +auctionStart - now())
        newNow += 10 + +auctionStart - now()
        // contribute some
        const contributionWei = (+minWei - 10).toString()
        await contract.contribute(roundIndex, {
          from: accounts[5],
          value: contributionWei,
        })
        startOffset += 10 + +auctionEnd - now()
        newNow += 10 + +auctionEnd - now()
        await timeMachine.advanceTimeAndBlock(10 + +auctionEnd - now())
        await contract.finishRound(roundIndex, {
          from: accounts[4],
        })
      }
      const { roundIndex, minWei, auctionStart, auctionEnd } = await createRound(accounts[0], startOffset)
      await timeMachine.advanceTimeAndBlock(10 + +auctionStart - newNow)
      // contribute some
      const contributionWei = (+minWei - 10).toString()
      await contract.contribute(roundIndex, {
        from: accounts[2],
        value: contributionWei,
      })
      await timeMachine.advanceTimeAndBlock(10 + +auctionEnd - newNow)
      const startBalance = await web3.eth.getBalance(accounts[2])
      await contract.finishRound(roundIndex, {
        from: accounts[4],
      })
      const { logs } = await contract.settleTokens(accounts[2], {
        from: accounts[4]
      })
      assert.equal(logs.length, 0)
      const expectedBalance = new BN(startBalance).add(new BN(contributionWei)).toString()
      const endBalance = await web3.eth.getBalance(accounts[2])
      assert.equal(expectedBalance.toString(), endBalance.toString())
    })
  })
})
