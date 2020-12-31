const FilmAuction = artifacts.require('FilmAuction')

module.exports = function (deployer, _, accounts) {
  deployer.deploy(FilmAuction, accounts[0])
}
