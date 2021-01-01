// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.7.0;

import "./Token.sol";

contract DividendToken is Token {
  struct Payment {
    uint128 timestamp;
    address from;
    uint amount;
  }
  mapping (address => uint) lastPaidIndexes;
  mapping (address => mapping (uint => bool)) indexMarked;
  mapping (address => mapping (uint => uint)) roundBalances;
  mapping (uint => uint) totalSupplies;

  Payment[] payments;

  event PaymentReceived(address from, uint amount);

  constructor() {
    payments.push(Payment({
      timestamp: uint128(block.timestamp),
      from: address(0),
      amount: 0
    }));
  }

  receive() external payable {
    require(msg.value > 0);
    require(address(this).balance != 0);
    payments.push(Payment({
      timestamp: uint128(block.timestamp),
      from: msg.sender,
      amount: msg.value
    }));
    totalSupplies[payments.length - 1] = totalSupply();
    emit PaymentReceived(msg.sender, msg.value);
  }

  function payout() public {
    payout(msg.sender);
  }

  // This sends ether to 0x0 if tokens are unclaimed at time of payment
  function payout(address payable owner) public {
    uint owedWei = owedBalance(owner);
    lastPaidIndexes[owner] = payments.length - 1;
    if (owedWei > 0) {
      owner.transfer(owedWei);
    }
  }

  function owedBalance(address payable owner) public view returns (uint) {
    uint latestBalance = 0;
    uint lastPaidIndex = lastPaidIndexes[owner];
    uint owedWei = 0;
    for (uint x = lastPaidIndex + 1; x < payments.length; x++) {
      if (indexMarked[msg.sender][x]) {
        latestBalance = roundBalances[owner][x];
      }
      if (latestBalance == 0) continue;
      owedWei += payments[x].amount * latestBalance / totalSupplies[x];
    }
    return owedWei;
  }

  function postTransfer(address from, address to) internal {
    // store the current balances for dividend calculation
    uint nextPaymentIndex = payments.length;
    roundBalances[from][nextPaymentIndex] = balances[from];
    roundBalances[to][nextPaymentIndex] = balances[to];
    indexMarked[from][nextPaymentIndex] = true;
    indexMarked[to][nextPaymentIndex] = true;
  }

  function transfer(address to, uint amount) public override returns (bool) {
    bool success = super.transfer(to, amount);
    if (success) {
      postTransfer(msg.sender, to);
    }
    return success;
  }

  function transferFrom(address from, address to, uint amount) public override returns (bool) {
    bool success = super.transferFrom(from, to, amount);
    if (success) {
      postTransfer(from, to);
    }
    return success;
  }

}
