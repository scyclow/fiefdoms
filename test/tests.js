const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
const { expectRevert, time, snapshot } = require('@openzeppelin/test-helpers')


const toETH = amt => ethers.utils.parseEther(String(amt))
const num = n => Number(ethers.utils.formatEther(n))

const encodeWithSignature = (functionName, argTypes, params) => {
  const iface = new ethers.utils.Interface([`function ${functionName}(${argTypes.join(',')})`])
  return iface.encodeFunctionData(functionName, params)
}

function times(t, fn) {
  const out = []
  for (let i = 0; i < t; i++) out.push(fn(i))
  return out
}



let signers, fiefdomLord, vassal1
let Fiefdoms, FiefdomsFactory, ReferenceNFTFactory

async function setup () {
  signers = await ethers.getSigners()
  fiefdomLord = signers[0]
  vassal1 = signers[1]



  ReferenceNFTFactory = await ethers.getContractFactory('ReferenceERC721', fiefdomLord)

  FiefdomsFactory = await ethers.getContractFactory('Fiefdoms', fiefdomLord)
  Fiefdoms = await FiefdomsFactory.deploy()
  await Fiefdoms.deployed()

}

const safeTransferFrom = 'safeTransferFrom(address,address,uint256)'


describe('SubwayJesusPamphlets', () => {
  beforeEach(setup)

  describe('constructor', () => {
    it('works', async () => {
      await Fiefdoms.connect(fiefdomLord).mint(fiefdomLord.address)

      const mintedContract = await ReferenceNFTFactory.attach(
        await Fiefdoms.connect(fiefdomLord).tokenIdToAddress(1)
      )

      const ogContract = await ReferenceNFTFactory.attach(
        await Fiefdoms.connect(fiefdomLord).tokenIdToAddress(0)
      )

      expect(await mintedContract.connect(fiefdomLord).parent()).to.equal(Fiefdoms.address)
      expect(Number(await mintedContract.connect(fiefdomLord).parentTokenId())).to.equal(1)
      expect(await mintedContract.connect(fiefdomLord).owner()).to.equal(fiefdomLord.address)

      await Fiefdoms.connect(fiefdomLord)[safeTransferFrom](fiefdomLord.address, vassal1.address, 1)

      expect(await mintedContract.connect(fiefdomLord).owner()).to.equal(vassal1.address)


    })
  })

})
