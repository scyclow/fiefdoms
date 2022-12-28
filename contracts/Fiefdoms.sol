// SPDX-License-Identifier: MIT

import "./Dependencies.sol";
import "./TokenURI.sol";
import "./ProxyFiefdom.sol";
import "./ReferenceFiefdom.sol";

pragma solidity ^0.8.11;


contract Fiefdoms is ERC721, Ownable {
  string public license = 'CC BY-NC 4.0';

  mapping(uint256 => address) public tokenIdToFiefdom;

  TokenURI private _tokenURIContract;
  uint256 private _totalSupply = 1;

  uint256 private _parentTokenId;

  address private minter;
  address private royaltyBeneficiary;
  uint16 private royaltyBasisPoints = 1000;

  address public referenceContract;

  event ProjectEvent(address indexed poster, string indexed eventType, string content);
  event TokenEvent(address indexed poster, uint256 indexed tokenId, string indexed eventType, string content);

  bool public useAllowList = true;
  mapping(address => bool) public allowList;

  // SETUP
  constructor() ERC721('Fiefdoms', 'FIEF') {
    minter = msg.sender;
    royaltyBeneficiary = msg.sender;
    _tokenURIContract = new TokenURI('ipfs//....');

    // Publish a reference contract. All proxy contracts will derive its functionality from this
    referenceContract = address(new ReferenceFiefdom());

    // Token 0 will use the reference contract directly instead of a proxy
    _mint(msg.sender, 0);

    tokenIdToFiefdom[0] = referenceContract;
  }


  // BASE FUNCTIONALITY
  function totalSupply() external view returns (uint256) {
    return _totalSupply;
  }

  function exists(uint256 tokenId) external view returns (bool) {
    return _exists(tokenId);
  }

  function mint(address to) external {
    require(minter == msg.sender, 'Caller is not the minting address');

    _mint(to, _totalSupply);

    // Publish a new proxy contract for this token
    ProxyFiefdom proxy = new ProxyFiefdom();
    tokenIdToFiefdom[_totalSupply] = address(proxy);

    _totalSupply += 1;
  }

  function mintBatch(address to, uint256 amount) external {
    require(minter == msg.sender, 'Caller is not the minting address');


    for (uint256 i; i < amount; i++) {
      _mint(to, _totalSupply + i);
      ProxyFiefdom proxy = new ProxyFiefdom();
      tokenIdToFiefdom[_totalSupply + i] = address(proxy);
    }

    _totalSupply += amount;
  }

  function _transfer(
    address from,
    address to,
    uint256 tokenId
  ) internal virtual override {
    // When this token is transferred, also transfer ownership over its fiefdom
    ReferenceFiefdom(tokenIdToFiefdom[tokenId]).transferOwnership(from, to);
    return super._transfer(from, to, tokenId);
  }

  // ROYALTIES


  // Fiefdoms may collect their own royalties withotu restriction, but must follow the rules of the broader kingdom
  function getApproved(uint256 tokenId) public view virtual override returns (address) {
    address operator = super.getApproved(tokenId);
    if (useAllowList) require(allowList[operator], 'Operator must be on Allow List');
    return operator;
  }

  // Fiefdoms may collect their own royalties withotu restriction, but must follow the rules of the broader kingdom
  function isApprovedForAll(address owner, address operator) public view virtual override returns (bool) {
    if (useAllowList) require(allowList[operator], 'Operator must be on Allow List');
    return super.isApprovedForAll(owner, operator);
  }


  function updateUseAllowList(bool _useAllowList) external onlyOwner {
    useAllowList = _useAllowList;
  }

  function updateAllowList(address operator, bool isALed) external onlyOwner {
    allowList[operator] = isALed;
  }

  function setRoyaltyInfo(
    address _royaltyBenificiary,
    uint16 _royaltyBasisPoints
  ) external onlyOwner {
    royaltyBeneficiary = _royaltyBenificiary;
    royaltyBasisPoints = _royaltyBasisPoints;
  }

  function royaltyInfo(uint256, uint256 _salePrice) external view returns (address, uint256) {
    return (royaltyBeneficiary, _salePrice * royaltyBasisPoints / 10000);
  }

  function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721) returns (bool) {
    // ERC2981 & ERC4906
    return interfaceId == bytes4(0x2a55205a) || interfaceId == bytes4(0x49064906) || super.supportsInterface(interfaceId);
  }


  // Token URI
  function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    return _tokenURIContract.tokenURI(tokenId);
  }

  function setTokenURIContract(address _tokenURIAddress) external onlyOwner {
    _tokenURIContract = TokenURI(_tokenURIAddress);
  }

  function tokenURIContract() external view returns (address) {
    return address(_tokenURIContract);
  }


  // Events
  function emitTokenEvent(uint256 tokenId, string calldata eventType, string calldata content) external {
    require(
      owner() == _msgSender() || ERC721.ownerOf(tokenId) == _msgSender(),
      'Only project or token owner can emit token event'
    );
    emit TokenEvent(_msgSender(), tokenId, eventType, content);
  }

  function emitProjectEvent(string calldata eventType, string calldata content) external onlyOwner {
    emit ProjectEvent(_msgSender(), eventType, content);
  }


  // Contract owner actions
  function updateLicense(string calldata newLicense) external onlyOwner {
    license = newLicense;
  }

  function setMinter(address newMinter) external onlyOwner {
    minter = newMinter;
  }
}

