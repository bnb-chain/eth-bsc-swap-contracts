const BEP20TokenImplementation = artifacts.require("BEP20TokenImplementation");
const BSCSwapAgentImpl = artifacts.require("BSCSwapAgentImpl");
const ETHSwapAgentImpl = artifacts.require("ETHSwapAgentImpl");
const BSCSwapAgentUpgradeableProxy = artifacts.require("BSCSwapAgentUpgradeableProxy");
const ETHSwapAgentUpgradeableProxy = artifacts.require("ETHSwapAgentUpgradeableProxy");

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

module.exports = function(deployer, network, accounts) {
    owner = accounts[0];
    proxyAdmin = accounts[1];
    bep20ProxyAdmin = accounts[2];
    deployer.then(async () => {
        await deployer.deploy(BEP20TokenImplementation);
        await deployer.deploy(BSCSwapAgentImpl);
        let abiEncodeInitializeData = web3.eth.abi.encodeFunctionCall({
            "inputs": [
                {
                    "internalType": "address",
                    "name": "bep20Impl",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "swapFee",
                    "type": "uint256"
                },
                {
                    "internalType": "address payable",
                    "name": "owner",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "bep20ProxyAdminAddr",
                    "type": "address"
                }
            ],
            "name": "initialize",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }, [BEP20TokenImplementation.address, "10000000000000000", owner, bep20ProxyAdmin]);
        await deployer.deploy(BSCSwapAgentUpgradeableProxy, BSCSwapAgentImpl.address, proxyAdmin, abiEncodeInitializeData);

        await deployer.deploy(ETHSwapAgentImpl);
        abiEncodeInitializeData = web3.eth.abi.encodeFunctionCall({
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "swapFee",
                    "type": "uint256"
                },
                {
                    "internalType": "address payable",
                    "name": "owner",
                    "type": "address"
                }
            ],
            "name": "initialize",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }, [0, owner]);
        await deployer.deploy(ETHSwapAgentUpgradeableProxy, ETHSwapAgentImpl.address, proxyAdmin, abiEncodeInitializeData);
    });
};
