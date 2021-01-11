const dividendTokenTest = artifacts.require('DividendTokenTest')
const assert = require('assert')
const timeMachine = require('ganache-time-traveler')
const BN = require('bn.js')

contract('DividendToken tests', async accounts => {

  let snapshotId
  beforeEach(async () => {
    const { result } = await timeMachine.takeSnapshot()
    snapshotId = result
  })

  afterEach(async () => {
    await timeMachine.revertToSnapshot(snapshotId)
  })

  let contract
  before('Load variables', async () => {
    contract = await dividendTokenTest.deployed()
  })

  describe('payment', () => {
    it('should fail for zero value', async () => {
      try {
        await web3.eth.sendTransaction({
          from: accounts[5],
          to: contract.address,
          value: '0',
        })
        assert(false)
      } catch (err) {
        assert(true)
      }
    })
  })

  describe('owed balance', () => {
    it('should be 100% of sent funds', async () => {
      const _owedBalance = await contract.owedBalance(accounts[0])
      assert.equal(_owedBalance.toString(), '0')
      const value = '1000'
      await web3.eth.sendTransaction({
        from: accounts[5],
        to: contract.address,
        value,
        gas: '200000',
      })
      const owedBalance = await contract.owedBalance(accounts[0])
      assert.equal(owedBalance.toString(), value)
    })

    it('should split funds', async () => {
      const _balance = await contract.balanceOf(accounts[0])
      const _amount = +_balance / 20
      const result = await contract.transfer(accounts[1], _amount.toString(), {
        from: accounts[0],
      })
      assert(result)
      const [ balance0, balance1 ] = await Promise.all([
        contract.balanceOf(accounts[0]),
        contract.balanceOf(accounts[1]),
      ])
      const value = '10000'
      await web3.eth.sendTransaction({
        from: accounts[5],
        to: contract.address,
        value,
        gas: '200000',
      })
      const expected0Dividend = +value * +balance0 / +_balance
      const expected1Dividend = +value * +balance1 / +_balance
      const owedBalance0 = await contract.owedBalance(accounts[0])
      const owedBalance1 = await contract.owedBalance(accounts[1])
      assert.equal(expected0Dividend.toString(), owedBalance0.toString())
      assert.equal(expected1Dividend.toString(), owedBalance1.toString())
    })

    it('should split funds using transferFrom', async () => {
      const _balance = await contract.balanceOf(accounts[0])
      const _amount = +_balance / 20
      await contract.approve(accounts[2], _amount, {
        from: accounts[0],
      })
      const result = await contract.transferFrom(accounts[0], accounts[1], _amount.toString(), {
        from: accounts[2],
      })
      assert(result)
      const [ balance0, balance1 ] = await Promise.all([
        contract.balanceOf(accounts[0]),
        contract.balanceOf(accounts[1]),
      ])
      const value = '10000'
      await web3.eth.sendTransaction({
        from: accounts[5],
        to: contract.address,
        value,
        gas: '200000',
      })
      const expected0Dividend = +value * +balance0 / +_balance
      const expected1Dividend = +value * +balance1 / +_balance
      const owedBalance0 = await contract.owedBalance(accounts[0])
      const owedBalance1 = await contract.owedBalance(accounts[1])
      assert.equal(expected0Dividend.toString(), owedBalance0.toString())
      assert.equal(expected1Dividend.toString(), owedBalance1.toString())
    })

    it('should distribute multiple payments', async () => {
      const value = '10000'
      await web3.eth.sendTransaction({
        from: accounts[5],
        to: contract.address,
        value,
        gas: '200000',
      })
      const balance = await contract.balanceOf(accounts[0])
      await contract.transfer(accounts[1], +balance.toString() / 2, {
        from: accounts[0],
      })
      await web3.eth.sendTransaction({
        from: accounts[5],
        to: contract.address,
        value,
        gas: '200000',
      })
      {
        const owed0 = await contract.owedBalance(accounts[0])
        const expectedOwed0 = +value + +value/2
        assert.equal(owed0.toString(), expectedOwed0.toString())
        const owed1 = await contract.owedBalance(accounts[1])
        const expectedOwed1 = +value/2
        assert.equal(owed1.toString(), expectedOwed1.toString())
      }
      const balance1 = await contract.balanceOf(accounts[1])
      await contract.transfer(accounts[2], +balance1.toString() / 2, {
        from: accounts[1],
      })
      await web3.eth.sendTransaction({
        from: accounts[5],
        to: contract.address,
        value,
        gas: '200000',
      })
      {
        const owed0 = await contract.owedBalance(accounts[0])
        const expectedOwed0 = +value + +value/2 + +value/2
        assert.equal(owed0.toString(), expectedOwed0.toString())
        const owed1 = await contract.owedBalance(accounts[1])
        const expectedOwed1 = +value/2 + +value/4
        assert.equal(owed1.toString(), expectedOwed1.toString())
        const owed2 = await contract.owedBalance(accounts[2])
        const expectedOwed2 = +value/4
        assert.equal(owed2.toString(), expectedOwed2.toString())
      }
    })
  })

  describe('payout', () => {
    it('should payout once', async () => {
      const value = '1000'
      await web3.eth.sendTransaction({
        from: accounts[5],
        to: contract.address,
        value,
        gas: '200000',
      })
      const owedBalance = await contract.owedBalance(accounts[0])
      assert.equal(owedBalance.toString(), value)
      const startBalance = await web3.eth.getBalance(accounts[0])
      await contract.payout(accounts[0], {
        from: accounts[5],
      })
      const expectedBalance = new BN(startBalance).add(owedBalance).toString()
      const finalBalance = await web3.eth.getBalance(accounts[0])
      assert.equal(finalBalance.toString(), expectedBalance.toString())
      await contract.payout(accounts[0], {
        from: accounts[5],
      })
      const _finalBalance = await web3.eth.getBalance(accounts[0])
      assert.equal(_finalBalance.toString(), finalBalance.toString())
    })

    it('should payout no value', async () => {
      const value = '1000'
      await web3.eth.sendTransaction({
        from: accounts[5],
        to: contract.address,
        value,
        gas: '200000',
      })
      await contract.transfer(accounts[1], '100', {
        from: accounts[0],
      })
      await contract.methods['payout()']({
        from: accounts[1],
      })
      const finalContractBalance = await web3.eth.getBalance(contract.address)
      assert.equal(finalContractBalance.toString(), value)
    })
  })

  describe('erc20', () => {
    it('should return string name', async () => {
      const name = await contract.name()
      assert(typeof name === 'string' && name.length > 0)
    })

    it('should return string symbol', async () => {
      const symbol = await contract.symbol()
      assert(typeof symbol === 'string' && symbol.length > 0)
    })

    it('should return decimals', async () => {
      const decimals = +(await contract.decimals()).toString()
      assert(decimals >= 0 && decimals <= 18)
    })

    it('should return totalSupply', async () => {
      const supply = +(await contract.totalSupply()).toString()
      assert(!isNaN(supply))
    })

    it('should approve spender', async () => {
      const allowance = '100'
      const { logs } = await contract.approve(accounts[1], allowance, {
        from: accounts[0],
      })
      const _allowance = await contract.allowance(accounts[0], accounts[1])
      assert.equal(allowance, _allowance.toString())
      assert.equal(logs.length, 1)
      assert.equal(logs[0].event, 'Approval')
      assert.equal(logs[0].args.owner, accounts[0])
      assert.equal(logs[0].args.spender, accounts[1])
      assert.equal(logs[0].args.value, allowance)
    })

    it('should fail to spend more than allowance', async () => {
      const allowance = '100'
      await contract.approve(accounts[1], allowance, {
        from: accounts[0],
      })
      try {
        await contract.transferFrom(accounts[0], accounts[2], (+allowance + 1).toString(), {
          from: accounts[1],
        })
        assert(false)
      } catch (err) {
        assert.equal(err.reason, 'Insufficient approval')
      }
    })

    it('should fail to spend more than balance', async () => {
      const allowance = new BN(await contract.balanceOf(accounts[0])).add(new BN('1'))
      await contract.approve(accounts[1], allowance, {
        from: accounts[0],
      })
      try {
        await contract.transferFrom(accounts[0], accounts[2], allowance, {
          from: accounts[1],
        })
        assert(false)
      } catch (err) {
        assert.equal(err.reason, 'Insufficient balance')
      }
      try {
        await contract.transfer(accounts[4], allowance, {
          from: accounts[0],
        })
        assert(false)
      } catch (err) {
        assert.equal(err.reason, 'Insufficient balance')
      }
    })

    it('should transfer', async () => {
      const amount = '1'
      const { logs } = await contract.transfer(accounts[1], amount, {
        from: accounts[0],
      })
      assert.equal(logs.length, 1)
      assert.equal(logs[0].event, 'Transfer')
      assert.equal(logs[0].args.from, accounts[0])
      assert.equal(logs[0].args.to, accounts[1])
      assert.equal(logs[0].args.value, amount)
      const balance = await contract.balanceOf(accounts[1])
      assert.equal(balance.toString(), amount)
    })

    it('should transfer allowance', async () => {
      const totalAmount = '10'
      const amount = '5'
      await contract.approve(accounts[9], totalAmount, {
        from: accounts[0],
      })
      const { logs } = await contract.transferFrom(accounts[0], accounts[1], amount, {
        from: accounts[9],
      })
      assert.equal(logs.length, 1)
      assert.equal(logs[0].event, 'Transfer')
      assert.equal(logs[0].args.from, accounts[0])
      assert.equal(logs[0].args.to, accounts[1])
      assert.equal(logs[0].args.value, amount)
      const balance = await contract.balanceOf(accounts[1])
      assert.equal(balance.toString(), amount)
      {
        const allowance = await contract.allowance(accounts[0], accounts[9])
        assert.equal(allowance.toString(), (+totalAmount - +amount).toString())
      }
      await contract.transferFrom(accounts[0], accounts[1], +totalAmount - +amount, {
        from: accounts[9],
      })
      {
        const allowance = await contract.allowance(accounts[0], accounts[9])
        assert.equal(allowance.toString(), '0')
      }
    })
  })
})
