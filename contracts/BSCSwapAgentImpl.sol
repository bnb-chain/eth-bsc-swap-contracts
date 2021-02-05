pragma solidity 0.6.4;

import "./interfaces/ISwap.sol";
import "./interfaces/IBEP20.sol";
import "./bep20/BEP20UpgradeableProxy.sol";
import './interfaces/IProxyInitialize.sol';
import "openzeppelin-solidity/contracts/proxy/Initializable.sol";
import "openzeppelin-solidity/contracts/GSN/Context.sol";

contract  BSCSwapAgentImpl is Context, Initializable {
    mapping(address => address) public swapMappingETH2BSC;
    mapping(address => address) public swapMappingBSC2ETH;

    mapping(address => bool) public isERC20MappingToExistingBEP20;
    mapping(address => bool) public isExistingBEP20;

    address payable public owner;
    address public bep20ProxyAdmin;
    address public bep20Implementation;
    uint256 public swapFee;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event SwapPairCreated(bytes32 indexed ethRegisterTxHash, address indexed bep20Addr, address indexed erc20Addr, string symbol, string name, uint8 decimals);
    event SwapStarted(address indexed bep20Addr, address indexed erc20Addr, address indexed fromAddr, uint256 amount, uint256 feeAmount);
    event SwapFilled(address indexed bep20Addr, bytes32 indexed ethTxHash, address indexed toAddress, uint256 amount);

    constructor() public {
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(owner == _msgSender(), "Ownable: caller is not the owner");
        _;
    }

    function initialize(address bep20Impl, uint256 fee, address payable ownerAddr, address bep20ProxyAdminAddr) public initializer {
        bep20Implementation = bep20Impl;
        swapFee = fee;
        owner = ownerAddr;
        bep20ProxyAdmin = bep20ProxyAdminAddr;
    }

    /**
    * @dev Leaves the contract without owner. It will not be possible to call
    * `onlyOwner` functions anymore. Can only be called by the current owner.
    *
    * NOTE: Renouncing ownership will leave the contract without an owner,
    * thereby removing any functionality that is only available to the owner.
    */
    function renounceOwnership() public onlyOwner {
        emit OwnershipTransferred(owner, address(0));
        owner = address(0);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address payable newOwner) public onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /**
     * @dev Returns set minimum swap fee from BEP20 to ERC20
     */
    function setSwapFee(uint256 fee) onlyOwner external {
        swapFee = fee;
    }

    /**
     * @dev createSwapPair
     */
    function createSwapPair(bytes32 ethTxHash, address erc20Addr, string calldata name, string calldata symbol, uint8 decimals) onlyOwner external returns (address) {
        require(swapMappingETH2BSC[erc20Addr] == address(0x0), "duplicated swap pair");

        BEP20UpgradeableProxy proxyToken = new BEP20UpgradeableProxy(bep20Implementation, bep20ProxyAdmin, "");
        IProxyInitialize token = IProxyInitialize(address(proxyToken));
        token.initialize(name, symbol, decimals, 0, true, address(this));

        swapMappingETH2BSC[erc20Addr] = address(token);
        swapMappingBSC2ETH[address(token)] = erc20Addr;

        emit SwapPairCreated(ethTxHash, address(token), erc20Addr, symbol, name, decimals);
        return address(token);
    }

    function compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }

    /**
     * @dev addSwapPair
     */
    function addSwapPairForExistingBEP20(address bep20Addr, address erc20Addr, string memory erc20Name, string memory erc20Symbol, string memory erc20Decimals) onlyOwner external returns (bool) {
        require(swapMappingETH2BSC[erc20Addr] != address(0x0), "duplicated erc20");
        require(swapMappingBSC2ETH[bep20Addr] != address(0x0), "duplicated bep20");

        string memory name = IBEP20(bep20Addr).name();
        string memory symbol = IBEP20(bep20Addr).symbol();
        uint8 decimals = IBEP20(bep20Addr).decimals();

        require(compareStrings(name, erc20Name), "name mismatch");
        require(compareStrings(symbol, erc20Symbol), "symbol mismatch");
        require(decimals == erc20Decimals, "decimals mismatch");

        swapMappingETH2BSC[erc20Addr] = bep20Addr;
        swapMappingBSC2ETH[bep20Addr] = erc20Addr;
        isERC20MappingToExistingBEP20[erc20Addr] = true;
        isExistingBEP20[bep20Addr] = true;

        emit SwapPairCreated(bytes32(0x00), bep20Addr, erc20Addr, symbol, name, decimals);

        return true;
    }

    /**
     * @dev fillETH2BSCSwap
     */
    function fillETH2BSCSwap(bytes32 ethTxHash, address erc20Addr, address toAddress, uint256 amount) onlyOwner external returns (bool) {
        address bscTokenAddr = swapMappingETH2BSC[erc20Addr];
        require(bscTokenAddr != address(0x0), "no swap pair for this token");

        if (isERC20MappingToExistingBEP20[erc20Addr]) {
            IBEP20(bscTokenAddr).transfer(toAddress, amount);
        } else {
            ISwap(bscTokenAddr).mintTo(amount, toAddress);
        }
        emit SwapFilled(bscTokenAddr, ethTxHash, toAddress, amount);

        return true;
    }

    /**
     * @dev swapBSC2ETH
     */
    function swapBSC2ETH(address bep20Addr, uint256 amount) payable external returns (bool) {
        address erc20Addr = swapMappingBSC2ETH[bep20Addr];
        require(erc20Addr != address(0x0), "no swap pair for this token");
        require(msg.value >= swapFee, "swap fee is not enough");

        IBEP20(bep20Addr).transferFrom(msg.sender, address(this), amount);
        if (!isExistingBEP20[bep20Addr]) {
            ISwap(bep20Addr).burn(amount);
        }
        if (msg.value != 0) {
            owner.transfer(msg.value);
        }

        emit SwapStarted(bep20Addr, erc20Addr, msg.sender, amount, msg.value);
        return true;
    }
}