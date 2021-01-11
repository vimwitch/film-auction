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
})
