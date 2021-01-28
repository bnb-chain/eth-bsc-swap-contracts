const BEP20TokenImplementation = artifacts.require("BEP20TokenImplementation");
const BSCSwapAgent = artifacts.require("BSCSwapAgent");
const ETHSwapAgent = artifacts.require("ETHSwapAgent");
const BSCSwapUpgradeableProxy = artifacts.require("BSCSwapUpgradeableProxy");
const ETHSwapUpgradeableProxy = artifacts.require("ETHSwapUpgradeableProxy");

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

module.exports = function(deployer, network, accounts) {
    owner = accounts[0];
    proxyAdmin = accounts[1];
    bep20ProxyAdmin = accounts[2];
    deployer.then(async () => {
        await deployer.deploy(BEP20TokenImplementation);
        await deployer.deploy(BSCSwapAgent);
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
        await deployer.deploy(BSCSwapUpgradeableProxy, BSCSwapAgent.address, proxyAdmin, abiEncodeInitializeData);

        await deployer.deploy(ETHSwapAgent);
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
        await deployer.deploy(ETHSwapUpgradeableProxy, ETHSwapAgent.address, proxyAdmin, abiEncodeInitializeData);
    });
};
