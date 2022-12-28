// SPDX-License-Identifier: MIT



import "./UpgradeableDependencies.sol";
import "./TokenURI.sol";


pragma solidity ^0.8.11;

interface IBaseContract {
  function ownerOf(uint256) external view returns (address);
}


// TODO on initialize, add optional: mint hook, transfer hook, approval hook, transfer override, approval override

contract ReferenceFiefdom is Initializable, ERC721Upgradeable {
  using Strings for uint256;

  string public license = 'CC BY-NC 4.0';

  TokenURI private _tokenURIContract;
  uint256 private _totalSupply = 1;
  uint256 private _maxSupply = 1;
  string private _name;
  string private _symbol;
  bool private _initialized;

  uint256 public fiefdom;
  IBaseContract public overlord;

  address private minter;
  address private royaltyBeneficiary;
  uint16 private royaltyBasisPoints = 1000;

  event ProjectEvent(address indexed poster, string indexed eventType, string content);
  event TokenEvent(address indexed poster, uint256 indexed tokenId, string indexed eventType, string content);

  // This is only called when the reference contract is published
  constructor() {
    preInitialize(msg.sender, 0);
  }

  // This is called by the proxy contract when *it* is published
  // Mints token 0 and does not set a name/symbol
  function preInitialize(address _overlord, uint256 _fiefdomTokenId) public initializer {
    __ERC721_init(
      string(abi.encodePacked('Fiefdom ', _fiefdomTokenId.toString())),
      string(abi.encodePacked('FIEF', _fiefdomTokenId.toString()))
    );
    overlord = IBaseContract(_overlord);
    fiefdom = _fiefdomTokenId;

    _mint(address(this), 0);
  }

  // Instantiates the project beyond the 0th mint
  function initialize(string memory name_, string memory symbol_, uint256 maxSupply_, string memory baseURI_) external onlyOwner {
    // Require that it can only be called once
    require(!_initialized);

    // Set the name/symbol
    _name = name_;
    _symbol = symbol_;

    // Set the max token supply
    _maxSupply = maxSupply_;

    // Set the defailt minter address + ERC2981 royalty beneficiary
    minter = msg.sender;
    royaltyBeneficiary = msg.sender;

    // Create a default TokenURI contract that points to a baseURI
    _tokenURIContract = new TokenURI(baseURI_);
    _initialized = true;

    // Recover the 0th token
    _transfer(address(this), msg.sender, 0);

  }

  // OWNERSHIP
  event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

  // The owner of this contract is the owner of the corresponding fiefdom token
  function owner() public view virtual returns (address) {
    return overlord.ownerOf(fiefdom);
  }

  modifier onlyOwner() {
    require(owner() == _msgSender(), "Ownable: caller is not the owner");
    _;
  }

  // This is called by the Fiefdoms contract whenever the corresponding fiefdom token is traded
  function transferOwnership(address previousOwner, address newOwner) external {
    require(msg.sender == address(overlord));
    emit OwnershipTransferred(previousOwner, newOwner);
  }

  // VARIABLES

  function name() public view virtual override(ERC721Upgradeable) returns (string memory) {
   return  _name;
  }

  function symbol() public view virtual override(ERC721Upgradeable) returns (string memory) {
    return _symbol;
  }

  function maxSupply() public view returns (uint256) {
    return _maxSupply;
  }


  // BASE FUNCTIONALITY
  function totalSupply() external view returns (uint256) {
    return _totalSupply;
  }


  function exists(uint256 tokenId) external view returns (bool) {
    return _exists(tokenId);
  }

  function mint(address to, uint256 tokenId) external {
    require(minter == msg.sender, 'Caller is not the minting address');

    require(tokenId < _maxSupply, 'Invalid tokenId');
    _mint(to, tokenId);
    _totalSupply += 1;
  }

  // // TODO: what's a good generic interface for this?
  // function mintBatch(address to, uint256 tokenId) external {
  //   require(minter == msg.sender, 'Caller is not the minting address');

  //   require(tokenId < _maxSupply, 'Invalid tokenId');
  //   _mint(to, tokenId);
  //   _totalSupply += 1;
  // }


  // Events
  function emitTokenEvent(uint256 tokenId, string calldata eventType, string calldata content) external {
    require(
      owner() == _msgSender() || ERC721Upgradeable.ownerOf(tokenId) == _msgSender(),
      'Only project or token owner can emit token event'
    );
    emit TokenEvent(_msgSender(), tokenId, eventType, content);
  }

  function emitProjectEvent(string calldata eventType, string calldata content) external onlyOwner {
    emit ProjectEvent(_msgSender(), eventType, content);
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


  // Contract owner actions
  function updateLicense(string calldata newLicense) external onlyOwner {
    license = newLicense;
  }

  // Royalty Info
  function setRoyaltyInfo(
    address _royaltyBenificiary,
    uint16 _royaltyBasisPoints
  ) external onlyOwner {
    royaltyBeneficiary = _royaltyBenificiary;
    royaltyBasisPoints = _royaltyBasisPoints;
  }

  function setMinter(address newMinter) external onlyOwner {
    minter = newMinter;
  }

  function royaltyInfo(uint256, uint256 _salePrice) external view returns (address, uint256) {
    return (royaltyBeneficiary, _salePrice * royaltyBasisPoints / 10000);
  }

  function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721Upgradeable) returns (bool) {
    // ERC2981
    return interfaceId == bytes4(0x2a55205a) || super.supportsInterface(interfaceId);
  }





  // Proxy overrides
  // modifier onlyInternal() {
  //   require(msg.sender == address(this), "Only internal");
  //   _;
  // }

  // // TODO test this + total supply
  // function __burn(uint256 tokenId) external onlyInternal {
  //   _burn(tokenId);
  //   _burnt++;
  // }

  // function __mint(address to, uint256 tokenId) external onlyInternal {
  //   _mint(to, tokenId);
  // }

  // function __approve(address to, uint256 tokenId) external onlyInternal {
  //   _approve(to, tokenId);
  // }

  // function __transfer(address from, address to, uint256 tokenId) external onlyInternal {
  //   _transfer(from, to, tokenId);
  // }

  // function __setApprovalForAll(address owner, address operator, bool approved) external onlyInternal {
  //   _setApprovalForAll(owner, operator, approved);
  // }
}

