// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice TEST TOKEN ONLY. No redemption, price peg, or real USD backing.
contract DemoUSD is ERC20, Ownable {
    uint256 public constant FAUCET_AMOUNT = 1_000 * 1e6;
    mapping(address => bool) public faucetClaimed;

    constructor(address initialOwner) ERC20("Habit Demo USD", "DemoUSD") Ownable(initialOwner) {}

    function decimals() public pure override returns (uint8) { return 6; }

    /// @notice One faucet claim per address; testnet only.
    function faucet() external {
        require(!faucetClaimed[msg.sender], "Faucet already claimed");
        faucetClaimed[msg.sender] = true;
        _mint(msg.sender, FAUCET_AMOUNT);
    }

    /// @notice Test admin mint; NOT a stablecoin implementation.
    function mint(address recipient, uint256 amount) external onlyOwner {
        require(recipient != address(0), "Zero recipient");
        _mint(recipient, amount);
    }
}
