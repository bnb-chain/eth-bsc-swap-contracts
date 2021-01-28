pragma solidity 0.6.4;

import "./interfaces/ISwap.sol";
import "./interfaces/IBEP20.sol";
import "./bep20/BEP20UpgradeableProxy.sol";
import './interfaces/IProxyInitialize.sol';
import "openzeppelin-solidity/contracts/proxy/Initializable.sol";
import "openzeppelin-solidity/contracts/GSN/Context.sol";

contract  BSCSwapAgent is Context, Initializable {
    mapping(address => address) public swapMappingETH2BSC;
    mapping(address => address) public swapMappingBSC2ETH;

    address payable private _owner;
    address private _bep20Implementation;
    uint256 private _swapFee;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event SwapPairCreated(address indexed bep20Addr, address indexed erc20Addr, string symbol, string name, uint8 decimals);
    event SwapStarted(address indexed bep20Addr, address indexed fromAddr, uint256 amount, uint256 feeAmount);
    event SwapFilled(address indexed bep20Addr, bytes32 indexed ethTxHash, address indexed toAddress, uint256 amount);

    constructor() public {
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(_owner == _msgSender(), "Ownable: caller is not the owner");
        _;
    }

    function initialize(address bep20Impl, uint256 swapFee, address payable owner) public initializer {
        _bep20Implementation = bep20Impl;
        _swapFee = swapFee;
        _owner = owner;
    }

    /**
        * @dev Leaves the contract without owner. It will not be possible to call
        * `onlyOwner` functions anymore. Can only be called by the current owner.
        *
        * NOTE: Renouncing ownership will leave the contract without an owner,
        * thereby removing any functionality that is only available to the owner.
        */
    function renounceOwnership() public onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address payable newOwner) public onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }

    /**
     * @dev Returns the bep token owner.
     */
    function owner() external view returns (address) {
        return _owner;
    }

    /**
     * @dev Returns the bep20 implementation address
     */
    function bep20Implementation() external view returns (address) {
        return _bep20Implementation;
    }

    /**
     * @dev Returns minimum swap fee from BEP20 to ERC20
     */
    function swapFee() external view returns (uint256) {
        return _swapFee;
    }

    /**
     * @dev createSwapPair
     */
    function createSwapPair(address erc20Addr, string calldata name, string calldata symbol, uint8 decimals) onlyOwner external returns (address) {
        require(swapMappingETH2BSC[erc20Addr] == address(0x0), "duplicated swap pair");

        BEP20UpgradeableProxy proxyToken = new BEP20UpgradeableProxy(_bep20Implementation, msg.sender, "");
        IProxyInitialize token = IProxyInitialize(address(proxyToken));
        token.initialize(name, symbol, decimals, 0, true, address(this));

        swapMappingETH2BSC[erc20Addr] = address(token);
        swapMappingBSC2ETH[address(token)] = erc20Addr;

        emit SwapPairCreated(address(token), erc20Addr, symbol, name, decimals);
        return address(token);
    }

    /**
     * @dev fillETH2BSCSwap
     */
    function fillETH2BSCSwap(bytes32 ethTxHash, address erc20Addr, address toAddress, uint256 amount) onlyOwner external returns (bool) {
        address bscTokenAddr = swapMappingETH2BSC[erc20Addr];
        require(bscTokenAddr != address(0x0), "no swap pair for this token");

        ISwap(bscTokenAddr).mintTo(amount, toAddress);
        emit SwapFilled(bscTokenAddr, ethTxHash, toAddress, amount);

        return true;
    }

    /**
     * @dev swapBSC2ETH
     */
    function swapBSC2ETH(address bep20Addr, uint256 amount) payable external returns (bool) {
        require(swapMappingBSC2ETH[bep20Addr] != address(0x0), "no swap pair for this token");
        require(msg.value >= _swapFee, "swap fee is not enough");

        IBEP20(bep20Addr).transferFrom(msg.sender, address(this), amount);
        ISwap(bep20Addr).burn(amount);
        _owner.transfer(msg.value);

        emit SwapStarted(bep20Addr, msg.sender, amount, msg.value);
        return true;
    }
}