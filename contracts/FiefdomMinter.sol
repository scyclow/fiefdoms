// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

interface IFiefdomsKingdom {
  function mintBatch(address to, uint256 amount) external;
  function mint(address to) external;
}

contract FiefdomsMinter {
  IFiefdomsKingdom public fiefdomsKingdom;
  constructor(address addr) {
    fiefdomsKingdom = IFiefdomsKingdom(addr);
  }

  function mintBatch(address to, uint256 amount) external {
    fiefdomsKingdom.mintBatch(to, amount);
  }

  function mint(address to) external {
    fiefdomsKingdom.mint(to);
  }
}
