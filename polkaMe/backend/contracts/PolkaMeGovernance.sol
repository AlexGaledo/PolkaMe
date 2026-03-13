// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PolkaMeTypes.sol";

/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║  PolkaMe Governance  (Contract 3 of 4)                           ║
 * ║  Staking, conviction voting, proposals & validators              ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 *
 *  DEPLOY ORDER:
 *    1. Deploy PolkaMeIdentity
 *    2. Deploy PolkaMeGovernance(identityAddress)
 *
 *  Polkadot conviction voting:
 *    Multiplier | Lock      | Voting Power
 *    1x         | none      | 1 × stake
 *    2x         | 2 weeks   | 2 × stake
 *    3x         | 4 weeks   | 3 × stake
 *    4x         | 8 weeks   | 4 × stake
 *    5x         | 16 weeks  | 5 × stake
 *    6x         | 32 weeks  | 6 × stake
 */
contract PolkaMeGovernance {

    // ── State ────────────────────────────────────────────────────────
    address public owner;
    IPolkaMeIdentity public identity;

    Proposal[]  public proposals;
    Validator[] public validators;
    uint256     public nextRefNum = 800;

    mapping(uint256 => mapping(address => Vote)) public userVotes;
    mapping(address => UserStake) public userStakes;

    // ── Events ───────────────────────────────────────────────────────
    event ProposalCreated(uint256 indexed proposalId, uint256 refNum, string title, address proposer);
    event Voted(address indexed voter, uint256 indexed proposalId, Vote vote, uint256 weight);
    event ProposalClosed(uint256 indexed proposalId, bool passed);
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event ConvictionSet(address indexed user, uint8 multiplier, uint256 lockExpiry);
    event ValidatorAdded(uint256 indexed validatorId, string shortName, address validatorAddress);
    event ValidatorStatusChanged(uint256 indexed validatorId, ValidatorStatus newStatus);
    event CredentialShareRequested(address indexed user, string polkadotDid, uint256 credIndex);

    // ── Modifiers ────────────────────────────────────────────────────
    modifier onlyOwner() { if (msg.sender != owner) revert NotOwner(); _; }
    modifier hasDID()    { if (!identity.hasDID(msg.sender)) revert DIDRequired(); _; }

    // ── Constructor ──────────────────────────────────────────────────
    constructor(address _identity) {
        owner = msg.sender;
        identity = IPolkaMeIdentity(_identity);
    }

    // ═════════════════════════════════════════════════════════════════
    //  STAKING
    // ═════════════════════════════════════════════════════════════════

    /// @notice Stake tokens to gain voting power
    function stake() external payable hasDID {
        if (msg.value == 0) revert MustSendValue();

        UserStake storage s = userStakes[msg.sender];
        s.totalStaked += msg.value;
        if (s.convictionMultiplier == 0) s.convictionMultiplier = 1;
        s.votingPower = s.totalStaked * s.convictionMultiplier;

        emit Staked(msg.sender, msg.value);
    }

    /// @notice Unstake (must not be in conviction lock period)
    function unstake(uint256 _amount) external hasDID {
        UserStake storage s = userStakes[msg.sender];
        if (s.totalStaked < _amount) revert InsufficientStake();
        if (block.timestamp < s.lockExpiry) revert TokensLocked();

        s.totalStaked -= _amount;
        s.votingPower = s.totalStaked * s.convictionMultiplier;

        (bool sent, ) = payable(msg.sender).call{value: _amount}("");
        if (!sent) revert TransferFailed();
        emit Unstaked(msg.sender, _amount);
    }

    /// @notice Set conviction multiplier (1-6)
    function setConviction(uint8 _multiplier) external hasDID {
        if (_multiplier < 1 || _multiplier > 6) revert InvalidMultiplier();

        UserStake storage s = userStakes[msg.sender];
        s.convictionMultiplier = _multiplier;
        s.votingPower = s.totalStaked * _multiplier;

        if (_multiplier > 1) {
            s.lockExpiry = block.timestamp + (2 ** (_multiplier - 1) * 1 weeks);
        } else {
            s.lockExpiry = 0;
        }

        emit ConvictionSet(msg.sender, _multiplier, s.lockExpiry);
    }

    /// @notice Claim staking rewards
    function claimRewards() external hasDID {
        UserStake storage s = userStakes[msg.sender];
        if (s.claimableRewards == 0) revert NoRewards();

        uint256 amount = s.claimableRewards;
        s.claimableRewards = 0;
        s.lastClaimedAt = block.timestamp;

        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        if (!sent) revert TransferFailed();
        emit RewardsClaimed(msg.sender, amount);
    }

    function getStakingMetrics(address _user) external view returns (UserStake memory) {
        return userStakes[_user];
    }

    /// @notice Owner deposits reward funds into the pool
    function depositRewardPool() external payable onlyOwner {}

    /// @notice Owner distributes rewards to a staker
    function distributeReward(address _user, uint256 _amount) external onlyOwner {
        if (address(this).balance < _amount) revert InsufficientStake();
        userStakes[_user].claimableRewards += _amount;
    }

    // ═════════════════════════════════════════════════════════════════
    //  PROPOSALS & VOTING
    // ═════════════════════════════════════════════════════════════════

    /// @notice Create a governance proposal
    function createProposal(
        string calldata _title,
        string calldata _desc,
        uint256 _duration
    ) external hasDID {
        if (bytes(_title).length == 0) revert TitleRequired();
        if (_duration == 0) revert DurationRequired();

        uint256 refNum = nextRefNum++;

        proposals.push(Proposal({
            refNum: refNum,
            tag: string(abi.encodePacked("Referendum #", _uint2str(refNum))),
            title: _title,
            description: _desc,
            ayeVotes: 0,
            nayVotes: 0,
            endTime: block.timestamp + _duration,
            active: true,
            proposer: msg.sender
        }));

        emit ProposalCreated(proposals.length - 1, refNum, _title, msg.sender);
    }

    /// @notice Vote on a proposal (weight = staking voting power, min 1)
    function voteOnProposal(uint256 _id, Vote _vote) external hasDID {
        if (_id >= proposals.length) revert InvalidIndex();
        Proposal storage p = proposals[_id];
        if (!p.active) revert ProposalNotActive();
        if (block.timestamp >= p.endTime) revert VotingEnded();
        if (_vote != Vote.Aye && _vote != Vote.Nay) revert InvalidVote();
        if (userVotes[_id][msg.sender] != Vote.None) revert AlreadyVoted();

        uint256 weight = userStakes[msg.sender].votingPower;
        if (weight == 0) weight = 1;

        userVotes[_id][msg.sender] = _vote;
        if (_vote == Vote.Aye) p.ayeVotes += weight;
        else p.nayVotes += weight;

        emit Voted(msg.sender, _id, _vote, weight);
    }

    /// @notice Close a proposal after voting period ends
    function closeProposal(uint256 _id) external {
        if (_id >= proposals.length) revert InvalidIndex();
        Proposal storage p = proposals[_id];
        if (!p.active) revert ProposalNotActive();
        if (block.timestamp < p.endTime) revert VotingNotEnded();

        p.active = false;
        emit ProposalClosed(_id, p.ayeVotes > p.nayVotes);
    }

    function getActiveProposals() external view returns (Proposal[] memory) {
        return proposals;
    }

    function getProposal(uint256 _id) external view returns (Proposal memory) {
        if (_id >= proposals.length) revert InvalidIndex();
        return proposals[_id];
    }

    function getProposalCount() external view returns (uint256) {
        return proposals.length;
    }

    // ═════════════════════════════════════════════════════════════════
    //  VALIDATORS
    // ═════════════════════════════════════════════════════════════════

    function addValidator(
        string calldata _name,
        string calldata _initials,
        address _addr,
        uint16 _commission,
        uint256 _selfStake
    ) external onlyOwner {
        validators.push(Validator({
            shortName: _name,
            initials: _initials,
            validatorAddress: _addr,
            commissionBps: _commission,
            selfStake: _selfStake,
            status: ValidatorStatus.Active
        }));
        emit ValidatorAdded(validators.length - 1, _name, _addr);
    }

    function setValidatorStatus(uint256 _index, ValidatorStatus _status) external onlyOwner {
        if (_index >= validators.length) revert InvalidIndex();
        validators[_index].status = _status;
        emit ValidatorStatusChanged(_index, _status);
    }

    function getValidators() external view returns (Validator[] memory) {
        return validators;
    }

    // ═════════════════════════════════════════════════════════════════
    //  CROSS-CHAIN CREDENTIAL SHARING
    // ═════════════════════════════════════════════════════════════════

    /// @notice Share a credential to Polkadot side via XCM event
    function shareCredentialToPolkadot(uint256 _credIndex, uint256 _linkIndex) external hasDID {
        Credential[] memory creds = identity.getCredentials(msg.sender);
        if (_credIndex >= creds.length) revert InvalidIndex();
        if (creds[_credIndex].revoked) revert CredentialIsRevoked();

        DIDLink[] memory links = identity.getDIDLinks(msg.sender);
        if (_linkIndex >= links.length) revert InvalidIndex();
        if (!links[_linkIndex].verified) revert DIDLinkNotVerified();
        if (!links[_linkIndex].active) revert NotActive();

        emit CredentialShareRequested(msg.sender, links[_linkIndex].polkadotDid, _credIndex);
    }

    // ═════════════════════════════════════════════════════════════════
    //  ADMIN
    // ═════════════════════════════════════════════════════════════════

    function transferOwnership(address _newOwner) external onlyOwner {
        if (_newOwner == address(0)) revert InvalidAddress();
        owner = _newOwner;
    }

    // ═════════════════════════════════════════════════════════════════
    //  INTERNAL
    // ═════════════════════════════════════════════════════════════════

    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) return "0";
        uint256 j = _i;
        uint256 len;
        while (j != 0) { len++; j /= 10; }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) { k--; bstr[k] = bytes1(uint8(48 + (_i % 10))); _i /= 10; }
        return string(bstr);
    }

    /// @notice Allow contract to receive ETH (for staking/reward pool)
    receive() external payable {}
}
