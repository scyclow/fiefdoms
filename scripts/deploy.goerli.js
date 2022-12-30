async function main() {
  signers = await ethers.getSigners()
  fiefdomLord = signers[0]


  // FiefdomsFactory = await ethers.getContractFactory('Fiefdoms', fiefdomLord)
  // Fiefdoms = await FiefdomsFactory.deploy()
  // await Fiefdoms.deployed()

  // await Fiefdoms.connect(fiefdomLord).mintBatch(fiefdomLord.address, 20)

  FiefdomsMinterFactory = await ethers.getContractFactory('FiefdomsMinter', fiefdomLord)
  FiefdomsMinter = await FiefdomsMinterFactory.deploy()
  await FiefdomsMinter.deployed()
  console.log(FiefdomsMinter.address)

}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });