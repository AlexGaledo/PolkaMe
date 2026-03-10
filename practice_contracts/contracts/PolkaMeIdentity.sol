// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PolkaMeTypes.sol";

/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║  PolkaMe Identity — EVM Side  (Contract 1 of 4)                  ║
 * ║  Deployed on: Moonbeam / Astar                                   ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 *
 *  Handles:
 *    1. DID creation & management        (did:ethr:0x...)
 *    2. DID Linking — EVM ↔ Polkadot     ("Mapped Together")
 *    3. Credentials & Attestations       (KYC, DAO Badge, Reputation)
 *    4. Verification hub
 *    5. Platform stats                   (landing page)
 *    6. Score delegation for Accounts contract
 */
contract PolkaMeIdentity {

    // ── State ────────────────────────────────────────────────────────
    address public owner;
    mapping(address => bool) public trustedVerifiers;
    mapping(address => bool) public authorizedContracts;

    mapping(address => DIDDocument)       public dids;
    mapping(address => bool)              public hasDID;
    mapping(address => DIDLink[])         public didLinks;
    mapping(address => Credential[])      public credentials;
    mapping(address => VerificationStatus) public verifications;

    uint256 public totalUsers;
    uint256 public totalCredentials;
    uint256 public totalDIDLinks;

    // ── Events ───────────────────────────────────────────────────────
    event DIDCreated(address indexed user, uint256 timestamp);
    event DIDUpdated(address indexed user, uint8 newScore);
    event DIDLinked(address indexed user, string polkadotDid, uint256 timestamp);
    event DIDLinkVerified(address indexed user, uint256 linkIndex);
    event DIDLinkRemoved(address indexed user, uint256 linkIndex);
    event CredentialIssued(address indexed user, uint256 indexed credIndex, CredentialType credType);
    event CredentialDidRevoke(address indexed user, uint256 indexed credIndex);
    event CredentialShared(address indexed user, address indexed requester, uint256 indexed credIndex);
    event VerificationSubmitted(address indexed user, uint8 field);
    event VerificationStateChanged(address indexed user, uint8 field, VerificationState newState);
    event VerificationRequested(address indexed dApp, address indexed user);

    // ── Modifiers ────────────────────────────────────────────────────
    modifier onlyOwner()    { if (msg.sender != owner) revert NotOwner(); _; }
    modifier onlyVerifier() { if (!trustedVerifiers[msg.sender] && msg.sender != owner) revert NotVerifier(); _; }
    modifier didExists(address _u) { if (!hasDID[_u]) revert DIDNotFound(); _; }
    modifier onlyDIDOwner() { if (!hasDID[msg.sender]) revert DIDRequired(); _; }

    // ── Constructor ──────────────────────────────────────────────────
    constructor() {
        owner = msg.sender;
        trustedVerifiers[msg.sender] = true;
    }

    // ═════════════════════════════════════════════════════════════════
    //  1. DID MANAGEMENT
    // ═════════════════════════════════════════════════════════════════

    /// @notice Create an EVM DID. DID string = "did:ethr:<address>" built off-chain.
    function createDID(string calldata _displayName) external {
        if (hasDID[msg.sender]) revert DIDAlreadyExists();
        if (bytes(_displayName).length == 0) revert EmptyString();

        dids[msg.sender] = DIDDocument({
            didString: "",  // built off-chain: "did:ethr:" + address
            displayName: _displayName,
            reputationScore: 10,
            scoreChange: 0,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            active: true
        });

        verifications[msg.sender] = VerificationStatus({
            email: VerificationState.Unverified,
            governance: VerificationState.Unverified,
            socials: VerificationState.Unverified,
            kyc: VerificationState.Unverified
        });

        hasDID[msg.sender] = true;
        totalUsers++;
        emit DIDCreated(msg.sender, block.timestamp);
    }

    function updateDisplayName(string calldata _newName) external onlyDIDOwner {
        if (bytes(_newName).length == 0) revert EmptyString();
        dids[msg.sender].displayName = _newName;
        dids[msg.sender].updatedAt = block.timestamp;
        emit DIDUpdated(msg.sender, dids[msg.sender].reputationScore);
    }

    function getDID(address _user) external view didExists(_user) returns (DIDDocument memory) {
        return dids[_user];
    }

    function getVerificationStatus(address _user) external view didExists(_user) returns (VerificationStatus memory) {
        return verifications[_user];
    }

    // ═════════════════════════════════════════════════════════════════
    //  2. DID LINKING  (EVM ↔ Polkadot — "Mapped Together")
    // ═════════════════════════════════════════════════════════════════

    /// @notice Link your EVM DID to a Polkadot DID
    function linkPolkadotDID(string calldata _polkadotDid) external onlyDIDOwner {
        if (bytes(_polkadotDid).length == 0) revert EmptyString();

        didLinks[msg.sender].push(DIDLink({
            evmDid: "",  // caller address IS the EVM DID
            polkadotDid: _polkadotDid,
            linkedAt: block.timestamp,
            verified: false,
            active: true
        }));

        totalDIDLinks++;
        emit DIDLinked(msg.sender, _polkadotDid, block.timestamp);
    }

    /// @notice Verifier confirms the DID link
    function verifyDIDLink(address _user, uint256 _linkIndex) external onlyVerifier {
        if (_linkIndex >= didLinks[_user].length) revert InvalidIndex();
        if (!didLinks[_user][_linkIndex].active) revert NotActive();
        if (didLinks[_user][_linkIndex].verified) revert AlreadyVerified();

        didLinks[_user][_linkIndex].verified = true;
        _addScore(_user, 15);
        emit DIDLinkVerified(_user, _linkIndex);
    }

    function removeDIDLink(uint256 _index) external onlyDIDOwner {
        if (_index >= didLinks[msg.sender].length) revert InvalidIndex();
        if (!didLinks[msg.sender][_index].active) revert AlreadyRemoved();

        didLinks[msg.sender][_index].active = false;
        _subScore(msg.sender, 15);
        emit DIDLinkRemoved(msg.sender, _index);
    }

    function getDIDLinks(address _user) external view returns (DIDLink[] memory) {
        return didLinks[_user];
    }

    // ═════════════════════════════════════════════════════════════════
    //  3. CREDENTIALS & REPUTATION  (KYC, DAO Badge, Reputation)
    // ═════════════════════════════════════════════════════════════════

    /// @notice Verifier issues a credential to a user
    function issueCredential(
        address _user,
        CredentialType _credType,
        string calldata _title,
        string calldata _issuer,
        uint256 _expiresAt,
        string calldata _metadataURI
    ) external onlyVerifier didExists(_user) {
        credentials[_user].push(Credential({
            credType: _credType,
            title: _title,
            issuer: _issuer,
            issuedAt: block.timestamp,
            expiresAt: _expiresAt,
            revoked: false,
            metadataURI: _metadataURI
        }));

        uint256 idx = credentials[_user].length - 1;
        totalCredentials++;

        if (_credType == CredentialType.KYC) {
            _addScore(_user, 20);
            verifications[_user].kyc = VerificationState.Verified;
        } else if (_credType == CredentialType.DAOBadge) {
            _addScore(_user, 10);
            verifications[_user].governance = VerificationState.Verified;
        } else if (_credType == CredentialType.Reputation) {
            _addScore(_user, 5);
        } else if (_credType == CredentialType.SocialProof) {
            _addScore(_user, 10);
            verifications[_user].socials = VerificationState.Verified;
        } else if (_credType == CredentialType.ChainProof) {
            _addScore(_user, 10);
        }

        emit CredentialIssued(_user, idx, _credType);
    }

    function revokeCredential(address _user, uint256 _index) external onlyVerifier {
        if (_index >= credentials[_user].length) revert InvalidIndex();
        if (credentials[_user][_index].revoked) revert AlreadyRevoked();

        credentials[_user][_index].revoked = true;
        _subScore(_user, 10);
        emit CredentialDidRevoke(_user, _index);
    }

    /// @notice EVM dApp requests credential access ("Verification Request" from diagram)
    function requestCredentialAccess(address _user, uint256 _credIndex) external {
        if (_credIndex >= credentials[_user].length) revert InvalidIndex();
        if (credentials[_user][_credIndex].revoked) revert CredentialIsRevoked();

        emit CredentialShared(_user, msg.sender, _credIndex);
        emit VerificationRequested(msg.sender, _user);
    }

    function getCredentials(address _user) external view returns (Credential[] memory) {
        return credentials[_user];
    }

    /// @notice Check at specific index (cheaper than looping; frontend finds the index)
    function isCredentialValid(address _user, uint256 _index) external view returns (bool) {
        if (_index >= credentials[_user].length) return false;
        Credential storage c = credentials[_user][_index];
        return !c.revoked && (c.expiresAt == 0 || c.expiresAt > block.timestamp);
    }

    // ═════════════════════════════════════════════════════════════════
    //  4. VERIFICATION HUB
    // ═════════════════════════════════════════════════════════════════

    /// @notice Submit verification. _field: 0=email, 1=governance, 2=socials, 3=kyc
    function submitVerification(uint8 _field) external onlyDIDOwner {
        VerificationState cur = _getField(msg.sender, _field);
        if (cur == VerificationState.Verified) revert AlreadyVerified();
        _setField(msg.sender, _field, VerificationState.Pending);
        dids[msg.sender].updatedAt = block.timestamp;
        emit VerificationSubmitted(msg.sender, _field);
    }

    /// @notice Verifier sets verification state. _field: 0=email, 1=governance, 2=socials, 3=kyc
    function setVerificationState(
        address _user, uint8 _field, VerificationState _newState
    ) external onlyVerifier didExists(_user) {
        _setField(_user, _field, _newState);
        if (_newState == VerificationState.Verified) _addScore(_user, 15);
        dids[_user].updatedAt = block.timestamp;
        emit VerificationStateChanged(_user, _field, _newState);
    }

    function getVerificationProgress(address _user)
        external view didExists(_user)
        returns (uint8 currentStep, uint8 totalSteps, uint8 percentComplete)
    {
        totalSteps = 3;
        VerificationStatus memory v = verifications[_user];
        if (v.email == VerificationState.Verified)   currentStep++;
        if (v.socials == VerificationState.Verified)  currentStep++;
        if (v.kyc == VerificationState.Verified)      currentStep++;
        percentComplete = (currentStep * 100) / totalSteps;
    }

    // ═════════════════════════════════════════════════════════════════
    //  5. PLATFORM STATS (Landing page)
    // ═════════════════════════════════════════════════════════════════

    function getPlatformStats() external view returns (uint256 users, uint256 creds, uint256 links) {
        return (totalUsers, totalCredentials, totalDIDLinks);
    }

    // ═════════════════════════════════════════════════════════════════
    //  6. SCORE DELEGATION (for PolkaMeAccounts contract)
    // ═════════════════════════════════════════════════════════════════

    /// @notice Authorized contracts (Accounts) can update reputation scores
    function addScoreFor(address _user, uint8 _points) external {
        if (!authorizedContracts[msg.sender]) revert NotAuthorized();
        _addScore(_user, _points);
    }

    function subScoreFor(address _user, uint8 _points) external {
        if (!authorizedContracts[msg.sender]) revert NotAuthorized();
        _subScore(_user, _points);
    }

    // ═════════════════════════════════════════════════════════════════
    //  ADMIN
    // ═════════════════════════════════════════════════════════════════

    function setVerifier(address _v, bool _trusted) external onlyOwner {
        trustedVerifiers[_v] = _trusted;
    }

    function setAuthorizedContract(address _contract, bool _auth) external onlyOwner {
        authorizedContracts[_contract] = _auth;
    }

    function transferOwnership(address _newOwner) external onlyOwner {
        if (_newOwner == address(0)) revert InvalidAddress();
        owner = _newOwner;
    }

    // ═════════════════════════════════════════════════════════════════
    //  INTERNAL HELPERS
    // ═════════════════════════════════════════════════════════════════

    function _addScore(address _user, uint8 _pts) internal {
        uint8 c = dids[_user].reputationScore;
        dids[_user].reputationScore = c + _pts > 100 ? 100 : c + _pts;
        dids[_user].updatedAt = block.timestamp;
    }

    function _subScore(address _user, uint8 _pts) internal {
        uint8 c = dids[_user].reputationScore;
        dids[_user].reputationScore = c < _pts ? 0 : c - _pts;
        dids[_user].updatedAt = block.timestamp;
    }

    function _getField(address _u, uint8 _f) internal view returns (VerificationState) {
        if (_f == 0) return verifications[_u].email;
        if (_f == 1) return verifications[_u].governance;
        if (_f == 2) return verifications[_u].socials;
        if (_f == 3) return verifications[_u].kyc;
        revert UnknownMethod();
    }

    function _setField(address _u, uint8 _f, VerificationState _s) internal {
        if (_f == 0) verifications[_u].email = _s;
        else if (_f == 1) verifications[_u].governance = _s;
        else if (_f == 2) verifications[_u].socials = _s;
        else if (_f == 3) verifications[_u].kyc = _s;
        else revert UnknownMethod();
    }
}
