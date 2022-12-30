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






const safeTransferFrom = 'safeTransferFrom(address,address,uint256)'
const zeroAddr = '0x0000000000000000000000000000000000000000'
const rndAddr = '0x1234000000000000000000000000000000000000'
const theFuture = 2000000000

let signers, overlord, operator, vassal1, vassal2, vassal3, vassal4
let Fiefdoms, FiefdomsFactory, FiefdomArchetypeFactory, ERC721HooksFactory, FiefdomArchetype
let archetypeFounded

describe('Fiefdoms', () => {

  beforeEach(async () => {
    signers = await ethers.getSigners()
    overlord = signers[0]
    operator = signers[1]
    vassal1 = signers[2]
    vassal2 = signers[3]
    vassal3 = signers[4]
    vassal4 = signers[5]

    FiefdomArchetypeFactory = await ethers.getContractFactory('FiefdomArchetype', overlord)
    ERC721HooksFactory = await ethers.getContractFactory('ERC721HooksMock', overlord)

    FiefdomsFactory = await ethers.getContractFactory('Fiefdoms', overlord)
    archetypeFounded = await time.latest()
    Fiefdoms = await FiefdomsFactory.deploy()
    await Fiefdoms.deployed()

    FiefdomArchetype = await FiefdomArchetypeFactory.attach(
      await Fiefdoms.connect(overlord).tokenIdToFiefdom(0)
    )
  })

  describe('happy path', () => {

    it('works', async () => {
      await Fiefdoms.connect(overlord).mint(overlord.address)

      const fiefdomContract = await FiefdomArchetypeFactory.attach(
        await Fiefdoms.connect(overlord).tokenIdToFiefdom(1)
      )

      expect(await fiefdomContract.connect(overlord).kingdom()).to.equal(Fiefdoms.address)
      expect(Number(await fiefdomContract.connect(overlord).fiefdomId())).to.equal(1)
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

    it('should publish the fiefdom archetype, tokenURI contract and default tokenURI contract', async () => {
      expect(await Fiefdoms.connect(overlord).fiefdomArchetype()).to.not.equal(zeroAddr)
      expect(await Fiefdoms.connect(overlord).tokenURIContract()).to.not.equal(zeroAddr)
      expect(await Fiefdoms.connect(overlord).defaultTokenURIContract()).to.not.equal(zeroAddr)
    })

    it('should mint token 0 to the fiefdom kingdom owner/overlord (publisher)', async () => {
      expect(await Fiefdoms.connect(overlord).ownerOf(0)).to.equal(overlord.address)
      expect(await Fiefdoms.connect(overlord).totalSupply()).to.equal(1)
    })

    it('should link token 0 to the fiefdom archetype via tokenIdToFiefdom', async () => {
      expect(await Fiefdoms.connect(overlord).tokenIdToFiefdom(0)).to.equal(FiefdomArchetype.address)
    })

  })

  describe('activation', () => {
    it('should revert', async () => {
      await expectRevert.unspecified(
        Fiefdoms.connect(overlord).activation(0)
      )
    })
  })

  describe('tokenURI', () => {

    it('should work', async () => {
      const beforeURI = await Fiefdoms.connect(overlord).tokenURI(0)

      await FiefdomArchetype.connect(overlord).activate('fiefdom 0', 'FIEF0', 'CC BY-NC 4.0', 100, zeroAddr, zeroAddr)

      const afterURI = await Fiefdoms.connect(overlord).tokenURI(0)

      expect(getJsonURI(beforeURI).name).to.equal('Fiefdom Vassal #0')
      expect(getJsonURI(beforeURI).description).to.equal('Unactivated Fiefdom Vassal #0 of ' + FiefdomArchetype.address.toLowerCase())
      expect(getJsonURI(beforeURI).external_url).to.equal('https://steviep.xyz/fiefdoms')
      expect(getJsonURI(beforeURI).attributes.find(attr => attr.trait_type === 'Activated').value).to.equal('false')
      expect(getJsonURI(afterURI).attributes.find(attr => attr.trait_type === 'Activated').value).to.equal('true')
      expect(getJsonURI(afterURI).attributes.find(attr => attr.trait_type === 'Fiefdom').value.toLowerCase()).to.equal(FiefdomArchetype.address.toLowerCase())
      expect(Number(getJsonURI(afterURI).attributes.find(attr => attr.trait_type === 'Founded At').value)).to.be.closeTo(Number(archetypeFounded), 2)
      expect(getJsonURI(afterURI).description).to.equal('Activated Fiefdom Vassal #0 of ' + FiefdomArchetype.address.toLowerCase())


      await time.increaseTo(theFuture)
      await Fiefdoms.connect(overlord).mint(vassal1.address)

      await time.increaseTo(theFuture*2)
      const fiefdomContract = await FiefdomArchetypeFactory.attach(
        await Fiefdoms.connect(overlord).tokenIdToFiefdom(1)
      )

      const fiefdom1URI = await Fiefdoms.connect(overlord).tokenURI(1)
      expect(getJsonURI(fiefdom1URI).description).to.equal('Unactivated Fiefdom Vassal #1 of ' + fiefdomContract.address.toLowerCase())
      expect(getJsonURI(fiefdom1URI).attributes.find(attr => attr.trait_type === 'Fiefdom').value.toLowerCase()).to.equal(fiefdomContract.address.toLowerCase())
      expect(Number(getJsonURI(fiefdom1URI).attributes.find(attr => attr.trait_type === 'Founded At').value)).to.be.closeTo(theFuture, 2)

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

    it('should emit BatchMetadataUpdate', async () => {
      await Fiefdoms.connect(overlord).mintBatch(vassal1.address, 5)
      await Fiefdoms.connect(overlord).setTokenURIContract(zeroAddr)

      const events = await Fiefdoms.queryFilter({
        address: Fiefdoms.address,
        topics: []
      })

      const latestEvent = events[events.length-1]

      expect(latestEvent.event).to.equal('BatchMetadataUpdate')
      expect(Number(latestEvent.args[0])).to.equal(0)
      expect(Number(latestEvent.args[1])).to.equal(6)
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

      const fiefdom1Contract = await FiefdomArchetypeFactory.attach(fiefdom1)
      const fiefdom2Contract = await FiefdomArchetypeFactory.attach(fiefdom2)

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

  describe('mintBatch', () => {

    it('should revert if not called by the minter', async () => {
      await expectRevert(
        Fiefdoms.connect(vassal1).mintBatch(vassal1.address, 10),
        'Caller is not the minting address'
      )
    })

    it('should mint to the correct number of tokens to the correct address, and assign the correct fiefdom number', async () => {
      await Fiefdoms.connect(overlord).mintBatch(vassal1.address, 10)

      await Promise.all(times(10, async i => {
        expect(await Fiefdoms.connect(overlord).ownerOf(i + 1)).to.equal(vassal1.address)
        expect(await Fiefdoms.connect(overlord).exists(i + 1)).to.equal(true)
      }))

      expect(await Fiefdoms.connect(overlord).totalSupply()).to.equal(11)
      expect(await Fiefdoms.connect(overlord).balanceOf(vassal1.address)).to.equal(10)

      const fiefdom10 = await Fiefdoms.connect(overlord).tokenIdToFiefdom(10)

      const fiefdom10Contract = await FiefdomArchetypeFactory.attach(fiefdom10)

      expect(await fiefdom10Contract.connect(vassal1).fiefdomId()).to.equal(10)

    })

    it('should create a proxy fiefdom, linked to the token via tokenIdToFiefdom, for each token', async () => {
      await Fiefdoms.connect(overlord).mintBatch(vassal1.address, 2)

      const fiefdom1 = await Fiefdoms.connect(overlord).tokenIdToFiefdom(1)
      const fiefdom2 = await Fiefdoms.connect(overlord).tokenIdToFiefdom(2)

      expect(fiefdom1).to.not.equal(zeroAddr)
      expect(fiefdom2).to.not.equal(zeroAddr)
      expect(fiefdom1).to.not.equal(fiefdom2)

      const fiefdom1Contract = await FiefdomArchetypeFactory.attach(fiefdom1)
      const fiefdom2Contract = await FiefdomArchetypeFactory.attach(fiefdom2)

      expect(await fiefdom1Contract.connect(overlord).isActivated()).to.equal(false)
      expect(await fiefdom2Contract.connect(overlord).isActivated()).to.equal(false)
    })

    it('should revert if attempting to mint more than 721 fiefdoms', async () => {
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

      const fiefdomContract = await FiefdomArchetypeFactory.attach(
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

      const fiefdomContract = await FiefdomArchetypeFactory.attach(
        await Fiefdoms.connect(overlord).tokenIdToFiefdom(1)
      )

      expect(await fiefdomContract.connect(overlord).owner()).to.equal(vassal1.address)
    })

  })


  describe('allow listing', () => {

    describe('updateOperatorAllowList', () => {

      it('should work', async () => {
        expect(await Fiefdoms.connect(overlord).operatorAllowList(vassal1.address)).to.equal(false)
        Fiefdoms.connect(overlord).updateOperatorAllowList(vassal1.address, true)
        expect(await Fiefdoms.connect(overlord).operatorAllowList(vassal1.address)).to.equal(true)
        Fiefdoms.connect(overlord).updateOperatorAllowList(vassal1.address, false)
        expect(await Fiefdoms.connect(overlord).operatorAllowList(vassal1.address)).to.equal(false)
      })

      it('should revert if non-owner attempts to add an address to the operatorAllowList', async () => {
        await expectRevert(
          Fiefdoms.connect(vassal1).updateOperatorAllowList(vassal1.address, true),
          'Ownable: caller is not the owner'
        )
      })

    })

    describe('updateUseOperatorAllowList', () => {

      it('should work', async () => {
        expect(await Fiefdoms.connect(overlord).useOperatorAllowList()).to.equal(true)
        Fiefdoms.connect(overlord).updateUseOperatorAllowList(false)
        expect(await Fiefdoms.connect(overlord).useOperatorAllowList()).to.equal(false)
      })

      it('should revert if non-owner attempts to turn the operatorAllowList off', async () => {
        await expectRevert(
          Fiefdoms.connect(vassal1).updateUseOperatorAllowList(false),
          'Ownable: caller is not the owner'
        )
      })

    })

    describe('allow list is active', () => {
      beforeEach(async () => {
        await Fiefdoms.connect(overlord).mint(vassal1.address)
        await Fiefdoms.connect(overlord).mint(vassal1.address)
        await Fiefdoms.connect(overlord).updateUseOperatorAllowList(true)
        await Fiefdoms.connect(overlord).updateOperatorAllowList(operator.address, true)
      })

      it('should revert if someone tries to approve a non-ALed operator', async () => {
        await expectRevert(
          Fiefdoms.connect(vassal1).approve(vassal2.address, 1),
          'Operator must be on Allow List'
        )

        await expectRevert(
          Fiefdoms.connect(vassal1).setApprovalForAll(vassal2.address, true),
          'Operator must be on Allow List'
        )
      })


      it('should not revert if someone tries to approve an ALed operator', async () => {
        Fiefdoms.connect(vassal1).approve(operator.address, 1)
        await Fiefdoms.connect(operator)[safeTransferFrom](vassal1.address, vassal2.address, 1)

        Fiefdoms.connect(vassal1).setApprovalForAll(operator.address, true)
        await Fiefdoms.connect(operator)[safeTransferFrom](vassal1.address, vassal2.address, 2)

        expect(await Fiefdoms.connect(overlord).balanceOf(vassal2.address)).to.equal(2)
      })


      it('should revert if non-ALed operators were previousely approved', async () => {
        await Fiefdoms.connect(overlord).updateUseOperatorAllowList(false)

        Fiefdoms.connect(vassal1).approve(vassal2.address, 1)
        Fiefdoms.connect(vassal1).setApprovalForAll(vassal2.address)

        await Fiefdoms.connect(overlord).updateUseOperatorAllowList(true)

        await expectRevert(
          Fiefdoms.connect(vassal2)[safeTransferFrom](vassal1.address, vassal2.address, 1),
          'ERC721: transfer caller is not owner nor approved'
        )
      })
    })

    describe('allow list is inactive', () => {

      beforeEach(async () => {
        await Fiefdoms.connect(overlord).updateUseOperatorAllowList(false)
        await Fiefdoms.connect(overlord).updateOperatorAllowList(operator.address, true)
        await Fiefdoms.connect(overlord).mint(vassal1.address)
        await Fiefdoms.connect(overlord).mint(vassal1.address)
      })

      it('should not revert someone tries to approve a non-ALed operator for a single fiefdom token ', async () => {
        Fiefdoms.connect(vassal1).approve(vassal2.address, 1)
        await Fiefdoms.connect(vassal2)[safeTransferFrom](vassal1.address, vassal2.address, 1)

        Fiefdoms.connect(vassal1).setApprovalForAll(vassal2.address, true)
        await Fiefdoms.connect(vassal2)[safeTransferFrom](vassal1.address, vassal2.address, 2)

        expect(await Fiefdoms.connect(overlord).balanceOf(vassal2.address)).to.equal(2)
      })

    })
  })

  describe('ProxyFiefdoms', () => {

    let fiefdom1Contract, fiefdom2Contract, fiefdom3Contract, hooksContract

    beforeEach(async () => {
      await Fiefdoms.connect(overlord).mint(vassal1.address)
      await Fiefdoms.connect(overlord).mint(vassal2.address)
      await Fiefdoms.connect(overlord).mint(vassal3.address)

      fiefdom1Contract = await FiefdomArchetypeFactory.attach(
        await Fiefdoms.connect(overlord).tokenIdToFiefdom(1)
      )

      fiefdom2Contract = await FiefdomArchetypeFactory.attach(
        await Fiefdoms.connect(overlord).tokenIdToFiefdom(2)
      )

      fiefdom3Contract = await FiefdomArchetypeFactory.attach(
        await Fiefdoms.connect(overlord).tokenIdToFiefdom(3)
      )

      hooksContract = await ERC721HooksFactory.deploy(fiefdom3Contract.address)
      await hooksContract.deployed()
    })

    describe('initialize', () => {

      it('should store the kingdom contract + fiefdom id', async () => {
        expect(await fiefdom1Contract.connect(overlord).fiefdomId()).to.equal(1)
        expect(await fiefdom2Contract.connect(overlord).fiefdomId()).to.equal(2)

        expect(await fiefdom1Contract.connect(overlord).kingdom()).to.equal(Fiefdoms.address)
        expect(await fiefdom2Contract.connect(overlord).kingdom()).to.equal(Fiefdoms.address)
      })

      it('should use the default fiefdom tokenURI contract', async () => {
        expect(await fiefdom2Contract.connect(overlord).tokenURIContract()).to.equal(await Fiefdoms.connect(overlord).defaultTokenURIContract())
      })

      it('should mint the 0th token to itself', async () => {
        expect(await fiefdom1Contract.connect(overlord).ownerOf(0)).to.equal(fiefdom1Contract.address)
        expect(await fiefdom1Contract.connect(overlord).balanceOf(fiefdom1Contract.address)).to.equal(1)
        expect(await fiefdom1Contract.connect(overlord).balanceOf(vassal1.address)).to.equal(0)
        expect(await fiefdom1Contract.connect(overlord).totalSupply()).to.equal(1)
        expect(await fiefdom1Contract.connect(overlord).exists(0)).to.equal(true)
      })

      it('should set the name + symbol to the fiefdom id', async () => {
        expect(await fiefdom1Contract.connect(overlord).name()).to.equal('Fiefdom 1')
        expect(await fiefdom2Contract.connect(overlord).name()).to.equal('Fiefdom 2')

        expect(await fiefdom1Contract.connect(overlord).symbol()).to.equal('FIEF1')
        expect(await fiefdom2Contract.connect(overlord).symbol()).to.equal('FIEF2')
      })

      it('should revert if initialize is called a second time', async () => {
        await expectRevert(
          fiefdom1Contract.connect(overlord).initialize(Fiefdoms.address, 1),
          "Can't initialize more than once"
        )
      })

    })

    describe('activate', () => {
      // test everything when token has been traded at least once
      beforeEach(async () => {
        await Fiefdoms.connect(vassal1)[safeTransferFrom](vassal1.address, vassal2.address, 1)
        await Fiefdoms.connect(vassal2)[safeTransferFrom](vassal2.address, vassal1.address, 2)

        await fiefdom1Contract.connect(vassal2).activate('New Name', 'NEW', 'CC BY-NC 4.0', 123, rndAddr, zeroAddr)
        await fiefdom2Contract.connect(vassal1).activate('Newer Name', 'NEWER', 'CC0', 321, rndAddr, zeroAddr)
        await fiefdom3Contract.connect(vassal3).activate('Hooks Name', 'HOOKS', 'CC0', 456, rndAddr, hooksContract.address)
      })

      it('should emit events on Fiefdoms', async () => {
        const events = (await Fiefdoms.queryFilter({
          address: Fiefdoms.address,
          topics: []
        }))

        expect(events.some(e => e.event === 'MetadataUpdate' && Number(e.args[0]) === 1)).to.equal(true)
        expect(events.some(e => e.event === 'Activation' && Number(e.args[0]) === 1)).to.equal(true)
        expect(events.some(e => e.event === 'MetadataUpdate' && Number(e.args[0]) === 2)).to.equal(true)
        expect(events.some(e => e.event === 'Activation' && Number(e.args[0]) === 2)).to.equal(true)
      })

      it('should reset contract name/symbol, license, maxSupply, tokenURIContract', async () => {
        expect(await fiefdom1Contract.connect(vassal2).name()).to.equal('New Name')
        expect(await fiefdom1Contract.connect(vassal2).symbol()).to.equal('NEW')
        expect(await fiefdom1Contract.connect(vassal2).license()).to.equal('CC BY-NC 4.0')
        expect(Number(await fiefdom1Contract.connect(vassal2).maxSupply())).to.equal(123)
        expect(await fiefdom1Contract.connect(vassal2).tokenURIContract()).to.equal(rndAddr)

        expect(await fiefdom2Contract.connect(vassal1).name()).to.equal('Newer Name')
        expect(await fiefdom2Contract.connect(vassal1).symbol()).to.equal('NEWER')
        expect(await fiefdom2Contract.connect(vassal1).license()).to.equal('CC0')
        expect(Number(await fiefdom2Contract.connect(vassal1).maxSupply())).to.equal(321)
        expect(await fiefdom2Contract.connect(vassal1).tokenURIContract()).to.equal(rndAddr)
      })

      it('should set minter/royaltybeneficiary/royaltyBasisPoints, ', async () => {
        expect(await fiefdom1Contract.connect(vassal2).minter()).to.equal(vassal2.address)
        const royaltyInfo = await fiefdom1Contract.connect(vassal2).royaltyInfo(0, 100)
        expect(royaltyInfo[0]).to.equal(vassal2.address)
        expect(royaltyInfo[1]).to.equal(10)
      })

      it('should not freeze maxSupply or tokenURI', async () => {
        expect(await fiefdom1Contract.connect(vassal2).tokenURIFrozen()).to.equal(false)
        expect(await fiefdom1Contract.connect(vassal2).maxSupplyFrozen()).to.equal(false)
      })

      it('should transfer the 0 token to the caller', async () => {
        expect(await fiefdom1Contract.connect(vassal2).ownerOf(0)).to.equal(vassal2.address)
        expect(await fiefdom1Contract.connect(vassal2).balanceOf(vassal2.address)).to.equal(1)
      })

      it('should revert if called a second time', async () => {
        await expectRevert(
          fiefdom1Contract.connect(vassal2).activate('New Name', 'NEW', 'CC BY-NC 4.0', 123, rndAddr, zeroAddr),
          'Fiefdom has already been activated'
        )
      })

      it('should revert if called by non-owner', async () => {
        await Fiefdoms.connect(overlord).mint(vassal1.address)

        const fiefdom4Contract = await FiefdomArchetypeFactory.attach(
          await Fiefdoms.connect(overlord).tokenIdToFiefdom(4)
        )

        await expectRevert(
          fiefdom4Contract.connect(overlord).activate('New Name', 'NEW', 'CC BY-NC 4.0', 123, rndAddr, zeroAddr),
          'Ownable: caller is not the owner'
        )
      })

      describe("hooks", () => {
        it('should call the transfer hook on mint', async () => {
          const txPromise = fiefdom3Contract.connect(vassal3).mint(vassal3.address, 1)
          await expect(txPromise)
            .to.emit(hooksContract, "BeforeTokenTransferHookCalled")
            .withArgs(zeroAddr, vassal3.address, 1)
        })

        it('should call the transfer hook on transfer', async () => {
          const txPromise = fiefdom3Contract.connect(vassal3).transferFrom(vassal3.address, vassal1.address, 0)
          await expect(txPromise)
            .to.emit(hooksContract, "BeforeTokenTransferHookCalled")
            .withArgs(vassal3.address, vassal1.address, 0)
        })

        it('should call the approve hook', async () => {
          const txPromise = fiefdom3Contract.connect(vassal3).approve(vassal1.address, 0)
          await expect(txPromise)
            .to.emit(hooksContract, "BeforeApproveHookCalled")
            .withArgs(vassal1.address, 0)
        })

        it('should call the setApprovalForAll hook', async () => {
          const txPromise = fiefdom3Contract.connect(vassal3).setApprovalForAll(vassal1.address, true)
          await expect(txPromise)
            .to.emit(hooksContract, "BeforeSetApprovalForAllHookCalled")
            .withArgs(vassal1.address, true)
        })

        it('should fail to activate if hooks contract is not configured with the correct address', async () => {
          await Fiefdoms.connect(overlord).mint(vassal4.address)
          const fiefdom4Contract = await FiefdomArchetypeFactory.attach(
            await Fiefdoms.connect(overlord).tokenIdToFiefdom(4)
          )

          const badHooksContract = await ERC721HooksFactory.deploy(zeroAddr)
          await badHooksContract.deployed()

          await expectRevert(
            fiefdom4Contract.connect(vassal4).activate('Bad Hooks Name', 'BAD-HOOKS', 'CC0', 654, rndAddr, badHooksContract.address),
            "Passed ERC721Hooks contract is not configured for this Fiefdom"
          )
        })
      })
    })

    describe('owner', () => {

      it('should be the same as the fiefdom token owner', async () => {
        expect(await fiefdom1Contract.connect(vassal1).owner()).to.equal(await Fiefdoms.connect(vassal1).ownerOf(1))
        await Fiefdoms.connect(vassal1)[safeTransferFrom](vassal1.address, vassal2.address, 1)
        expect(await fiefdom1Contract.connect(vassal1).owner()).to.equal(await Fiefdoms.connect(vassal1).ownerOf(1))

      })

      it('transferOwnership should revert if called by anyone other than the kingdom', async () => {
        await expectRevert(
          fiefdom1Contract.connect(vassal1).transferOwnership(vassal1.address, vassal2.address),
          'Ownership can only be transferred by the kingdom'
        )
      })

    })

    describe('mint', () => {
      it('should revert if not called by the minter', async () => {
        fiefdom1Contract.connect(vassal1).activate('New Name', 'NEW', 'CC BY-NC 4.0', 123, rndAddr, zeroAddr)

        await expectRevert(
          fiefdom1Contract.connect(vassal2).mint(vassal2.address, 1),
          'Caller is not the minting address'
        )
      })

      it('should allow minter to mint', async () => {
        fiefdom1Contract.connect(vassal1).activate('New Name', 'NEW', 'CC BY-NC 4.0', 123, rndAddr, zeroAddr)
        fiefdom1Contract.connect(vassal1).setMinter(operator.address)

        await fiefdom1Contract.connect(operator).mint(vassal2.address, 1)
        await Fiefdoms.connect(vassal1)[safeTransferFrom](vassal1.address, vassal2.address, fiefdom1Contract.fiefdomId())
        await fiefdom1Contract.connect(operator).mint(vassal2.address, 2)

      })

      it('should mint to the correct address', async () => {
        fiefdom1Contract.connect(vassal1).activate('New Name', 'NEW', 'CC BY-NC 4.0', 123, rndAddr, zeroAddr)

        await fiefdom1Contract.connect(vassal1).mint(vassal2.address, 1)
        await fiefdom1Contract.connect(vassal1).mint(vassal2.address, 2)

        expect(await fiefdom1Contract.connect(vassal1).totalSupply()).to.equal(3)
        expect(await fiefdom1Contract.connect(vassal1).ownerOf(1)).to.equal(vassal2.address)
        expect(await fiefdom1Contract.connect(vassal1).ownerOf(2)).to.equal(vassal2.address)
        expect(await fiefdom1Contract.connect(vassal1).balanceOf(vassal2.address)).to.equal(2)
        expect(await fiefdom1Contract.connect(vassal1).exists(0)).to.equal(true)
        expect(await fiefdom1Contract.connect(vassal1).exists(1)).to.equal(true)
        expect(await fiefdom1Contract.connect(vassal1).exists(2)).to.equal(true)
      })


      it('should not allow minting beyond the maxSupply', async () => {
        fiefdom1Contract.connect(vassal1).activate('New Name', 'NEW', 'CC BY-NC 4.0', 5, rndAddr, zeroAddr)
        await fiefdom1Contract.connect(vassal1).mint(vassal2.address, 1)
        await fiefdom1Contract.connect(vassal1).mint(vassal2.address, 2)
        await fiefdom1Contract.connect(vassal1).mint(vassal2.address, 3)
        await fiefdom1Contract.connect(vassal1).mint(vassal2.address, 4)

        await expectRevert(
          fiefdom1Contract.connect(vassal1).mint(vassal2.address, 5),
          'Cannot create more tokens'
        )
      })
    })

    describe('mintBatch', () => {
      it('should revert if not called by the minter', async () => {
        fiefdom1Contract.connect(vassal1).activate('New Name', 'NEW', 'CC BY-NC 4.0', 123, rndAddr, zeroAddr)

        await expectRevert(
          fiefdom1Contract.connect(vassal2).mintBatch([vassal2.address, vassal2.address], 1),
          'Caller is not the minting address'
        )
      })

      it('should allow minter to mint', async () => {
        fiefdom1Contract.connect(vassal1).activate('New Name', 'NEW', 'CC BY-NC 4.0', 123, rndAddr, zeroAddr)
        fiefdom1Contract.connect(vassal1).setMinter(operator.address)

        await fiefdom1Contract.connect(operator).mintBatch([vassal2.address, vassal2.address], 1)
        await Fiefdoms.connect(vassal1)[safeTransferFrom](vassal1.address, vassal2.address, fiefdom1Contract.fiefdomId())
        await fiefdom1Contract.connect(operator).mintBatch([vassal2.address, vassal2.address], 3)

      })

      it('should mint to the correct address', async () => {
        fiefdom1Contract.connect(vassal1).activate('New Name', 'NEW', 'CC BY-NC 4.0', 123, rndAddr, zeroAddr)

        await fiefdom1Contract.connect(vassal1).mintBatch([vassal2.address, vassal2.address, operator.address], 1)

        expect(await fiefdom1Contract.connect(vassal1).totalSupply()).to.equal(4)
        expect(await fiefdom1Contract.connect(vassal1).ownerOf(1)).to.equal(vassal2.address)
        expect(await fiefdom1Contract.connect(vassal1).ownerOf(2)).to.equal(vassal2.address)
        expect(await fiefdom1Contract.connect(vassal1).ownerOf(3)).to.equal(operator.address)
        expect(await fiefdom1Contract.connect(vassal1).balanceOf(vassal2.address)).to.equal(2)
        expect(await fiefdom1Contract.connect(vassal1).balanceOf(operator.address)).to.equal(1)
        expect(await fiefdom1Contract.connect(vassal1).exists(0)).to.equal(true)
        expect(await fiefdom1Contract.connect(vassal1).exists(1)).to.equal(true)
        expect(await fiefdom1Contract.connect(vassal1).exists(2)).to.equal(true)
        expect(await fiefdom1Contract.connect(vassal1).exists(3)).to.equal(true)
        expect(await fiefdom1Contract.connect(vassal1).exists(4)).to.equal(false)
      })


      it('should not allow minting beyond the maxSupply', async () => {
        fiefdom1Contract.connect(vassal1).activate('New Name', 'NEW', 'CC BY-NC 4.0', 5, rndAddr, zeroAddr)

        await expectRevert(
          fiefdom1Contract.connect(vassal1).mintBatch(times(5, () => vassal2.address), 1),
          'Cannot create more tokens'
        )
      })

      it('should not remint tokens', async () => {
        fiefdom1Contract.connect(vassal1).activate('New Name', 'NEW', 'CC BY-NC 4.0', 100, rndAddr, zeroAddr)

        await fiefdom1Contract.connect(vassal1).mint(vassal2.address, 32)

        await expectRevert(
          fiefdom1Contract.connect(vassal1).mintBatch(times(5, () => vassal2.address), 30),
          'ERC721: token already minted'
        )
      })
    })

    describe('mintBatchTo', () => {
      it('should revert if not called by the minter', async () => {
        fiefdom1Contract.connect(vassal1).activate('New Name', 'NEW', 'CC BY-NC 4.0', 123, rndAddr, zeroAddr)

        await expectRevert(
          fiefdom1Contract.connect(vassal2).mintBatchTo(vassal2.address, 5, 1),
          'Caller is not the minting address'
        )
      })

      it('should allow minter to mint', async () => {
        fiefdom1Contract.connect(vassal1).activate('New Name', 'NEW', 'CC BY-NC 4.0', 123, rndAddr, zeroAddr)
        fiefdom1Contract.connect(vassal1).setMinter(operator.address)

        await fiefdom1Contract.connect(operator).mintBatchTo(vassal2.address, 10, 1)
        await Fiefdoms.connect(vassal1)[safeTransferFrom](vassal1.address, vassal2.address, fiefdom1Contract.fiefdomId())
        await fiefdom1Contract.connect(operator).mintBatchTo(vassal2.address, 10, 11)

      })

      it('should mint to the correct address', async () => {
        fiefdom1Contract.connect(vassal1).activate('New Name', 'NEW', 'CC BY-NC 4.0', 123, rndAddr, zeroAddr)

        await fiefdom1Contract.connect(vassal1).mintBatchTo(vassal2.address, 3, 1)
        await fiefdom1Contract.connect(vassal1).mintBatchTo(operator.address, 3, 4)

        expect(await fiefdom1Contract.connect(vassal1).totalSupply()).to.equal(7)
        expect(await fiefdom1Contract.connect(vassal1).ownerOf(1)).to.equal(vassal2.address)
        expect(await fiefdom1Contract.connect(vassal1).ownerOf(2)).to.equal(vassal2.address)
        expect(await fiefdom1Contract.connect(vassal1).ownerOf(3)).to.equal(vassal2.address)
        expect(await fiefdom1Contract.connect(vassal1).ownerOf(4)).to.equal(operator.address)
        expect(await fiefdom1Contract.connect(vassal1).ownerOf(5)).to.equal(operator.address)
        expect(await fiefdom1Contract.connect(vassal1).ownerOf(6)).to.equal(operator.address)
        expect(await fiefdom1Contract.connect(vassal1).balanceOf(vassal2.address)).to.equal(3)
        expect(await fiefdom1Contract.connect(vassal1).balanceOf(operator.address)).to.equal(3)
        expect(await fiefdom1Contract.connect(vassal1).exists(0)).to.equal(true)
        expect(await fiefdom1Contract.connect(vassal1).exists(1)).to.equal(true)
        expect(await fiefdom1Contract.connect(vassal1).exists(2)).to.equal(true)
        expect(await fiefdom1Contract.connect(vassal1).exists(3)).to.equal(true)
        expect(await fiefdom1Contract.connect(vassal1).exists(4)).to.equal(true)
        expect(await fiefdom1Contract.connect(vassal1).exists(5)).to.equal(true)
        expect(await fiefdom1Contract.connect(vassal1).exists(6)).to.equal(true)
        expect(await fiefdom1Contract.connect(vassal1).exists(7)).to.equal(false)
      })


      it('should not allow minting beyond the maxSupply', async () => {
        fiefdom1Contract.connect(vassal1).activate('New Name', 'NEW', 'CC BY-NC 4.0', 5, rndAddr, zeroAddr)

        await expectRevert(
          fiefdom1Contract.connect(vassal1).mintBatchTo(vassal2.address, 5, 1),
          'Cannot create more tokens'
        )
      })

      it('should not remint tokens', async () => {
        fiefdom1Contract.connect(vassal1).activate('New Name', 'NEW', 'CC BY-NC 4.0', 100, rndAddr, zeroAddr)

        await fiefdom1Contract.connect(vassal1).mint(vassal2.address, 32)

        await expectRevert(
          fiefdom1Contract.connect(vassal1).mintBatchTo(vassal2.address, 5, 30),
          'ERC721: token already minted'
        )
      })
    })

    describe('tokenURI', () => {

      it('should work', async () => {

        const tokenURI1 = await fiefdom1Contract.connect(vassal1).tokenURI(0)
        const tokenURI2 = await fiefdom2Contract.connect(vassal1).tokenURI(0)
        const tokenURI3 = await fiefdom1Contract.connect(vassal1).tokenURI(1)

        expect(getJsonURI(tokenURI1).name).to.equal('Fiefdom 1, Token 0')
        expect(getJsonURI(tokenURI2).name).to.equal('Fiefdom 2, Token 0')
        expect(getJsonURI(tokenURI3).name).to.equal('Fiefdom 1, Token 1')
        expect(getJsonURI(tokenURI1).description).to.equal('The start of something new.')

        // console.log(getSVG(tokenURI1))
      })

      it('should defer to the kingdom tokenURI contract before activation, or it set to 0x0', async () => {
        expect(await fiefdom1Contract.connect(vassal1).tokenURIContract()).to.equal(await Fiefdoms.connect(vassal1).defaultTokenURIContract())
        await fiefdom1Contract.connect(vassal1).activate('New Name', 'NEW', 'CC BY-NC 4.0', 123, rndAddr, zeroAddr)
        expect(await fiefdom1Contract.connect(vassal1).tokenURIContract()).to.equal(rndAddr)
        await fiefdom1Contract.connect(vassal1).setTokenURIContract(zeroAddr)
        expect(await fiefdom1Contract.connect(vassal1).tokenURIContract()).to.equal(await Fiefdoms.connect(vassal1).defaultTokenURIContract())

      })

    })

    describe('freezeTokenURI', () => {
      it('should freeze tokenURI contract', async () => {
        await fiefdom1Contract.connect(vassal1).activate('New Name', 'NEW', 'CC BY-NC 4.0', 123, rndAddr, zeroAddr)
        await fiefdom1Contract.connect(vassal1).freezeTokenURI()
        expect(await fiefdom1Contract.connect(vassal1).tokenURIFrozen()).to.equal(true)
      })

      it('should revert if fiefdom has not been activated', async () => {
        await expectRevert(
          fiefdom1Contract.connect(vassal1).freezeTokenURI(),
          'Fiefdom must be activated'
        )
      })

      it('should revert if called by non-owner', async () => {
        await fiefdom1Contract.connect(vassal1).activate('New Name', 'NEW', 'CC BY-NC 4.0', 123, rndAddr, zeroAddr)
        await expectRevert(
          fiefdom1Contract.connect(overlord).freezeTokenURI(),
          'Ownable: caller is not the owner'
        )
      })
    })

    describe('setMinter', () => {

      it('should update the minting address', async () => {
        await fiefdom1Contract.connect(vassal1).activate('New Name', 'NEW', 'CC BY-NC 4.0', 123, rndAddr, zeroAddr)

        await fiefdom1Contract.connect(vassal1).setMinter(vassal2.address)
        expect(await fiefdom1Contract.connect(vassal1).minter()).to.equal(vassal2.address)
        await fiefdom1Contract.connect(vassal2).mint(vassal1.address, 1)
      })

      it('should revert if called by the non-owner', async () => {
        await expectRevert(
          fiefdom1Contract.connect(overlord).setMinter(vassal2.address),
          'Ownable: caller is not the owner'
        )
      })

    })

    describe('setTokenURIContract', () => {

      it('should update the tokenURI contract', async () => {
        await fiefdom1Contract.connect(vassal1).setTokenURIContract(rndAddr)
        expect(await fiefdom1Contract.connect(vassal1).tokenURIContract()).to.equal(rndAddr)
      })

      it('should emit BatchMetadataUpdate', async () => {
        await fiefdom1Contract.connect(vassal1).activate('New Name', 'NEW', 'CC BY-NC 4.0', 123, rndAddr, zeroAddr)

        await fiefdom1Contract.connect(vassal1).mintBatchTo(vassal1.address, 5, 1)
        await fiefdom1Contract.connect(vassal1).setTokenURIContract(zeroAddr)

        const events = await fiefdom1Contract.queryFilter({
          address: fiefdom1Contract.address,
          topics: []
        })

        const latestEvent = events[events.length-1]

        expect(latestEvent.event).to.equal('BatchMetadataUpdate')
        expect(Number(latestEvent.args[0])).to.equal(0)
        expect(Number(latestEvent.args[1])).to.equal(6)
      })

      it('should revert if called by the non-owner', async () => {
        await expectRevert(
          fiefdom1Contract.connect(overlord).setTokenURIContract(zeroAddr),
          'Ownable: caller is not the owner'
        )
      })


      it('should revert if tokenURI has been frozen', async () => {
        await fiefdom1Contract.connect(vassal1).activate('New Name', 'NEW', 'CC BY-NC 4.0', 123, rndAddr, zeroAddr)
        await fiefdom1Contract.connect(vassal1).freezeTokenURI()

        await expectRevert(
          fiefdom1Contract.connect(vassal1).setTokenURIContract(zeroAddr),
          'Token URI has been frozen'
        )
      })

    })

    describe('freezeMaxSupply', () => {
      it('should freeze maxSupply', async () => {
        await fiefdom1Contract.connect(vassal1).activate('New Name', 'NEW', 'CC BY-NC 4.0', 123, rndAddr, zeroAddr)
        await fiefdom1Contract.connect(vassal1).freezeMaxSupply()
        expect(await fiefdom1Contract.connect(vassal1).maxSupplyFrozen()).to.equal(true)
      })

      it('should revert if fiefdom has not been activated', async () => {
        await expectRevert(
          fiefdom1Contract.connect(vassal1).freezeMaxSupply(),
          'Fiefdom must be activated'
        )
      })

      it('should revert if called by non-owner', async () => {
        await fiefdom1Contract.connect(vassal1).activate('New Name', 'NEW', 'CC BY-NC 4.0', 123, rndAddr, zeroAddr)
        await expectRevert(
          fiefdom1Contract.connect(overlord).freezeMaxSupply(),
          'Ownable: caller is not the owner'
        )
      })
    })

    describe('setMaxSupply', () => {

      it('should update the license', async () => {
        await fiefdom1Contract.connect(vassal1).activate('New Name', 'NEW', 'CC BY-NC 4.0', 123, rndAddr, zeroAddr)

        await fiefdom1Contract.connect(vassal1).setMaxSupply(500)
        expect(await fiefdom1Contract.connect(vassal1).maxSupply()).to.equal(500)
        await fiefdom1Contract.connect(vassal1).setMaxSupply(12)
        expect(await fiefdom1Contract.connect(vassal1).maxSupply()).to.equal(12)
      })

      it('should revert if fiefdom is not activated', async () => {
        await expectRevert(
          fiefdom1Contract.connect(vassal1).setMaxSupply(500),
          'Fiefdom must be activated'
        )
      })

      it('should revert if new maxSupply is < totalSupply', async () => {
        await fiefdom1Contract.connect(vassal1).activate('New Name', 'NEW', 'CC BY-NC 4.0', 123, rndAddr, zeroAddr)

        await fiefdom1Contract.connect(vassal1).mintBatchTo(vassal2.address, 10, 1)

        await expectRevert(
          fiefdom1Contract.connect(vassal1).setMaxSupply(10),
          'maxSupply must be >= than totalSupply'
        )
        await fiefdom1Contract.connect(vassal1).setMaxSupply(11)
      })

      it('should revert if maxSupply is frozen', async () => {
        await fiefdom1Contract.connect(vassal1).activate('New Name', 'NEW', 'CC BY-NC 4.0', 123, rndAddr, zeroAddr)
        await fiefdom1Contract.connect(vassal1).freezeMaxSupply()

        await expectRevert(
          fiefdom1Contract.connect(vassal1).setMaxSupply(500),
          'maxSupply has been frozen'
        )
      })

      it('should revert if called by the non-owner', async () => {
        await fiefdom1Contract.connect(vassal1).activate('New Name', 'NEW', 'CC BY-NC 4.0', 123, rndAddr, zeroAddr)
        await expectRevert(
          fiefdom1Contract.connect(overlord).setMaxSupply(500),
          'Ownable: caller is not the owner'
        )
      })

    })

    describe('setLicense', () => {
      it('should update the license', async () => {
        await fiefdom1Contract.connect(vassal1).setLicense('CC0')
        expect(await fiefdom1Contract.connect(vassal1).license()).to.equal('CC0')
      })

      it('should revert if called by the non-owner', async () => {
        await expectRevert(
          fiefdom1Contract.connect(overlord).setLicense('CC0'),
          'Ownable: caller is not the owner'
        )
      })

    })

    describe('updateRoyaltyInfo', () => {

      it('should update the royalty info', async () => {
        await fiefdom1Contract.connect(vassal1).setRoyaltyInfo(vassal2.address, 2000)
        const royalties = await fiefdom1Contract.connect(vassal1).royaltyInfo(0, 100)
        expect(royalties[0]).to.equal(vassal2.address)
        expect(royalties[1]).to.equal(20)
      })

      it('should revert if called by the non-owner', async () => {
        await expectRevert(
          fiefdom1Contract.connect(overlord).setRoyaltyInfo(vassal2.address, 2000),
          'Ownable: caller is not the owner'
        )
      })

    })
  })

})
