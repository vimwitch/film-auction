// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.0;

abstract contract IERC20 {
  event Approval(address indexed owner, address indexed spender, uint value);
  event Transfer(address indexed from, address indexed to, uint value);

  function name() external virtual view returns (string memory);
  function symbol() external virtual view returns (string memory);
  function decimals() external virtual view returns (uint8);
  function totalSupply() external virtual view returns (uint);
  function balanceOf(address owner) external virtual view returns (uint);
  function allowance(address owner, address spender) external virtual view returns (uint);

  function approve(address spender, uint value) external virtual returns (bool);
  function transfer(address to, uint value) external virtual returns (bool);
  function transferFrom(address from, address to, uint value) external virtual returns (bool);
}
