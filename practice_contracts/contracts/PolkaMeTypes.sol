// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║  PolkaMe Shared Types                                            ║
 * ║  Enums, structs, custom errors & interface used by all contracts ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 */

// ═════════════════════════════════════════════════════════════════════
//  ENUMS
// ═════════════════════════════════════════════════════════════════════

enum VerificationState { Unverified, Pending, Verified }
enum ChainType          { Polkadot, Kusama, Astar, Moonbeam, Custom }
enum SocialType         { Twitter, Discord, Github }
enum ActivityStatus     { Success, Pending, Failed }
enum CredentialType     { KYC, DAOBadge, Reputation, SocialProof, ChainProof }
enum Vote               { None, Aye, Nay }
enum ValidatorStatus    { Active, Waiting, Inactive }

// ═════════════════════════════════════════════════════════════════════
//  STRUCTS  — Identity
// ═════════════════════════════════════════════════════════════════════

/// @notice EVM DID document — format: "did:ethr:0x..."
struct DIDDocument {
    string  didString;          // "did:ethr:0xABC..."
    string  displayName;
    uint8   reputationScore;    // 0-100
    int8    scoreChange;        // period change
    uint256 createdAt;
    uint256 updatedAt;
    bool    active;
}

/// @notice Maps EVM DID ↔ Polkadot DID  (the "Mapped Together" link)
struct DIDLink {
    string  evmDid;             // "did:ethr:0x..."
    string  polkadotDid;        // "did:polkadot:5Grw..."
    uint256 linkedAt;
    bool    verified;
    bool    active;
}

/// @notice Verifiable credential (KYC, DAO Badge, Reputation, etc.)
struct Credential {
    CredentialType credType;
    string  title;
    string  issuer;
    uint256 issuedAt;
    uint256 expiresAt;          // 0 = never
    bool    revoked;
    string  metadataURI;
}

/// @notice Verification status across 4 categories
struct VerificationStatus {
    VerificationState email;
    VerificationState governance;
    VerificationState socials;
    VerificationState kyc;
}

// ═════════════════════════════════════════════════════════════════════
//  STRUCTS  — Accounts
// ═════════════════════════════════════════════════════════════════════

struct LinkedChainAccount {
    ChainType chain;
    string  label;
    string  accountAddress;
    string  tag;
    uint256 linkedAt;
    bool    active;
}

struct LinkedSocialAccount {
    SocialType platform;
    string  handle;
    bool    verified;
    uint256 linkedAt;
    bool    active;
}

struct AuthorizedDApp {
    string  name;
    address dAppAddress;
    uint256 authorizedAt;
    uint256 lastAccessed;
    bool    active;
}

struct ActivityEntry {
    string         action;
    string         app;
    ActivityStatus status;
    uint256        timestamp;
}

// ═════════════════════════════════════════════════════════════════════
//  STRUCTS  — Governance
// ═════════════════════════════════════════════════════════════════════

struct Proposal {
    uint256 refNum;
    string  tag;
    string  title;
    string  description;
    uint256 ayeVotes;
    uint256 nayVotes;
    uint256 endTime;
    bool    active;
    address proposer;
}

struct Validator {
    string  shortName;
    string  initials;
    address validatorAddress;
    uint16  commissionBps;      // basis-points (300 = 3.0%)
    uint256 selfStake;
    ValidatorStatus status;
}

struct UserStake {
    uint256 totalStaked;
    uint256 claimableRewards;
    uint256 votingPower;
    uint256 lockExpiry;
    uint8   convictionMultiplier;   // 1x – 6x
    uint256 lastClaimedAt;
}

// ═════════════════════════════════════════════════════════════════════
//  STRUCTS  — Security
// ═════════════════════════════════════════════════════════════════════

struct PrivacyPreference {
    string label;
    string description;
    bool   enabled;
}

struct Session {
    string  device;
    string  browser;
    string  location;
    bool    isCurrent;
    uint256 lastActive;
    bool    active;
}

struct SecurityLogEntry {
    string  eventDescription;
    string  source;
    uint256 timestamp;
}

// ═════════════════════════════════════════════════════════════════════
//  CUSTOM ERRORS  (replace require-strings → saves ~2 KB bytecode)
// ═════════════════════════════════════════════════════════════════════

error NotOwner();
error NotVerifier();
error NotAuthorized();
error DIDNotFound();
error DIDRequired();
error DIDAlreadyExists();
error EmptyString();
error InvalidIndex();
error AlreadyVerified();
error AlreadyRemoved();
error AlreadyRevoked();
error AlreadyInitialized();
error NotActive();
error InvalidAddress();
error InsufficientStake();
error TokensLocked();
error TransferFailed();
error InvalidMultiplier();
error NoRewards();
error ProposalNotActive();
error VotingEnded();
error VotingNotEnded();
error InvalidVote();
error AlreadyVoted();
error CredentialIsRevoked();
error DIDLinkNotVerified();
error UnknownMethod();
error MustSendValue();
error CannotRevokeCurrent();
error TitleRequired();
error DurationRequired();

// ═════════════════════════════════════════════════════════════════════
//  INTERFACE  (so other contracts can call Identity)
// ═════════════════════════════════════════════════════════════════════

interface IPolkaMeIdentity {
    function hasDID(address _user) external view returns (bool);
    function trustedVerifiers(address _v) external view returns (bool);
    function owner() external view returns (address);
    function addScoreFor(address _user, uint8 _points) external;
    function subScoreFor(address _user, uint8 _points) external;
    function getCredentials(address _user) external view returns (Credential[] memory);
    function getDIDLinks(address _user) external view returns (DIDLink[] memory);
}
