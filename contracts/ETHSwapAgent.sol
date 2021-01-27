pragma solidity 0.6.4;

import "openzeppelin-solidity/contracts/proxy/Initializable.sol";

contract  ETHSwapAgent is Initializable {
    event SwapPairRegister(address indexed contractAddr, address indexed fromAddr);
    event SwapStarted(address indexed contractAddr, address indexed fromAddr, address indexed toAddr, uint256 amount, uint256 feeAmount);
    event SwapFilled(address indexed contractAddr, bytes32 indexed bscTxHash, address indexed toAddress, uint256 amount);

    constructor() public {
    }

    function initialize(string memory name, string memory symbol, uint8 decimals, uint256 amount, bool mintable, address owner) public initializer {
    }

    function registerSwapToBSC(address contractAddr) external returns (bool) {
        return true;
    }

    function fillBSC2ETHSwap(bytes32 bscTxHash, address contractAddr, address toAddress, uint256 amount) external returns (bool) {
        return true;
    }

    function swapETH2BSC(address contractAddr, uint256 amount) payable external returns (bool) {
        return true;
    }
}