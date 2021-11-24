require("@nomiclabs/hardhat-waffle");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.5.4",

  networks: {
    hardhat: {
      chainId: 1337,
    },
    localhost: {
      url: "http://localhost:8545",
      chainId: 1337
    }
  },
};
