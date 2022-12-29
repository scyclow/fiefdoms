// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

import "./Dependencies.sol";
import "./Fiefdoms.sol";
import "./ReferenceFiefdom.sol";

contract BaseTokenURI {
  using Strings for uint256;

  Fiefdoms private immutable fiefdoms;

  constructor() {
    fiefdoms = Fiefdoms(msg.sender);
  }

  function tokenURI(uint256 tokenId) external view returns (string memory) {
    bytes memory name = abi.encodePacked('Fiefdom Vassal #', tokenId.toString());
    address fiefdomAddr = fiefdoms.tokenIdToFiefdom(tokenId);
    bool isActivated = ReferenceFiefdom(fiefdomAddr).isActivated();
    string memory pColor = isActivated ? '#fff' : '#000';
    string memory sColor = isActivated ? '#000' : '#fff';

    bytes memory background = abi.encodePacked(
      '<rect x="0" y="0" width="100%" height="100%" fill="', pColor,'"/>',
      '<rect x="23.78px" y="23.78px" width="1141.44" height="793.44px" stroke="', sColor,'" stroke-width="2"/>'
    );

    bytes memory textName = abi.encodePacked(
      '<text x="50%" y="47%" font-size="105px" fill="',
      sColor,
      '" dominant-baseline="middle" text-anchor="middle">',
      name,
      '</text>'
    );

    bytes memory textAddr = abi.encodePacked(
      '<text x="50%" y="58%" font-size="42px" fill="', sColor,'" font-family="monospace" dominant-baseline="middle" text-anchor="middle">',
      fiefdomAddr,
      '</text>'
    );

    bytes memory encodedImage = abi.encodePacked(
      '"data:image/svg+xml;base64,',
      Base64.encode(abi.encodePacked(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1189 841">',
        background,
        textName,
        textAddr,
        '</svg>'
      )),
      '"'
    );


    bytes memory json = abi.encodePacked(
      'data:application/json;utf8,',
      '{"name": "', name,'",',
      '"description": "Vassal of ', name, ' - ', fiefdomAddr ,'",',
      '"image": ', encodedImage,
      '}'
    );
    return string(json);
  }
}
