async function main() {
  signers = await ethers.getSigners()
  fiefdomLord = signers[0]


  FiefdomsFactory = await ethers.getContractFactory('Fiefdoms', fiefdomLord)
  Fiefdoms = await FiefdomsFactory.deploy()
  await Fiefdoms.deployed()

  await Fiefdoms.connect(fiefdomLord).mintBatch(fiefdomLord.address, 20)

  FiefdomsMinterFactory = await ethers.getContractFactory('FiefdomsMinter', fiefdomLord)
  FiefdomsMinter = await FiefdomsMinterFactory.deploy(Fiefdoms.address)
  await FiefdomsMinter.deployed()

  await Fiefdoms.connect(fiefdomLord).setMinter(FiefdomsMinter.address)
  await Fiefdoms.connect(fiefdomLord).updateOperatorAllowList('0x1E0049783F008A0085193E00003D00cd54003c71', true)


  console.log('base', Fiefdoms.address)
  console.log('minter', FiefdomsMinter.address)

}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });