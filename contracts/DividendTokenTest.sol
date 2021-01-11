import "./DividendToken.sol";

contract DividendTokenTest is DividendToken {
  constructor(address owner) DividendToken() {
    _totalSupply = 100000;
    balances[owner] = 100000;
    postTransfer(address(0), owner);
  }
}
