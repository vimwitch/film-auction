const FilmAuction = artifacts.require('FilmAuction')
const DividendTokenTest = artifacts.require('DividendTokenTest')

module.exports = function (deployer, _, accounts) {
  deployer.deploy(FilmAuction, accounts[0])
  if (process.env.TEST_CONTRACT) {
    deployer.deploy(DividendTokenTest, accounts[0])
  }
}
