const BSCSwapAgentImpl = artifacts.require("BSCSwapAgentImpl");
const ETHSwapAgentImpl = artifacts.require("ETHSwapAgentImpl");
const BSCSwapAgentUpgradeableProxy = artifacts.require("BSCSwapAgentUpgradeableProxy");
const ETHSwapAgentUpgradeableProxy = artifacts.require("ETHSwapAgentUpgradeableProxy");

const ERC20ABC = artifacts.require("ERC20ABC");
const ERC20DEF = artifacts.require("ERC20DEF");

const fs = require('fs');
const Web3 = require('web3');
const truffleAssert = require('truffle-assertions');
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));


contract('ETHSwapAgent and BSCSwapAgent', (accounts) => {
    it('Register Standard ERC20 and create swap pair', async () => {
        const ethSwapABIJsonFile = "test/abi/ethSwapABI.json";
        const ethSwapABI= JSON.parse(fs.readFileSync(ethSwapABIJsonFile));
        const ethSwapInstance = new web3.eth.Contract(ethSwapABI, ETHSwapAgentUpgradeableProxy.address);

        const bscSwapABIJsonFile = "test/abi/bscSwapABI.json";
        const bscSwapABI= JSON.parse(fs.readFileSync(bscSwapABIJsonFile));
        const bscSwapInstance = new web3.eth.Contract(bscSwapABI, BSCSwapAgentUpgradeableProxy.address);

        let isERC20ABCRegistered = await ethSwapInstance.methods.registeredERC20(ERC20ABC.address).call();
        assert.equal(isERC20ABCRegistered, false, "wrong register status");
        let isERC20DEFRegistered = await ethSwapInstance.methods.registeredERC20(ERC20DEF.address).call();
        assert.equal(isERC20DEFRegistered, false, "wrong register status");

        const registerTx = await ethSwapInstance.methods.registerSwapToBSC(ERC20ABC.address).send({from: accounts[0]});
        console.log(registerTx);
        ethSwapABI.decode()
        truffleAssert.eventEmitted(registerTx, "SwapPairRegister",(ev) => {
            console.log(ev);
            return ev.erc20Addr === ERC20ABC.address && ev.name === "ABC Token" && ev.name === "ABC" && ev.decimals === 18;
        });

        isERC20ABCRegistered = await ethSwapInstance.methods.registeredERC20(ERC20ABC.address).call();
        assert.equal(isERC20ABCRegistered, true, "wrong register status");
    });
    // it('Swap from ETH to BSC', async () => {
    //
    // });
    // it('Swap from BSC to ETH', async () => {
    //
    // });
    // it('Register non-standard ERC20 and create swap pair', async () => {
    //
    // });
    // it('Swap from ETH to BSC', async () => {
    //
    // });
    // it('Swap from BSC to ETH', async () => {
    //
    // });
});