// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PolkaMeTypes.sol";

/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║  PolkaMe Security  (Contract 4 of 4)                             ║
 * ║  Privacy preferences, session management & security log          ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 *
 *  DEPLOY ORDER:
 *    1. Deploy PolkaMeIdentity
 *    2. Deploy PolkaMeSecurity(identityAddress)
 */
contract PolkaMeSecurity {

    // ── State ────────────────────────────────────────────────────────
    address public owner;
    IPolkaMeIdentity public identity;

    mapping(address => PrivacyPreference[]) public privacyPrefs;
    mapping(address => bool)                public privacyInitialized;
    mapping(address => Session[])           public sessions;
    mapping(address => SecurityLogEntry[])  public securityLogs;

    // ── Events ───────────────────────────────────────────────────────
    event PrivacyUpdated(address indexed user, uint256 prefIndex, bool enabled);
    event SessionCreated(address indexed user, uint256 sessionIndex);
    event SessionRevoked(address indexed user, uint256 sessionIndex);
    event AllRemoteSessionsRevoked(address indexed user);
    event SecurityEvent(address indexed user, string eventDescription, string source);

    // ── Modifiers ────────────────────────────────────────────────────
    modifier onlyOwner() { if (msg.sender != owner) revert NotOwner(); _; }
    modifier hasDID()    { if (!identity.hasDID(msg.sender)) revert DIDRequired(); _; }

    // ── Constructor ──────────────────────────────────────────────────
    constructor(address _identity) {
        owner = msg.sender;
        identity = IPolkaMeIdentity(_identity);
    }

    // ═════════════════════════════════════════════════════════════════
    //  PRIVACY PREFERENCES
    // ═════════════════════════════════════════════════════════════════

    /// @notice Initialize default privacy preferences
    function initializePrivacyPrefs() external hasDID {
        if (privacyInitialized[msg.sender]) revert AlreadyInitialized();

        privacyPrefs[msg.sender].push(PrivacyPreference("Stealth Mode", "Hide balance on startup", true));
        privacyPrefs[msg.sender].push(PrivacyPreference("Anonymous RPC", "Route through TOR/VPN", false));
        privacyPrefs[msg.sender].push(PrivacyPreference("Metadata Scrubbing", "Remove tx tags locally", true));

        privacyInitialized[msg.sender] = true;
    }

    /// @notice Toggle a privacy setting
    function updatePrivacyPreference(uint256 _index, bool _enabled) external hasDID {
        if (_index >= privacyPrefs[msg.sender].length) revert InvalidIndex();
        privacyPrefs[msg.sender][_index].enabled = _enabled;
        emit PrivacyUpdated(msg.sender, _index, _enabled);
    }

    function getPrivacyPreferences(address _user) external view returns (PrivacyPreference[] memory) {
        return privacyPrefs[_user];
    }

    // ═════════════════════════════════════════════════════════════════
    //  SESSION MANAGEMENT
    // ═════════════════════════════════════════════════════════════════

    /// @notice Register a new session
    function createSession(
        string calldata _device,
        string calldata _browser,
        string calldata _location,
        bool _isCurrent
    ) external hasDID {
        sessions[msg.sender].push(Session({
            device: _device,
            browser: _browser,
            location: _location,
            isCurrent: _isCurrent,
            lastActive: block.timestamp,
            active: true
        }));
        emit SessionCreated(msg.sender, sessions[msg.sender].length - 1);
    }

    /// @notice Revoke a specific session
    function revokeSession(uint256 _index) external hasDID {
        if (_index >= sessions[msg.sender].length) revert InvalidIndex();
        if (!sessions[msg.sender][_index].active) revert AlreadyRevoked();
        if (sessions[msg.sender][_index].isCurrent) revert CannotRevokeCurrent();

        sessions[msg.sender][_index].active = false;
        emit SessionRevoked(msg.sender, _index);
        _logSecurity(msg.sender, "Session Revoked", "User Action");
    }

    /// @notice Revoke all sessions except the current one
    function revokeAllRemoteSessions() external hasDID {
        Session[] storage s = sessions[msg.sender];
        for (uint256 i = 0; i < s.length; i++) {
            if (s[i].active && !s[i].isCurrent) {
                s[i].active = false;
            }
        }
        emit AllRemoteSessionsRevoked(msg.sender);
        _logSecurity(msg.sender, "All Remote Sessions Revoked", "User Action");
    }

    function getActiveSessions(address _user) external view returns (Session[] memory) {
        return sessions[_user];
    }

    // ═════════════════════════════════════════════════════════════════
    //  SECURITY LOG
    // ═════════════════════════════════════════════════════════════════

    /// @notice Manually log a security event
    function logSecurityEvent(string calldata _event, string calldata _source) external hasDID {
        _logSecurity(msg.sender, _event, _source);
    }

    function getSecurityLog(address _user) external view returns (SecurityLogEntry[] memory) {
        return securityLogs[_user];
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

    function _logSecurity(address _user, string memory _event, string memory _source) internal {
        securityLogs[_user].push(SecurityLogEntry({
            eventDescription: _event,
            source: _source,
            timestamp: block.timestamp
        }));
        emit SecurityEvent(_user, _event, _source);
    }
}
