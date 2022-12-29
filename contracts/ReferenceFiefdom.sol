// SPDX-License-Identifier: MIT



import "./BaseTokenURI.sol";
import "./ERC721Hooks.sol";
import "./Dependencies.sol";


pragma solidity ^0.8.11;

interface IBaseContract {
  function ownerOf(uint256 tokenId) external view returns (address owner);
  function defaultTokenURIContract() external view returns (address tokenURIContract);
}

interface ITokenURI {
  function tokenURI(uint256 tokenId) external view returns (string memory uri);
}

contract ReferenceFiefdom is Initializable, ERC721 {
  using Strings for uint256;

  string public license;
  IBaseContract public overlord;
  ITokenURI public tokenURIContract;
  IERC721Hooks public erc721Hooks;
  address public minter;
  uint256 public fiefdom;
  bool public isActivated;

  uint256 private _totalSupply;
  uint256 private _maxSupply;
  string private _name;
  string private _symbol;
  bool private _isActivated;
  address private _royaltyBeneficiary;
  uint16 private _royaltyBasisPoints;

  event ProjectEvent(address indexed poster, string indexed eventType, string content);
  event TokenEvent(address indexed poster, uint256 indexed tokenId, string indexed eventType, string content);

  // This is only called when the reference contract is published
  constructor() ERC721('', '') {
    initialize(msg.sender, 0);
  }

  // This is called by the proxy contract when *it* is published
  // Mints token 0 and does not set a name/symbol
  function initialize(address _overlord, uint256 _fiefdomTokenId) public initializer {
    // Since constructor is not called (or called the first time with empty values)
    _name = string(abi.encodePacked('Fiefdom ', _fiefdomTokenId.toString()));
    _symbol = string(abi.encodePacked('FIEF', _fiefdomTokenId.toString()));
    overlord = IBaseContract(_overlord);
    fiefdom = _fiefdomTokenId;

    _totalSupply = 1;
    _mint(address(this), 0);
  }

  // Instantiates the project beyond the 0th mint
  function activate(
    string memory name_,
    string memory symbol_,
    uint256 maxSupply_,
    address tokenURIContract_
  ) public onlyOwner {
    // Require that it can only be called once
    require(!isActivated);

    // Set the name/symbol
    _name = name_;
    _symbol = symbol_;

    // Set the max token supply
    _maxSupply = maxSupply_;

    // Set the defailt minter address + ERC2981 royalty beneficiary
    minter = msg.sender;
    _royaltyBeneficiary = msg.sender;
    _royaltyBasisPoints = 1000;

    // Create a default TokenURI contract that points to a baseURI

    tokenURIContract = ITokenURI(tokenURIContract_);
    isActivated = true;

    license = 'CC BY-NC 4.0';

    // Recover the 0th token
    _transfer(address(this), msg.sender, 0);
  }

  function activateWitHooks(
    string memory name_,
    string memory symbol_,
    uint256 maxSupply_,
    address tokenURIContract_,
    bytes memory hooksContractBytecode
  ) public onlyOwner {
    activate(name_, symbol_, maxSupply_, tokenURIContract_);
    address _erc721Hooks;
    assembly {
      _erc721Hooks := create(0, add(hooksContractBytecode, 0x20), mload(hooksContractBytecode))
    }
    erc721Hooks = IERC721Hooks(_erc721Hooks);
    erc721Hooks._setParent();
  }


  // Register hooks
  function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal virtual override {
    if (address(erc721Hooks) == address(0)) return;
    if (from != address(0) && to != address(0)) {
      erc721Hooks._beforeTransfer(from, to, tokenId);
    } else if (to != address(0)) {
      erc721Hooks._beforeMint(to, tokenId);
    } else if (from != address(0)) {
      erc721Hooks._beforeBurn(from, tokenId);
    }
    revert("from and to are both zero");
  }

  function approve(address to, uint256 tokenId) public virtual override {
    if (address(erc721Hooks) != address(0)) erc721Hooks._beforeApprove(to, tokenId);
    super.approve(to, tokenId);
  }

  function setApprovalForAll(address operator, bool approved) public virtual override {
    if (address(erc721Hooks) != address(0)) erc721Hooks._beforeSetApprovalForAll(operator, approved);
    super.setApprovalForAll(operator, approved);
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

  function name() public view virtual override(ERC721) returns (string memory) {
   return  _name;
  }

  function symbol() public view virtual override(ERC721) returns (string memory) {
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
      owner() == _msgSender() || ERC721.ownerOf(tokenId) == _msgSender(),
      'Only project or token owner can emit token event'
    );
    emit TokenEvent(_msgSender(), tokenId, eventType, content);
  }

  function emitProjectEvent(string calldata eventType, string calldata content) external onlyOwner {
    emit ProjectEvent(_msgSender(), eventType, content);
  }


  // Token URI
  function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    address addr = address(tokenURIContract) == address(0)
      ? overlord.defaultTokenURIContract()
      : address(tokenURIContract);

    return ITokenURI(addr).tokenURI(tokenId);
  }

  function setTokenURIContract(address _tokenURIContract) external onlyOwner {
    tokenURIContract = ITokenURI(_tokenURIContract);
  }

  // Contract owner actions
  function updateLicense(string calldata newLicense) external onlyOwner {
    license = newLicense;
  }

  // Royalty Info
  function setRoyaltyInfo(
    address royaltyBeneficiary,
    uint16 royaltyBasisPoints
  ) external onlyOwner {
    _royaltyBeneficiary = royaltyBeneficiary;
    _royaltyBasisPoints = royaltyBasisPoints;
  }

  function setMinter(address newMinter) external onlyOwner {
    minter = newMinter;
  }

  function royaltyInfo(uint256, uint256 _salePrice) external view returns (address, uint256) {
    return (_royaltyBeneficiary, _salePrice * _royaltyBasisPoints / 10000);
  }

  function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721) returns (bool) {
    // ERC2981
    return interfaceId == bytes4(0x2a55205a) || super.supportsInterface(interfaceId);
  }
}

