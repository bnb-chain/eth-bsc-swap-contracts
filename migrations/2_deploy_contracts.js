const BSCSwapAgent = artifacts.require("BSCSwapAgent");
const ETHSwapAgent = artifacts.require("ETHSwapAgent");
const BSCSwapUpgradeableProxy = artifacts.require("BSCSwapUpgradeableProxy");
const ETHSwapUpgradeableProxy = artifacts.require("ETHSwapUpgradeableProxy");

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

module.exports = function(deployer, network, accounts) {
};
