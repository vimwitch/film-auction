// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.7.0;

import "./DividendToken.sol";

contract DividendTokenTest is DividendToken {
  constructor(address owner) DividendToken() {
    _totalSupply = 100000;
    balances[owner] = 100000;
    postTransfer(address(0), owner);
  }
}
