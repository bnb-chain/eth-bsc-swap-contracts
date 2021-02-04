const BSCSwapAgentImpl = artifacts.require("BSCSwapAgentImpl");
const ETHSwapAgentImpl = artifacts.require("ETHSwapAgentImpl");

const ERC20ABC = artifacts.require("ERC20ABC");
const ERC20DEF = artifacts.require("ERC20DEF");
const ERC20EMPTYNAME = artifacts.require("ERC20EMPTYNAME");
const ERC20EMPTYSYMBOL = artifacts.require("ERC20EMPTYSYMBOL");

const fs = require('fs');
const Web3 = require('web3');
const truffleAssert = require('truffle-assertions');
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

let createdBEP20TokenAddr;
let swapTxFromETH2BSC;

contract('ETHSwapAgent and BSCSwapAgent', (accounts) => {
    it('Register Standard ERC20 and create swap pair', async () => {
        const ethSwap = await ETHSwapAgentImpl.deployed();
        const bscSwap = await BSCSwapAgentImpl.deployed();

        const ethSwapABIJsonFile = "test/abi/ethSwapABI.json";
        const ethSwapABI= JSON.parse(fs.readFileSync(ethSwapABIJsonFile));
        const ethSwapInstance = new web3.eth.Contract(ethSwapABI, ETHSwapAgentImpl.address);

        const bscSwapABIJsonFile = "test/abi/bscSwapABI.json";
        const bscSwapABI= JSON.parse(fs.readFileSync(bscSwapABIJsonFile));
        const bscSwapInstance = new web3.eth.Contract(bscSwapABI, BSCSwapAgentImpl.address);

        let isERC20ABCRegistered = await ethSwapInstance.methods.registeredERC20(ERC20ABC.address).call();
        assert.equal(isERC20ABCRegistered, false, "wrong register status");
        let isERC20DEFRegistered = await ethSwapInstance.methods.registeredERC20(ERC20DEF.address).call();
        assert.equal(isERC20DEFRegistered, false, "wrong register status");

        let registerTx = await ethSwap.registerSwapToBSC(ERC20ABC.address, {from: accounts[0]});
        console.log("tx: ", registerTx)
        console.log("tx: ", registerTx.tx)
        truffleAssert.eventEmitted(registerTx, "SwapPairRegister",(ev) => {
            return ev.erc20Addr === ERC20ABC.address && ev.name.toString() === "ABC token" && ev.symbol.toString() === "ABC" && ev.decimals.toString() === "18";
        });

        // create bsc swap pair
        let createTx = await bscSwap.createSwapPair(registerTx.tx, ERC20ABC.address, "ABC token", "ABC", web3.utils.toBN(18), {from: accounts[0]});
        truffleAssert.eventEmitted(createTx, "SwapPairCreated",(ev) => {
            createdBEP20TokenAddr = ev.bep20Addr;
            console.log("created bep20 token: ", createdBEP20TokenAddr)
            return ev.ethRegisterTxHash === registerTx.tx && ev.erc20Addr === ERC20ABC.address && ev.symbol.toString() === "ABC" && ev.decimals.toString() === "18";
        });

        // created pair
        try {
            await bscSwap.createSwapPair(registerTx.tx, ERC20ABC.address, "ABC token", "ABC", web3.utils.toBN(18), {from: accounts[0]});
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("duplicated swap pair"))
        }

        // registered
        try {
            await ethSwap.registerSwapToBSC(ERC20ABC.address, {from: accounts[0]});
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("already registered"))
        }

        // empty name
        try {
            await ethSwap.registerSwapToBSC(ERC20EMPTYNAME.address, {from: accounts[0]});
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("empty name"))
        }

        // empty symbol
        try {
            await ethSwap.registerSwapToBSC(ERC20EMPTYSYMBOL.address, {from: accounts[0]});
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("empty symbol"))
        }
    });

    it('Swap from ETH to BSC', async () => {
        const ethSwap = await ETHSwapAgentImpl.deployed();
        const erc20ABC = await ERC20ABC.deployed();

        const ethSwapABIJsonFile = "test/abi/ethSwapABI.json";
        const ethSwapABI= JSON.parse(fs.readFileSync(ethSwapABIJsonFile));
        const ethSwapInstance = new web3.eth.Contract(ethSwapABI, ETHSwapAgentImpl.address);

        const bscSwapABIJsonFile = "test/abi/bscSwapABI.json";
        const bscSwapABI= JSON.parse(fs.readFileSync(bscSwapABIJsonFile));
        const bscSwapInstance = new web3.eth.Contract(bscSwapABI, BSCSwapAgentImpl.address);

        await erc20ABC.approve(ETHSwapAgentImpl.address, "1000000000000", {from: accounts[0]})

        try {
            await ethSwap.swapETH2BSC(ERC20ABC.address, "100000", {from: accounts[0]})
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("swap fee is not enough"))
        }

        try {
            await ethSwap.swapETH2BSC(ERC20DEF.address, "100000", {from: accounts[0], value:web3.utils.toBN(10000000)})
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("not registered token"))
        }

        let swapTx = await ethSwap.swapETH2BSC(ERC20ABC.address, "100000", {from: accounts[0], value:web3.utils.toBN(10000000)});

        truffleAssert.eventEmitted(swapTx, "SwapStarted",(ev) => {
            swapTxFromETH2BSC = swapTx.tx;
            return ev.erc20Addr === ERC20ABC.address && ev.fromAddr === accounts[0] && ev.amount.toString() === "100000";
        });

        let fillTx = await ethSwap.fillBSC2ETHSwap(swapTxFromETH2BSC, ERC20ABC.address, accounts[0], "100000", {from: accounts[0]});
        truffleAssert.eventEmitted(fillTx, "SwapFilled",(ev) => {
            swapTxFromETH2BSC = swapTx.tx;
            return ev.erc20Addr === ERC20ABC.address && ev.amount.toString() === "100000";
        });

        // fill unregistered
        try {
            await ethSwap.fillBSC2ETHSwap(swapTxFromETH2BSC, ERC20DEF.address, accounts[0], "100000", {from: accounts[0]})
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("not registered token"))
        }
    });

    it('Swap from BSC to ETH', async () => {
        const bscSwap = await BSCSwapAgentImpl.deployed();

        const bscSwapABIJsonFile = "test/abi/bscSwapABI.json";
        const bscSwapABI= JSON.parse(fs.readFileSync(bscSwapABIJsonFile));
        const bscSwapInstance = new web3.eth.Contract(bscSwapABI, BSCSwapAgentImpl.address);

        const erc0ABIJsonFile = "test/abi/erc20ABI.json";
        const erc20ABI= JSON.parse(fs.readFileSync(erc0ABIJsonFile));
        const createdBEP2OToken = new web3.eth.Contract(erc20ABI, createdBEP20TokenAddr);


        await createdBEP2OToken.methods.approve(BSCSwapAgentImpl.address, "1000000000000").send({from: accounts[0]});

        let fillTx = await bscSwap.fillETH2BSCSwap(swapTxFromETH2BSC, ERC20ABC.address, accounts[0], "100000", {from: accounts[0]});
        truffleAssert.eventEmitted(fillTx, "SwapFilled",(ev) => {
            return ev.bep20Addr === createdBEP20TokenAddr && ev.amount.toString() === "100000";
        });

        let swapTx = await bscSwap.swapBSC2ETH(createdBEP20TokenAddr, "100000", {from: accounts[0], value:web3.utils.toBN(10000000000000000)});

        truffleAssert.eventEmitted(swapTx, "SwapStarted",(ev) => {
            return ev.bep20Addr === createdBEP20TokenAddr && ev.erc20Addr === ERC20ABC.address && ev.amount.toString() === "100000";
        });

        // fill unregistered
        try {
            await bscSwap.fillETH2BSCSwap(swapTxFromETH2BSC, ERC20DEF.address, accounts[0], "100000", {from: accounts[0]});
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("no swap pair for this token"))
        }
    });

    it('Set BSC to ETH swap fee', async () => {
        const bscSwap = await BSCSwapAgentImpl.deployed();

        await bscSwap.setSwapFee("100000", {from: accounts[0]});
        let swapFee = await bscSwap.swapFee();

        assert.ok(swapFee.toString() === "100000");
    });

    it('Set ETH to BSC swap fee', async () => {
        const ethSwap = await ETHSwapAgentImpl.deployed();

        await ethSwap.setSwapFee("100000", {from: accounts[0]});
        let swapFee = await ethSwap.swapFee();

        assert.ok(swapFee.toString() === "100000");
    });

});