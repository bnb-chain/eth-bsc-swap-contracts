pragma solidity 0.6.4;

import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./IBEP20.sol";

contract SwapProxy is Context, Ownable {
    uint256 public relayFee;
    bool public status;

    struct TokenConfig {
        address contractAddr;
        uint256 lowerBound;
        uint256 upperBound;
        address relayer;
    }

    TokenConfig[] public tokens;
    mapping(address => uint256) public tokenIndexMap;

    event tokenTransfer(address indexed contractAddr, address indexed toAddr, uint256 indexed amount);
    event bnbTransfer(address indexed toAddr, uint256 indexed amount);
    event feeUpdate(uint256 fee);
    event statusUpdate(bool status);
    event tokenAdd(address indexed contractAddr, address indexed relayer, uint256 lowerBound, uint256 upperBound);
    event tokenRemove(address indexed contractAddr);

    constructor (uint256 fee) public {
        relayFee = fee;
    }

    function close() public onlyOwner {
        address payable ownerAddr = payable(owner());
        selfdestruct(ownerAddr);
    }

    function setStatus(bool statusToUpdate) public onlyOwner returns (bool) {
        status = statusToUpdate;
        emit statusUpdate(statusToUpdate);
        return true;
    }

    function updateRelayFee(uint256 fee) onlyOwner external returns (bool) {
        relayFee = fee;
        emit feeUpdate(fee);
        return true;
    }

    function addOrUpdateToken(address contractAddr, address relayer, uint256 lowerBound, uint256 upperBound) onlyOwner external returns (bool) {
        require(contractAddr != address(0x0), "contract address should not be empty");
        require(relayer != address(0x0), "relayer address should not be empty");

        TokenConfig memory tokenConfig = TokenConfig({
            contractAddr:    contractAddr,
            lowerBound:     lowerBound,
            upperBound:     upperBound,
            relayer:        relayer
        });

        uint256 index = tokenIndexMap[contractAddr];
        if (index == 0) {
            tokens.push(tokenConfig);
            tokenIndexMap[contractAddr] = tokens.length;
        } else {
            tokens[index - 1] = tokenConfig;
        }
        emit tokenAdd(contractAddr, relayer, lowerBound, upperBound);
        return true;
    }

    function removeToken(address contractAddr) onlyOwner external returns (bool) {
        require(contractAddr != address(0x0), "contract address should not be empty");

        uint256 index = tokenIndexMap[contractAddr];
        require(index > 0, "token does not exist");

        TokenConfig memory tokenConfig = tokens[index - 1];
        delete tokenIndexMap[tokenConfig.contractAddr];

        if (index != tokens.length) {
            tokens[index - 1] = tokens[tokens.length - 1];
            tokenIndexMap[tokens[index - 1].contractAddr] = index;
        }
        tokens.pop();

        emit tokenRemove(contractAddr);
        return true;
    }

    function transfer(address contractAddr, address to,  uint256 amount) onlyOwner external returns (bool) {
        require(amount > 0, "amount should be larger than 0");
        require(contractAddr != address(0x0), "contract address should not be empty");
        require(to != address(0x0), "relayer address should not be empty");

        bool success = IBEP20(contractAddr).transfer(to, amount);
        require(success, "transfer token failed");

        return true;
    }

    function swap(address contractAddr, uint256 amount) payable external returns (bool) {
        require(msg.value >= relayFee, "received BNB amount should be equal to the amount of relayFee");
        require(amount > 0, "amount should be larger than 0");

        uint256 index = tokenIndexMap[contractAddr];
        require(index > 0, "token does not exist");

        TokenConfig memory tokenConfig = tokens[index - 1];
        require(amount >= tokenConfig.lowerBound, "amount should be larger than lower bound");
        require(amount <= tokenConfig.upperBound, "amount should be less than upper bound");

        address payable relayerAddr = payable(tokenConfig.relayer);

        relayerAddr.transfer(msg.value);

        bool success = IBEP20(contractAddr).transferFrom(msg.sender, relayerAddr, amount);
        require(success, "transfer token failed");

        emit tokenTransfer(contractAddr, relayerAddr, amount);
        emit bnbTransfer(relayerAddr, msg.value);
        return true;
    }
}
