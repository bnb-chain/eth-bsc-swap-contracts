pragma solidity 0.6.4;

contract  BSCSwapAgent {
    event SwapPairCreated(address indexed contractAddr, address indexed ethContractAddr, string symbol, string name, uint8 decimals);
    event SwapStart(address indexed contractAddr, address indexed fromAddr, uint256 amount, uint256 feeAmount);
    event SwapFilled(address indexed contractAddr, bytes32 indexed ethTxHash, address indexed toAddress, uint256 amount);

    function createSwapPair(address ethContractAddr, string calldata name, string calldata symbol, uint8 decimals) external returns (bool) {
        return true;
    }

    function fillETH2BSCSwap(bytes32 ethTxHash, address contractAddr, address toAddress, uint256 amount) external returns (bool) {
        return true;
    }

    function swapBSC2ETH(address contractAddr, uint256 amount) payable external returns (bool) {
        return true;
    }
}