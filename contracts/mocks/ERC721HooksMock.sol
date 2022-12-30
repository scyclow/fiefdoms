// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

import "../ERC721Hooks.sol";

contract ERC721HooksMock is ERC721HooksBase {
    constructor (address _parent) ERC721HooksBase(_parent) {}

    event BeforeTokenTransferHookCalled(address from, address to, uint256 tokenId);
    event BeforeApproveHookCalled(address to, uint256 tokenId);
    event BeforeSetApprovalForAllHookCalled(address operator, bool approved);

    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal override {
        emit BeforeTokenTransferHookCalled(from, to, tokenId);
    }

    function _beforeApprove(address to, uint256 tokenId) internal override {
        emit BeforeApproveHookCalled(to, tokenId);
    }

    function _beforeSetApprovalForAll(address operator, bool approved) internal override {
        emit BeforeSetApprovalForAllHookCalled(operator, approved);
    }
}
