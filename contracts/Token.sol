pragma solidity ^0.7.0;

import "./IERC20.sol";

contract Token is IERC20 {
  uint _totalSupply = 0;

  mapping (address => uint) balances;
  mapping (address => mapping (address => uint)) approvals;

  function name() public override view returns (string memory) {
    return "health"
  }

  function symbol() public override view returns (string memory) {
    return 'HLT'
  }

  function decimals() public override view returns (uint8) {
    return 16;
  }

  function totalSupply() public override view returns (uint) {
    return _totalSupply;
  }

  function balanceOf(address owner) public override view returns (uint) {
    return balances[owner];
  }

  function allowance(address owner, address spender) public override view returns (uint) {
    return approvals[owner][spender];
  }

  function approve(address spender, uint value) public override returns (bool) {
    approvals[msg.sender][spender] = value;
    emit Approval(msg.sender, spender, value);
    return true;
  }

  function transfer(address to, uint value) public override returns (bool) {
    require(balances[msg.sender] >= value, "Insufficient balance");
    balances[msg.sender] -= value;
    balances[to] += value;
    emit Transfer(msg.sender, to, value);
    return true;
  }

  function transferFrom(address from, address to, uint value) public override returns (bool) {
    require(approvals[from][msg.sender] >= value, "Insufficient approval");
    require(balances[from] >= value, "Insufficient balance");
    approvals[from][msg.sender] -= value;
    balances[from] -= value;
    balances[to] += value;
    emit Transfer(from, to, value);
    return true;
  }
}
