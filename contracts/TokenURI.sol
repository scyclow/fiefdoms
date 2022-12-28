// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

import "./Dependencies.sol";

contract TokenURI {
  using Strings for uint256;

  string public baseURI;
  constructor(string memory _baseURI) {
    baseURI = _baseURI;
  }

  function tokenURI(uint256 tokenId) external view returns (string memory) {
    return string(abi.encodePacked(baseURI, tokenId.toString(), '.json'));
  }
}
