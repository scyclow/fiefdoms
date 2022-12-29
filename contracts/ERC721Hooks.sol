// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

import "./Dependencies.sol";

interface IERC721Hooks {
    function _beforeTransfer(address from, address to, uint256 tokenId) external;
    function _beforeMint(address to, uint256 tokenId) external;
    function _beforeBurn(address from, uint256 tokenId) external;
    function _beforeApprove(address to, uint256 tokenId) external;
    function _beforeSetApprovalForAll(address operator, bool approved) external;
}

contract ERC721HooksBase is IERC721Hooks {
    address public parent;

    constructor(address _parent) {
        parent = _parent;
    }

    modifier onlyParent() {
        require(msg.sender == parent, "Only parent ERC721 can call hooks");
        _;
    }

    function beforeTransfer(address from, address to, uint256 tokenId) internal virtual {}
    function _beforeTransfer(address from, address to, uint256 tokenId) external onlyParent {
        beforeTransfer(from, to, tokenId);
    }

    function beforeMint(address to, uint256 tokenId) internal virtual {}
    function _beforeMint(address to, uint256 tokenId) external onlyParent {
        beforeMint(to, tokenId);
    }

    function beforeBurn(address from, uint256 tokenId) internal virtual {}
    function _beforeBurn(address from, uint256 tokenId) external onlyParent {
        beforeBurn(from, tokenId);
    }

    function beforeApprove(address to, uint256 tokenId) internal virtual {}
    function _beforeApprove(address to, uint256 tokenId) external onlyParent {
        beforeApprove(to, tokenId);
    }

    function beforeSetApprovalForAll(address operator, bool approved) internal virtual {}
    function _beforeSetApprovalForAll(address operator, bool approved) external onlyParent {
        beforeSetApprovalForAll(operator, approved);
    }
}
