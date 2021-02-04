const BEP20TokenImplementation = artifacts.require("BEP20TokenImplementation");
const BSCSwapAgentImpl = artifacts.require("BSCSwapAgentImpl");
const ETHSwapAgentImpl = artifacts.require("ETHSwapAgentImpl");

const ERC20ABC = artifacts.require("ERC20ABC");
const ERC20DEF = artifacts.require("ERC20DEF");
const ERC20EMPTYSYMBOL = artifacts.require("ERC20EMPTYSYMBOL");
const ERC20EMPTYNAME = artifacts.require("ERC20EMPTYNAME");

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

module.exports = function(deployer, network, accounts) {
    owner = accounts[0];
    proxyAdmin = accounts[1];
    bep20ProxyAdmin = accounts[2];
    deployer.then(async () => {
        await deployer.deploy(ERC20ABC);
        await deployer.deploy(ERC20DEF);
        await deployer.deploy(ERC20EMPTYSYMBOL);
        await deployer.deploy(ERC20EMPTYNAME);

        await deployer.deploy(BEP20TokenImplementation);
        await deployer.deploy(BSCSwapAgentImpl, BEP20TokenImplementation.address, "10000000000000000", bep20ProxyAdmin);
        await deployer.deploy(ETHSwapAgentImpl, "10000000");
    });
};
