pragma solidity 0.6.4;

contract  ETHSwapAgent {
    event SwapPairRegister(address indexed contractAddr, address indexed fromAddr);
    event SwapStart(address indexed contractAddr, address indexed fromAddr, address indexed toAddr, uint256 amount, uint256 feeAmount);
    event SwapFilled(address indexed contractAddr, bytes32 indexed bscTxHash, address indexed toAddress, uint256 amount);

    function createSwapPair(address contractAddr) external returns (bool) {
        return true;
    }

    function fillBSC2ETHSwap(bytes32 bscTxHash, address contractAddr, address toAddress, uint256 amount) external returns (bool) {
        return true;
    }

    function swapETH2BSC(address contractAddr, uint256 amount) payable external returns (bool) {
        return true;
    }
}