pragma solidity 0.6.4;

import "./IBEP20.sol";
import "./Context.sol";
import "./Ownable.sol";

contract SwapRelay is Context, Ownable {
    uint256 public relayFee;
    address payable public relayer;
    address public owner;

    struct TokenConfig {
        uint256 lowerBound;
        uint256 upperBound;
        bool    exists;
    }

    mapping(address => TokenConfig) public tokens;

    event transferSuccess(address contractAddr, address toAddr, uint256 amount);

    modifier onlyOwner() {
        require(owner == msg.sender, "caller is not the owner");
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

    function updateRelayerAddress(address payable addr) public onlyOwner returns (bool) {
        relayer = addr;
        return true;
    }

    function addOrUpdateToken(address contractAddr, uint256 lowerBound, uint256 upperBound) public onlyOwner returns (bool) {
        TokenConfig memory tokenConfig = TokenConfig({
            lowerBound: lowerBound,
            upperBound: upperBound,
            exists:     true
        });

        tokens[contractAddr] = tokenConfig;
        return true;
    }

    function removeToken(address contractAddr) public onlyOwner returns (bool) {
        require(tokens[contractAddr].exists, "token does not exist");

        delete tokens[contractAddr];
        return true;
    }

    function transfer(address contractAddr, uint256 amount) payable external {
        require(msg.value >= relayFee, "received BNB amount should be equal to the amount of relayFee");

        TokenConfig memory tokenConfig = tokens[contractAddr];
        require(tokenConfig.exists, "token is not supported");
        require(amount > tokenConfig.lowerBound, "amount should be larger than lower bound");
        require(amount < tokenConfig.upperBound, "amount should be less than upper bound");

        relayer.transfer(msg.value);

        bool success = IBEP20(contractAddr).transferFrom(msg.sender, relayer, amount);
        require(success, "transfer token failed");

        emit transferSuccess(contractAddr, relayer, amount);
    }
}
