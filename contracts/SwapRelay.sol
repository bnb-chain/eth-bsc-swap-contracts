pragma solidity 0.6.4;

import "./IBEP20.sol";

contract SwapRelay {
    uint256 public relayFee;
    address payable public relayer;
    address public owner;

    struct TokenConfig {
        uint256 lowerBound;
        uint256 upperBound;
    }

    mapping(address => TokenConfig) public tokens;

    event transferSuccess(address contractAddr, address toAddr, uint256 amount);

    modifier onlyOwner() {
        require(_owner == msg.sender, "caller is not the owner");
        _;
    }

    constructor (address payable relayerAddr) public {
        owner = msg.sender;
        relayer = relayerAddr;
    }

    function updateRelayFee(uint256 fee) public onlyOwner returns (bool) {
        relayFee = fee;
        return true;
    }

    function updateRelayerAddress(address addr) public onlyOwner returns (bool) {
        relayer = addr;
        return true;
    }

    function updateRelayerAddress(address addr) public onlyOwner returns (bool) {
        relayer = addr;
        return true;
    }

    function addToken(address contractAddr, uint256 lowerBound, uint256 upperBound) public onlyOwner returns (bool) {
        require(!tokens[contractAddr], "token already added");

        TokenConfig memory tokenConfig = TokenConfig({
            lowerBound: lowerBound,
            upperBound: upperBound
        });

        tokens[contractAddr] = tokenConfig;
        return true;
    }

    function removeToken(address contractAddr) public onlyOwner returns (bool) {
        require(tokens[contractAddr], "token does not exist");

        delete tokens[contractAddr];
        return true;
    }

    function transfer(address contractAddr, uint256 amount) external {
        require(tokens[contractAddr], "token is not supported");
        require(amount > tokens[contractAddr].lowerBound, "amount should be larger than lower bound");
        require(amount < tokens[contractAddr].upperBound, "amount should be less than upper bound");
        require(msg.value >= fee, "received BNB amount should be equal to the amount of relayFee");

        relayer.transfer(msg.value);

        bool success = IBEP20(contractAddr).transfer(relayer, amount);
        require(success, "transfer token failed");

        emit transferSuccess(contractAddr, relayer, amount);
    }
}