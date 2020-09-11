pragma solidity 0.6.4;

import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./IBEP20.sol";

contract SwapProxy is Context, Ownable {
    uint256 public swapFee;
    address payable public relayer;

    event tokenTransfer(address indexed contractAddr, address indexed fromAddr, address indexed toAddr, uint256 amount, uint256 feeAmount);

    constructor (address payable relayerAddr, uint256 fee) public {
        relayer = relayerAddr;
        swapFee = fee;
    }

    function close() public onlyOwner {
        address payable ownerAddr = payable(owner());
        selfdestruct(ownerAddr);
    }

    function swap(address contractAddr, uint256 amount) payable external returns (bool) {
        require(msg.value >= swapFee, "fee amount should not be less than the amount of swapFee");
        require(amount > 0, "amount should be larger than 0");

        relayer.transfer(msg.value);

        bool success = IBEP20(contractAddr).transferFrom(msg.sender, relayer, amount);
        require(success, "transfer token failed");

        emit tokenTransfer(contractAddr, msg.sender, relayer, amount, msg.value);
        return true;
    }
}
