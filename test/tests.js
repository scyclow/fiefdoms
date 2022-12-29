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

const utf8Clean = raw => raw.replace(/data.*utf8,/, '')
const b64Clean = raw => raw.replace(/data.*,/, '')
const b64Decode = raw => Buffer.from(b64Clean(raw), 'base64').toString('utf8')
const getJsonURI = rawURI => JSON.parse(utf8Clean(rawURI))
const getSVG = rawURI => b64Decode(JSON.parse(utf8Clean(rawURI)).image)




let signers, overlord, vassal1
let Fiefdoms, FiefdomsFactory, ReferenceFiefdomFactory, ReferenceFiefdom

async function setup () {
  signers = await ethers.getSigners()
  overlord = signers[0]
  vassal1 = signers[1]

  ReferenceFiefdomFactory = await ethers.getContractFactory('ReferenceFiefdom', overlord)

  FiefdomsFactory = await ethers.getContractFactory('Fiefdoms', overlord)
  Fiefdoms = await FiefdomsFactory.deploy()
  await Fiefdoms.deployed()

  ReferenceFiefdom = await ReferenceFiefdomFactory.attach(
    await Fiefdoms.connect(overlord).tokenIdToFiefdom(0)
  )
}

const safeTransferFrom = 'safeTransferFrom(address,address,uint256)'
const zeroAddr = '0x0000000000000000000000000000000000000000'


describe('Fiefdoms', () => {

  beforeEach(setup)

  describe('happy path', () => {

    it('works', async () => {
      await Fiefdoms.connect(overlord).mint(overlord.address)

      const fiefdomContract = await ReferenceFiefdomFactory.attach(
        await Fiefdoms.connect(overlord).tokenIdToFiefdom(1)
      )

      expect(await fiefdomContract.connect(overlord).kingdom()).to.equal(Fiefdoms.address)
      expect(Number(await fiefdomContract.connect(overlord).fiefdom())).to.equal(1)
      expect(await fiefdomContract.connect(overlord).owner()).to.equal(overlord.address)

      await Fiefdoms.connect(overlord)[safeTransferFrom](overlord.address, vassal1.address, 1)

      expect(await fiefdomContract.connect(overlord).owner()).to.equal(vassal1.address)
    })
  })

  describe('constructor', () => {

    it('should set the default minter/royaltyBeneficiary', async () => {
      expect(await Fiefdoms.connect(overlord).minter()).to.equal(overlord.address)
      const royaltyInfo = await Fiefdoms.connect(overlord).royaltyInfo(0, 100)

      expect(royaltyInfo[0]).to.equal(overlord.address)
      expect(royaltyInfo[1].toNumber()).to.equal(10)
      expect(await Fiefdoms.connect(overlord).minter()).to.equal(overlord.address)
    })

    it('should publish the reference fiefdom, tokenURI contract and default tokenURI contract', async () => {
      expect(await Fiefdoms.connect(overlord).referenceContract()).to.not.equal(zeroAddr)
      expect(await Fiefdoms.connect(overlord).tokenURIContract()).to.not.equal(zeroAddr)
      expect(await Fiefdoms.connect(overlord).defaultTokenURIContract()).to.not.equal(zeroAddr)
    })

    it('should mint token 0 to the fiefdom kingdom owner/overlord (publisher)', async () => {
      expect(await Fiefdoms.connect(overlord).ownerOf(0)).to.equal(overlord.address)
      expect(await Fiefdoms.connect(overlord).totalSupply()).to.equal(1)
    })

    it('should link token 0 to the reference fiefdom via tokenIdToFiefdom', async () => {
      expect(await Fiefdoms.connect(overlord).tokenIdToFiefdom(0)).to.equal(ReferenceFiefdom.address)
    })

  })

  describe('tokenURI', () => {

    it('should work', async () => {
      const beforeURI = await Fiefdoms.connect(overlord).tokenURI(0)

      ReferenceFiefdom.connect(overlord).activate('fiefdom 1', 'FIEF1', 100, zeroAddr)

      const afterURI = await Fiefdoms.connect(overlord).tokenURI(0)

      expect(getJsonURI(beforeURI).attributes.find(attr => attr.trait_type === 'Activated').value).to.equal(false)
      expect(getJsonURI(afterURI).attributes.find(attr => attr.trait_type === 'Activated').value).to.equal(true)
      expect(getJsonURI(afterURI).attributes.find(attr => attr.trait_type === 'Fiefdom').value.toLowerCase()).to.equal(ReferenceFiefdom.address.toLowerCase())


      await Fiefdoms.connect(overlord).mint(vassal1.address)
      const fiefdomContract = await ReferenceFiefdomFactory.attach(
        await Fiefdoms.connect(overlord).tokenIdToFiefdom(1)
      )

      const fiefdom1URI = await Fiefdoms.connect(overlord).tokenURI(1)
      expect(getJsonURI(fiefdom1URI).attributes.find(attr => attr.trait_type === 'Fiefdom').value.toLowerCase()).to.equal(fiefdomContract.address.toLowerCase())

      // console.log(beforeURI)
      // console.log(getSVG(beforeURI))
      // console.log(getSVG(afterURI))
    })

  })

  describe('setTokenURIContract', () => {

    it('should update the tokenURI contract', async () => {
      await Fiefdoms.connect(overlord).setTokenURIContract(zeroAddr)
      expect(await Fiefdoms.connect(overlord).tokenURIContract()).to.equal(zeroAddr)
    })

    it('should revert if called by the non-owner', async () => {
      await expectRevert(
        Fiefdoms.connect(vassal1).setTokenURIContract(zeroAddr),
        'Ownable: caller is not the owner'
      )
    })

  })

  describe('setDefaultTokenURIContract', () => {

    it('should update the tokenURI contract', async () => {
      await Fiefdoms.connect(overlord).setDefaultTokenURIContract(zeroAddr)
      expect(await Fiefdoms.connect(overlord).defaultTokenURIContract()).to.equal(zeroAddr)
    })

    it('should revert if called by the non-owner', async () => {
      await expectRevert(
        Fiefdoms.connect(vassal1).setDefaultTokenURIContract(zeroAddr),
        'Ownable: caller is not the owner'
      )
    })

  })

  describe('updateLicense', () => {

    it('should update the license', async () => {
      await Fiefdoms.connect(overlord).updateLicense('CC0')
      expect(await Fiefdoms.connect(overlord).license()).to.equal('CC0')
    })

    it('should revert if called by the non-owner', async () => {
      await expectRevert(
        Fiefdoms.connect(vassal1).updateLicense('CC0'),
        'Ownable: caller is not the owner'
      )
    })

  })


  describe('setMinter', () => {

    it('should update the minting address', async () => {
      await Fiefdoms.connect(overlord).setMinter(vassal1.address)
      expect(await Fiefdoms.connect(overlord).minter()).to.equal(vassal1.address)
      await Fiefdoms.connect(vassal1).mint(vassal1.address)
    })

    it('should revert if called by the non-owner', async () => {
      await expectRevert(
        Fiefdoms.connect(vassal1).setMinter(vassal1.address),
        'Ownable: caller is not the owner'
      )
    })

  })

  describe('updateRoyaltyInfo', () => {

    it('should update the royalty info', async () => {
      await Fiefdoms.connect(overlord).setRoyaltyInfo(vassal1.address, 2000)
      const royalties = await Fiefdoms.connect(overlord).royaltyInfo(0, 100)
      expect(royalties[0]).to.equal(vassal1.address)
      expect(royalties[1]).to.equal(20)
    })

    it('should revert if called by the non-owner', async () => {
      await expectRevert(
        Fiefdoms.connect(vassal1).setRoyaltyInfo(vassal1.address, 2000),
        'Ownable: caller is not the owner'
      )
    })

  })

  describe('minting', () => {

    it('should revert if not called by the minter', async () => {
      await expectRevert(
        Fiefdoms.connect(vassal1).mint(vassal1.address),
        'Caller is not the minting address'
      )
    })

    it('should mint to the correct address', async () => {
      await Fiefdoms.connect(overlord).mint(vassal1.address)
      await Fiefdoms.connect(overlord).mint(vassal1.address)

      expect(await Fiefdoms.connect(overlord).totalSupply()).to.equal(3)
      expect(await Fiefdoms.connect(overlord).ownerOf(1)).to.equal(vassal1.address)
      expect(await Fiefdoms.connect(overlord).ownerOf(2)).to.equal(vassal1.address)
      expect(await Fiefdoms.connect(overlord).balanceOf(vassal1.address)).to.equal(2)
      expect(await Fiefdoms.connect(overlord).exists(0)).to.equal(true)
      expect(await Fiefdoms.connect(overlord).exists(1)).to.equal(true)
      expect(await Fiefdoms.connect(overlord).exists(2)).to.equal(true)
    })

    it('should create a proxy fiefdom, linked to the token via tokenIdToFiefdom', async () => {
      await Fiefdoms.connect(overlord).mint(vassal1.address)
      await Fiefdoms.connect(overlord).mint(vassal1.address)

      const fiefdom1 = await Fiefdoms.connect(overlord).tokenIdToFiefdom(1)
      const fiefdom2 = await Fiefdoms.connect(overlord).tokenIdToFiefdom(2)

      expect(fiefdom1).to.not.equal(zeroAddr)
      expect(fiefdom2).to.not.equal(zeroAddr)
      expect(fiefdom1).to.not.equal(fiefdom2)

      const fiefdom1Contract = await ReferenceFiefdomFactory.attach(fiefdom1)
      const fiefdom2Contract = await ReferenceFiefdomFactory.attach(fiefdom2)

      expect(await fiefdom1Contract.connect(overlord).isActivated()).to.equal(false)
      expect(await fiefdom2Contract.connect(overlord).isActivated()).to.equal(false)
    })

    it('should revert if attempting to mint more than 721 fiefdoms', async () => {
      await Promise.all(times(720, () => Fiefdoms.connect(overlord).mint(vassal1.address)))

      await expectRevert(
        Fiefdoms.connect(overlord).mint(vassal1.address),
        'Cannot create more fiefdoms'
      )
    })

  })

  describe('batchMinting', () => {

    it('should revert if not called by the minter', async () => {
      await expectRevert(
        Fiefdoms.connect(vassal1).mintBatch(vassal1.address, 10),
        'Caller is not the minting address'
      )
    })

    it('should mint to the correct number of tokens to the correct address', async () => {
      await Fiefdoms.connect(overlord).mintBatch(vassal1.address, 10)

      await Promise.all(times(10, async i => {
        expect(await Fiefdoms.connect(overlord).ownerOf(i + 1)).to.equal(vassal1.address)
        expect(await Fiefdoms.connect(overlord).exists(i + 1)).to.equal(true)
      }))

      expect(await Fiefdoms.connect(overlord).totalSupply()).to.equal(11)
      expect(await Fiefdoms.connect(overlord).balanceOf(vassal1.address)).to.equal(10)
    })

    it('should create a proxy fiefdom, linked to the token via tokenIdToFiefdom, for each token', async () => {
      await Fiefdoms.connect(overlord).mintBatch(vassal1.address, 2)

      const fiefdom1 = await Fiefdoms.connect(overlord).tokenIdToFiefdom(1)
      const fiefdom2 = await Fiefdoms.connect(overlord).tokenIdToFiefdom(2)

      expect(fiefdom1).to.not.equal(zeroAddr)
      expect(fiefdom2).to.not.equal(zeroAddr)
      expect(fiefdom1).to.not.equal(fiefdom2)

      const fiefdom1Contract = await ReferenceFiefdomFactory.attach(fiefdom1)
      const fiefdom2Contract = await ReferenceFiefdomFactory.attach(fiefdom2)

      expect(await fiefdom1Contract.connect(overlord).isActivated()).to.equal(false)
      expect(await fiefdom2Contract.connect(overlord).isActivated()).to.equal(false)
    })

    it.skip('should revert if attempting to mint more than 721 fiefdoms', async () => {
      await expectRevert(
        Fiefdoms.connect(overlord).mintBatch(vassal1.address, 721),
        'Cannot create more fiefdoms'
      )

      await Fiefdoms.connect(overlord).mintBatch(vassal1.address, 50)
      await Fiefdoms.connect(overlord).mintBatch(vassal1.address, 50)
      await Fiefdoms.connect(overlord).mintBatch(vassal1.address, 50)
      await Fiefdoms.connect(overlord).mintBatch(vassal1.address, 50)
      await Fiefdoms.connect(overlord).mintBatch(vassal1.address, 50)
      await Fiefdoms.connect(overlord).mintBatch(vassal1.address, 50)
      await Fiefdoms.connect(overlord).mintBatch(vassal1.address, 50)
      await Fiefdoms.connect(overlord).mintBatch(vassal1.address, 50)
      await Fiefdoms.connect(overlord).mintBatch(vassal1.address, 50)
      await Fiefdoms.connect(overlord).mintBatch(vassal1.address, 50)
      await Fiefdoms.connect(overlord).mintBatch(vassal1.address, 50)
      await Fiefdoms.connect(overlord).mintBatch(vassal1.address, 50)
      await Fiefdoms.connect(overlord).mintBatch(vassal1.address, 50)
      await Fiefdoms.connect(overlord).mintBatch(vassal1.address, 50)
      await Fiefdoms.connect(overlord).mintBatch(vassal1.address, 20)

      await expectRevert(
        Fiefdoms.connect(overlord).mintBatch(vassal1.address, 1),
        'Cannot create more fiefdoms'
      )
    })

  })

  describe('transferring', () => {
    it('should work normally, update ownerOf/balanceOf', async () => {
      await Fiefdoms.connect(overlord).mint(overlord.address)
      await Fiefdoms.connect(overlord)[safeTransferFrom](overlord.address, vassal1.address, 1)

      expect(await Fiefdoms.connect(overlord).ownerOf(1)).to.equal(vassal1.address)
      expect(await Fiefdoms.connect(overlord).balanceOf(vassal1.address)).to.equal(1)
    })

    it('the fiefdom should emit the OwnershipTransferred event', async () => {
      await Fiefdoms.connect(overlord).mint(overlord.address)
      await Fiefdoms.connect(overlord)[safeTransferFrom](overlord.address, vassal1.address, 1)

      const fiefdomContract = await ReferenceFiefdomFactory.attach(
        await Fiefdoms.connect(overlord).tokenIdToFiefdom(1)
      )

      const events = await fiefdomContract.queryFilter({
        address: fiefdomContract.address,
        topics: []
      })

      expect(events.length).to.equal(2)
      // first event is the Transfer for minting token 0
      expect(events[1].event).to.equal('OwnershipTransferred')
    })

    it('the new token owner should also be the owner() of the associated fiefdom contract', async () => {
      await Fiefdoms.connect(overlord).mint(overlord.address)
      await Fiefdoms.connect(overlord)[safeTransferFrom](overlord.address, vassal1.address, 1)

      const fiefdomContract = await ReferenceFiefdomFactory.attach(
        await Fiefdoms.connect(overlord).tokenIdToFiefdom(1)
      )

      expect(await fiefdomContract.connect(overlord).owner()).to.equal(vassal1.address)
    })

  })


  describe.skip('allow listing', () => {

    // describe('updateAllowList', () => {

    //   it('should work', async () => {
    //     expect(await Fiefdoms.connect(overlord))
    //       Fiefdoms.connect(owner).updateAllowList(vassal1.address, true)

    //   })

    //   it('should revert if non-owner attempts to add an address to the allowList', async () => {
    //     await expectRevert(
    //       Fiefdoms.connect(vassal1).updateAllowList(vassal1.address, true),
    //       'Ownable: caller is not the owner'
    //     )
    //   })
    // })

    // describe('updateUseAllowList', () => {

    //   it('should revert if non-owner attempts to turn the allowList off', async () => {
    //     await expectRevert(
    //       Fiefdoms.connect(vassal1).updateUseAllowList(false),
    //       'Ownable: caller is not the owner'
    //     )
    //   })
    // })






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

    describe('initialize', () => {

      it('should store the kingdom contract + fiefdom id', async () => {})

      it('should mint the 0th token to itself', async () => {})

      it('should set the name + symbol to the fiefdom id', async () => {})

      it('should revert if called a second time', async () => {})


    })

    describe('activate', () => {

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

      it('transferOwnership should revert if called by anyone other than the kingdom', async () => {})

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
