// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

import "./Dependencies.sol";

interface IERC721Hooks {
<<<<<<< HEAD
    function beforeTokenTransfer(address from, address to, uint256 tokenId) external;
    function beforeApprove(address to, uint256 tokenId) external;
    function beforeSetApprovalForAll(address operator, bool approved) external;
=======
    function _setParent() external;
    function _beforeTransfer(address from, address to, uint256 tokenId) external;
    function _beforeMint(address to, uint256 tokenId) external;
    function _beforeBurn(address from, uint256 tokenId) external;
    function _beforeApprove(address to, uint256 tokenId) external;
    function _beforeSetApprovalForAll(address operator, bool approved) external;
>>>>>>> 2a57a6c (remove upgradeable; add support for hooks contract)
}

contract ERC721HooksBase is IERC721Hooks {
    address public parent;

<<<<<<< HEAD
    constructor(address _parent) {
        parent = _parent;
=======
    function _setParent() external {
        require(parent == address(0), "Parent ERC721 can only be set upon creation");
        parent = msg.sender;
>>>>>>> 2a57a6c (remove upgradeable; add support for hooks contract)
    }

    modifier onlyParent() {
        require(msg.sender == parent, "Only parent ERC721 can call hooks");
        _;
    }

<<<<<<< HEAD
    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal virtual {}
    function beforeTokenTransfer(address from, address to, uint256 tokenId) external onlyParent {
        _beforeTokenTransfer(from, to, tokenId);
    }

    function _beforeApprove(address to, uint256 tokenId) internal virtual {}
    function beforeApprove(address to, uint256 tokenId) external onlyParent {
        _beforeApprove(to, tokenId);
    }

    function _beforeSetApprovalForAll(address operator, bool approved) internal virtual {}
    function beforeSetApprovalForAll(address operator, bool approved) external onlyParent {
        _beforeSetApprovalForAll(operator, approved);
=======
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
>>>>>>> 2a57a6c (remove upgradeable; add support for hooks contract)
    }
}
