// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;



import "./Dependencies.sol";

interface IParent {
  function totalSupply() external view returns (uint256);
  function referenceContract() external view returns (address);
}
contract ProxyFiefdom is Proxy {
  bytes32 internal constant _IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

  struct AddressSlot {
    address value;
  }

  function getAddressSlot(bytes32 slot) internal pure returns (AddressSlot storage r) {
    assembly {
      r.slot := slot
    }
  }

  function _implementation() internal override view returns (address) {
    return getAddressSlot(_IMPLEMENTATION_SLOT).value;
  }

  function implementation() public view returns (address) {
    return _implementation();
  }

  // Defer all functionality to the given reference contract
  constructor() {
    address referenceContract = IParent(msg.sender).referenceContract();
    uint256 parentTokenId = IParent(msg.sender).totalSupply();
    getAddressSlot(_IMPLEMENTATION_SLOT).value = referenceContract;

    // Invoke the preInitialize function on itself, as defined by the reference contract
    Address.functionDelegateCall(
        referenceContract,
        abi.encodeWithSignature("preInitialize(address,uint256)", msg.sender, parentTokenId),
        "Address: low-level delegate call failed"
    );
  }
}
