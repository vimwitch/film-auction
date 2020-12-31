// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.7.0;

// Vote on the publish or sale of the art
// Anything not voted on is an illegal distribution of the art

import "./Token.sol";

contract FilmAuction is Token {
  struct AuctionRound {
    uint minWei;
    uint maxWei;
    uint actualWei;
    uint startTime;
    uint endTime;
    bool success;
    bool finished;
  }

  AuctionRound[] rounds;
  mapping (uint => mapping (address => uint)) contributionsByRound;
  mapping (address => uint) settledIndexes;
  mapping (address => bool) creators;
  mapping (address => uint) owners;

  uint public totalBalance = 0;

  uint public constant MIN_AUCTION_LENGTH = 3 days;
  uint public constant MIN_AUCTION_LEAD_TIME = 3 days;

  uint public creatorCount;
  uint public maxGasPrice = 200 * 10**9;
  uint public maxContribution = 1 ether;

  // 5% of all created tokens go to original creator
  uint public constant OWNER_FACTOR = 20;
  address immutable originalCreator;

  constructor(address payable _originalCreator) {
    originalCreator = _originalCreator;
    creators[_originalCreator] = true;
    creatorCount = 1;
    rounds.push(AuctionRound({
      minWei: 0,
      maxWei: 1,
      actualWei: 0,
      startTime: 0,
      endTime: 1,
      success: true,
      finished: true
    }));
  }

  function finished() public view returns (bool) {
    return creatorCount == 0;
  }

  function addCreator(address newCreator) public {
    require(creators[msg.sender]);
    creators[newCreator] = true;
    creatorCount++;
  }

  function removeCreator(address oldCreator) public {
    require(creators[msg.sender]);
    creators[oldCreator] = false;
    creatorCount--;
  }

  function setMaxGasPrice(uint price) public {
    require(creators[msg.sender]);
    maxGasPrice = price;
  }

  function setMaxContribution(uint amount) public {
    require(creators[msg.sender]);
    maxContribution = amount;
  }

  function createAuctionRound(uint minWei, uint maxWei, uint startTime, uint endTime) public {
    require(creators[msg.sender], "You must be a creator");
    require(startTime > rounds[rounds.length - 1].endTime, "Auction overlap not allowed");
    require(endTime > startTime, "Invalid timing");
    require(endTime - startTime >= MIN_AUCTION_LENGTH, "Invalid auction length");
    require(startTime > block.timestamp, "Start time is in past");
    require(startTime - block.timestamp >= MIN_AUCTION_LEAD_TIME, "Too close to start time");
    require(maxWei > minWei, "Invalid target amounts");
    require(minWei > OWNER_FACTOR, "Invalid min wei");
    rounds.push(AuctionRound({
      minWei: minWei,
      maxWei: maxWei,
      actualWei: 0,
      startTime: startTime,
      endTime: endTime,
      success: false,
      finished: false
    }));
  }

  function settleTokens() public {
    uint lastSettled = settledIndexes[msg.sender];
    uint refundAmount = 0;
    uint tokenAmount = 0;
    uint latestSettledIndex = lastSettled;
    for (uint x = lastSettled + 1; x < rounds.length; x++) {
      if (!rounds[x].finished) break;
      uint amount = contributionsByRound[x][msg.sender];
      if (amount == 0) {
        latestSettledIndex = x;
        continue;
      }
      if (rounds[x].success) {
        tokenAmount += amount;
      } else {
        refundAmount += amount;
      }
      latestSettledIndex = x;
    }
    settledIndexes[msg.sender] = latestSettledIndex;
    if (tokenAmount != 0) {
      balances[msg.sender] += tokenAmount;
      balances[address(0)] -= tokenAmount;
      emit Transfer(address(0), msg.sender, tokenAmount);
    }
    if (refundAmount != 0) {
      msg.sender.transfer(refundAmount);
    }
  }

  function contribute(uint index) public payable {
    require(tx.gasprice <= maxGasPrice, "Gas price too high");
    require(index < rounds.length, "Invalid round index");
    AuctionRound storage round = rounds[index];
    require(block.timestamp >= round.startTime, "Round has not started");
    require(block.timestamp < round.endTime, "Round has ended");
    require(round.actualWei < round.maxWei, "Round max reached");
    require(msg.value > 0, "Invalid contribution value");
    uint amount = min(max(msg.value, round.maxWei - round.actualWei), maxContribution);
    contributionsByRound[index][msg.sender] += amount;
    round.actualWei += amount;
    if (msg.value > amount) {
      // refund excess
      msg.sender.transfer(msg.value - amount);
    }
  }

  function finishRound(uint index) public {
    require(index < rounds.length, "Invalid round index");
    AuctionRound storage round = rounds[index];
    require(block.timestamp > round.endTime || round.actualWei == round.maxWei, "Round has not finished");
    require(!round.finished, "Round already settled");
    round.success = round.actualWei >= round.minWei;
    if (!round.success) return; // ether can be reclaimed
    totalBalance += round.actualWei;
    // mint tokens
    uint ownerIncrease = round.actualWei / OWNER_FACTOR;
    _totalSupply += ownerIncrease + round.actualWei;
    balances[address(0)] += round.actualWei;
    balances[originalCreator] += ownerIncrease;
    emit Transfer(address(0), originalCreator, ownerIncrease);
  }

  function max(uint a, uint b) internal pure returns (uint) {
    return a > b ? a : b;
  }

  function min(uint a, uint b) internal pure returns (uint) {
    return a < b ? a : b;
  }
}
