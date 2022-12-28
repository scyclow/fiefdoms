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
let Fiefdoms, FiefdomsFactory, ReferenceFiefdomFactory, ReferenceFiefdom

async function setup () {
  signers = await ethers.getSigners()
  fiefdomLord = signers[0]
  vassal1 = signers[1]

  ReferenceFiefdomFactory = await ethers.getContractFactory('ReferenceFiefdom', fiefdomLord)

  FiefdomsFactory = await ethers.getContractFactory('Fiefdoms', fiefdomLord)
  Fiefdoms = await FiefdomsFactory.deploy()
  await Fiefdoms.deployed()

  ReferenceFiefdom = await ReferenceFiefdomFactory.attach(
    await Fiefdoms.connect(fiefdomLord).tokenIdToFiefdom(0)
  )
}

const safeTransferFrom = 'safeTransferFrom(address,address,uint256)'


describe('Fiefdoms', () => {

  beforeEach(setup)

  describe('happy path', () => {

    it('works', async () => {
      await Fiefdoms.connect(fiefdomLord).mint(fiefdomLord.address)

      const fiefdomContract = await ReferenceFiefdomFactory.attach(
        await Fiefdoms.connect(fiefdomLord).tokenIdToFiefdom(1)
      )

      expect(await fiefdomContract.connect(fiefdomLord).overlord()).to.equal(Fiefdoms.address)
      expect(Number(await fiefdomContract.connect(fiefdomLord).fiefdom())).to.equal(1)
      expect(await fiefdomContract.connect(fiefdomLord).owner()).to.equal(fiefdomLord.address)

      await Fiefdoms.connect(fiefdomLord)[safeTransferFrom](fiefdomLord.address, vassal1.address, 1)

      expect(await fiefdomContract.connect(fiefdomLord).owner()).to.equal(vassal1.address)
    })
  })

  describe('constructor', () => {

    it('should set the default minter/ royaltyBeneficiary', async () => {
      expect(await Fiefdoms.connect(fiefdomLord).minter()).to.equal(fiefdomLord.address)
      const royaltyInfo = await Fiefdoms.connect(admin).royaltyInfo(0, 100)

      expect(royaltyInfo[0]).to.equal(admin.address)
      expect(royaltyInfo[1].toNumber()).to.equal(10)
      expect(await Fiefdoms.connect(fiefdomLord).minter()).to.equal(fiefdomLord.address)
    })

    it('should publish the reference fiefdom', async () => {
      expect(await Fiefdoms.connect(fiefdomLord).referenceContract()).to.not.equal('0x0000000000000000000000000000000000000000')
    })

    it('should mint token 0 to the fiefdom kingdom owner (publisher)', async () => {
      expect(await Fiefdoms.connect(fiefdomLord).balanceOf(0)).to.equal(fiefdomLord.address)

    })

    it('should link token 0 to the reference fiefdom via tokenIdToFiefdom', async () => {})

  })

  describe('tokenURI', () => {

    it('should defer to the tokenURI contract', async () => {})

  })

  describe('setTokenURIContract', () => {

    it('should update the tokenURI contract', async () => {})

    it('should revert if called by the non-owner', async () => {})

  })

  describe('updateLicense', () => {

    it('should update the license', async () => {})

    it('should revert if called by non-owner', async () => {})

  })

  describe('updateRoyaltyInfo', () => {

    it('should update the royalty info', async () => {})

    it('should revert if called by non-owner', async () => {})

  })

  describe('minting', () => {

    it('should revert if not called by the minter', async () => {})

    it('should mint to the correct address', async () => {})

    it('should create a proxy fiefdom, linked to the token via tokenIdToFiefdom', async () => {})

    it('totalSupply/exists should work', async () => {})

    it('setMinter should update the minting address', async () => {})

    it('setMinter revert if called by non-owner', async () => {})

  })

  describe('batchMinting', () => {

    it('should revert if not called by the minter', async () => {})

    it('should mint to the correct number of tokens to the correctaddress', async () => {})

    it('should create a proxy fiefdom, linked to the token via tokenIdToFiefdom, for each token', async () => {})

    it('totalSupply should be update correctly', async () => {})

  })

  describe('transferring', () => {

    it('should work normally, update ownerOf/balanceOf', async () => {})

    it('the fiefdom should emit the OwnershipTransferred event', async () => {})

    it('the new token owner should also be the owner() of the associated fiefdom contract', async () => {})

  })

  describe('allow listing', () => {

    it('should revert if non-owner attempts to add an address to the allowList', async () => {})

    it('should revert if non-owner attempts to turn the allowList off', async () => {})


    describe('allow list is active', () => {

      it('should revert someone tries to approve a non-ALed operator for a single fiefdom token ', async () => {})

      it('should revert someone tries to approve a non-ALed operator for all their fiefdom tokens ', async () => {})

      it('should not revert if someone tries to approve an ALed operator for a single fiefdom token ', async () => {})

      it('should not revert if someone tries to approve an ALed operator for all their fiefdom tokens ', async () => {})

    })

    describe('allow list is inactive', () => {

      it('should revert someone tries to approve a non-ALed operator for a single fiefdom token ', async () => {})

      it('should revert someone tries to approve a non-ALed operator for all their fiefdom tokens ', async () => {})

    })
  })

  describe('ProxyFiefdoms', () => {

    describe('preInitialization', () => {

      it('should store the overlord contract + fiefdom id', async () => {})

      it('should mint the 0th token to itself', async () => {})

      it('should set the name + symbol to the fiefdom id', async () => {})


    })

    describe('initialization', () => {

      it('should reset contract name/symbol', async () => {})

      it('should set maxSupply, ', async () => {})

      it('should set minter/royaltybeneficiary/royaltyBasisPoints, ', async () => {})

      it('should transfer the 0 token to the caller', async () => {})

      it('should publish a default tokenURI contract', async () => {})

      it('should revert if called a second time', async () => {})

      it('should revert if called by non-owner', async () => {})

    })

    describe('owner', () => {

      it('should be the same as the fiefdom token owner', async () => {})

      it('should be the same as the fiefdom token owner after fiefdom token is transferred', async () => {})

      it('transferOwnership should revert if called by anyone other than the overlord', async () => {})

    })

    describe('minting', () => {

      it('should revert if not called by the minter', async () => {})

      it('should mint to the correct address', async () => {})

      it('totalSupply/exists should work', async () => {})

      it('should not allow minting beyond the maxSupply', async () => {})

      it('setMinter should update the minting address', async () => {})

      it('setMinter revert if called by non-owner', async () => {})

    })

    describe('tokenURI', () => {

      it('should defer to the tokenURI contract', async () => {})

    })

    describe('setTokenURIContract', () => {

      it('should update the tokenURI contract', async () => {})

      it('should revert if called by the non-owner', async () => {})

    })

    describe('updateLicense', () => {

      it('should update the license', async () => {})

      it('should revert if called by non-owner', async () => {})

    })

    describe('updateRoyaltyInfo', () => {

      it('should update the royalty info', async () => {})

      it('should revert if called by non-owner', async () => {})

    })
  })

})
