async function main() {
  signers = await ethers.getSigners()
  fiefdomLord = signers[0]


  FiefdomsFactory = await ethers.getContractFactory('Fiefdoms', fiefdomLord)
  Fiefdoms = await FiefdomsFactory.deploy()
  await Fiefdoms.deployed()

  await Fiefdoms.connect(fiefdomLord).mint(fiefdomLord.address)

}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });