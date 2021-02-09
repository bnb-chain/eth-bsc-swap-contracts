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

        let isERC20ABCRegistered = await ethSwap.registeredERC20(ERC20ABC.address);
        assert.equal(isERC20ABCRegistered, false, "wrong register status");
        let isERC20DEFRegistered = await ethSwap.registeredERC20(ERC20DEF.address);
        assert.equal(isERC20DEFRegistered, false, "wrong register status");

        let registerTx = await ethSwap.registerSwapPairToBSC(ERC20ABC.address, {from: accounts[0]});
        truffleAssert.eventEmitted(registerTx, "SwapPairRegister",(ev) => {
            return ev.erc20Addr === ERC20ABC.address && ev.name.toString() === "ABC token" && ev.symbol.toString() === "ABC" && ev.decimals.toString() === "18";
        });

        // create bsc swap pair
        let createTx = await bscSwap.createSwapPair(registerTx.tx, ERC20ABC.address, "ABC token", "ABC", web3.utils.toBN(18), {from: accounts[0]});
        truffleAssert.eventEmitted(createTx, "SwapPairCreated",(ev) => {
            createdBEP20TokenAddr = ev.bep20Addr;
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
            await ethSwap.registerSwapPairToBSC(ERC20ABC.address, {from: accounts[0]});
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("already registered"))
        }

        // empty name
        try {
            await ethSwap.registerSwapPairToBSC(ERC20EMPTYNAME.address, {from: accounts[0]});
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("empty name"))
        }

        // empty symbol
        try {
            await ethSwap.registerSwapPairToBSC(ERC20EMPTYSYMBOL.address, {from: accounts[0]});
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("empty symbol"))
        }
    });

    it('Swap from ETH to BSC', async () => {
        const ethSwap = await ETHSwapAgentImpl.deployed();
        const erc20ABC = await ERC20ABC.deployed();

        await erc20ABC.approve(ETHSwapAgentImpl.address, "1000000000000", {from: accounts[0]})

        try {
            await ethSwap.swapETH2BSC(ERC20ABC.address, "100000", {from: accounts[0]})
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("swap fee not equal"))
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
            assert.ok(error.toString().includes("bsc tx filled already"))
        }

        // fill filled tx
        try {
            await ethSwap.fillBSC2ETHSwap(swapTxFromETH2BSC, ERC20DEF.address, accounts[0], "100000", {from: accounts[0]})
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("bsc tx filled already"))
        }

        // fill unregistered token
        try {
            await ethSwap.fillBSC2ETHSwap("0x01", ERC20DEF.address, accounts[0], "100000", {from: accounts[0]})
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("not registered token"))
        }
    });

    it('Swap from BSC to ETH', async () => {
        const bscSwap = await BSCSwapAgentImpl.deployed();

        const erc20ABIJsonFile = "test/abi/erc20ABI.json";
        const erc20ABI= JSON.parse(fs.readFileSync(erc20ABIJsonFile));
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

        // fill filled tx
        try {
            await bscSwap.fillETH2BSCSwap(swapTxFromETH2BSC, ERC20DEF.address, accounts[0], "100000", {from: accounts[0]});
            assert.fail();
        } catch (error) {
            assert.ok(error.toString().includes("eth tx filled already"))
        }

        // fill unregistered token
        try {
            await bscSwap.fillETH2BSCSwap("0x01", ERC20DEF.address, accounts[0], "100000", {from: accounts[0]});
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

    it('ETH ownership', async () => {
        const ethSwap = await ETHSwapAgentImpl.deployed();

        await ethSwap.transferOwnership(accounts[1], {from: accounts[0]});
        let newOwner = await ethSwap.owner();

        assert.ok(newOwner === accounts[1]);

        await ethSwap.renounceOwnership({from: accounts[1]});
    });

    it('BSC ownership', async () => {
        const bscSwap = await BSCSwapAgentImpl.deployed();

        await bscSwap.transferOwnership(accounts[1], {from: accounts[0]});
        let newOwner = await bscSwap.owner();

        assert.ok(newOwner === accounts[1]);

        await bscSwap.renounceOwnership({from: accounts[1]});
    });
});