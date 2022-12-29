// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

import "./Dependencies.sol";

interface ITokenURI {
  function tokenURI(uint256 tokenId) external view returns (string memory);
}

contract DefaultTokenURI is ITokenURI {
  using Strings for uint256;

  function tokenURI(uint256 tokenId) external view returns (string memory) {
    return '';
  }
}
