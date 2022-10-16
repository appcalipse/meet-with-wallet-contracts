// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.4 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/// @notice Main Meet With Wallet paid meeting contract handler
/// @author falleco.eth
abstract contract AbstractPaidMeeting is Ownable {
    using SafeERC20 for ERC20;

    // @notice mapping of meeting
    mapping(string => bool) private meetings;

    // @notice mapping of meeting prices
    mapping(string => uint256) private meetingPrices;

    // @notice mapping of meeting owners
    mapping(string => address) private meetingOwners;

    // @notice mapping of payment date limit for meetings, optional
    mapping(string => uint256) private expiryTimes;

    // @notice mapping of meetings paid by wallets
    mapping(address => mapping(string => bool)) private paidSubscriptions;

    // @notice meet with wallet tax, in %
    uint256 public meetWithWalletTax = 5;

    mapping(address => bool) private acceptableTokens;

    ////////////
    // EVENTS //
    ////////////
    event MWWMeetingCreated(
        address indexed owner,
        string meetingId,
        uint256 price,
        uint256 expiryTime
    );

    event MWWMeetingSubscribed(
        address indexed wallet,
        string meetingId,
        uint256 price
    );

    event MWWMeetingPaymentSplit(
        address indexed wallet,
        string meetingId,
        uint256 netValue,
        uint256 tax
    );

    event MWWTaxChange(uint256 oldTax, uint256 newTax);

    ////////////////
    // Structures //
    ////////////////

    /// @notice make sure that the meeting exists in the contract
    modifier isPaidMeeting(string calldata meetingId) {
        require(
            meetings[meetingId],
            "The meeting is not registered as paid in the contract"
        );
        _;
    }

    modifier notPaidYet(string calldata meetingId) {
        require(
            !paidSubscriptions[msg.sender][meetingId],
            "The meeting is already paid for this wallet"
        );
        _;
    }

    //////////////////////
    // Public Functions //
    //////////////////////
    constructor(address _acceptableTokens) {
        // for (uint256 i = 0; i < _acceptableTokens.length; i++) {
        //     acceptableTokens[_acceptableTokens[i]] = true;
        // }
        acceptableTokens[_acceptableTokens] = true;
    }

    // @notice create a new paid meeting
    function register(
        string calldata meetingId,
        uint256 meetingPrice,
        uint256 expiryTime
    ) public {
        require(meetingPrice > 0, "The prices must be greater than 0");

        meetings[meetingId] = true;
        meetingPrices[meetingId] = meetingPrice;
        expiryTimes[meetingId] = expiryTime;
        meetingOwners[meetingId] = msg.sender;

        emit MWWMeetingCreated(msg.sender, meetingId, meetingPrice, expiryTime);
    }

    // @notice checks if a wallet is subscribed to a specific meeting
    function hasAccess(string calldata meetingId) public view returns (bool) {
        return paidSubscriptions[msg.sender][meetingId];
    }

    // @notice subscribe a wallet to a meeting, via payment
    function subscribe(address tokenAddress, string calldata meetingId)
        public
        payable
        isPaidMeeting(meetingId)
        notPaidYet(meetingId)
    {
        require(acceptableTokens[tokenAddress], "Token not accepted");
        (uint256 amountInNative, uint256 timestamp) = getNativeConvertedValue(
            meetingPrices[meetingId]
        );

        require(timestamp > (block.timestamp - 3 hours), "Price is outdated");
        require(
            msg.value >= amountInNative,
            string(
                abi.encodePacked(
                    "Paid value is lower the meeting price. expected: ",
                    Strings.toString(amountInNative),
                    " got: ",
                    Strings.toString(msg.value),
                    " for: U$",
                    Strings.toString(meetingPrices[meetingId])
                )
            )
        );

        uint256 amountToSendToOwner = (amountInNative / 100) *
            (100 - meetWithWalletTax);
        uint256 amountToStoreAsTax = amountInNative - amountToSendToOwner;

        ERC20 token = ERC20(tokenAddress);
        require(
            token.balanceOf(msg.sender) >= amountInNative,
            "Insufficient funds"
        );

        // transfer to the token owner
        token.safeTransferFrom(
            msg.sender,
            meetingOwners[meetingId],
            amountToSendToOwner
        );

        // transfer the contract tax
        token.safeTransferFrom(msg.sender, address(this), amountToStoreAsTax);

        paidSubscriptions[msg.sender][meetingId] = true;
        // emit MWWMeetingSubscribed(
        //     msg.sender,
        //     meetingId,
        //     meetingPrices[meetingId]
        // );

        emit MWWMeetingPaymentSplit(
            msg.sender,
            meetingId,
            amountToSendToOwner,
            amountToStoreAsTax
        );
    }

    // @notice update mww percentual tax value
    function setTax(uint256 tax) public onlyOwner {
        require(tax > 0, "Tax is percentual and must be greater than 0");
        require(
            tax <= 100,
            "Tax is percentual and must lesser or equal to 100"
        );

        uint256 oldTax = meetWithWalletTax;
        meetWithWalletTax = tax;
        emit MWWTaxChange(oldTax, meetWithWalletTax);
    }

    function withdraw(
        address tokenAddress,
        uint256 amount,
        address destination
    ) public onlyOwner {
        require(amount > 0, "Amount can't be zero");
        require(destination != address(0), "Destination can't be zero");
        require(destination != address(this), "Can't send to this contract");

        if (tokenAddress == address(0)) {
            (bool ok, ) = destination.call{value: amount}("");
            require(ok, "Failed to withdraw funds");
        } else {
            require(acceptableTokens[tokenAddress], "Token not accepted");
            ERC20(tokenAddress).safeTransfer(destination, amount);
        }
    }

    function getNativeConvertedValue(uint256 usdPrice)
        public
        view
        virtual
        returns (uint256 amountInNative, uint256 timestamp);
}
