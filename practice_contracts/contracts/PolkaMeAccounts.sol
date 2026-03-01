// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PolkaMeTypes.sol";

/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║  PolkaMe Accounts — EVM Side  (Contract 2 of 4)                  ║
 * ║  Deployed on: Moonbeam / Astar                                   ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 *
 *  Handles:
 *    1. Linked chain accounts   (Polkadot, Kusama, Astar, Moonbeam…)
 *    2. Linked social accounts  (Twitter, Discord, Github)
 *    3. Authorized dApps
 *    4. Activity log
 */
contract PolkaMeAccounts {

    IPolkaMeIdentity public identity;
    address public owner;

    mapping(address => LinkedChainAccount[])  public chainAccounts;
    mapping(address => LinkedSocialAccount[]) public socialAccounts;
    mapping(address => AuthorizedDApp[])      public authorizedDApps;
    mapping(address => ActivityEntry[])       public activityLog;

    // ── Events ───────────────────────────────────────────────────────
    event ChainAccountLinked(address indexed user, ChainType chain, uint256 index);
    event ChainAccountRemoved(address indexed user, uint256 index);
    event SocialAccountLinked(address indexed user, SocialType platform, string handle);
    event SocialAccountVerified(address indexed user, SocialType platform, uint256 index);
    event SocialAccountRemoved(address indexed user, uint256 index);
    event DAppAuthorized(address indexed user, address indexed dApp, string name);
    event DAppRevoked(address indexed user, uint256 index);
    event ActivityLogged(address indexed user, string action);

    // ── Modifiers ────────────────────────────────────────────────────
    modifier onlyDIDOwner() {
        if (!identity.hasDID(msg.sender)) revert DIDRequired();
        _;
    }

    modifier onlyVerifier() {
        if (!identity.trustedVerifiers(msg.sender) && msg.sender != identity.owner())
            revert NotVerifier();
        _;
    }

    // ── Constructor ──────────────────────────────────────────────────
    constructor(address _identity) {
        identity = IPolkaMeIdentity(_identity);
        owner = msg.sender;
    }

    // ═════════════════════════════════════════════════════════════════
    //  1. CHAIN ACCOUNTS
    // ═════════════════════════════════════════════════════════════════

    function linkChainAccount(
        ChainType _chain,
        string calldata _label,
        string calldata _address,
        string calldata _tag
    ) external onlyDIDOwner {
        if (bytes(_address).length == 0) revert EmptyString();

        chainAccounts[msg.sender].push(LinkedChainAccount({
            chain: _chain,
            label: _label,
            accountAddress: _address,
            tag: _tag,
            linkedAt: block.timestamp,
            active: true
        }));

        uint256 idx = chainAccounts[msg.sender].length - 1;
        identity.addScoreFor(msg.sender, 5);
        emit ChainAccountLinked(msg.sender, _chain, idx);
    }

    function removeChainAccount(uint256 _index) external onlyDIDOwner {
        if (_index >= chainAccounts[msg.sender].length) revert InvalidIndex();
        if (!chainAccounts[msg.sender][_index].active) revert AlreadyRemoved();

        chainAccounts[msg.sender][_index].active = false;
        identity.subScoreFor(msg.sender, 5);
        emit ChainAccountRemoved(msg.sender, _index);
    }

    function getLinkedChainAccounts(address _user) external view returns (LinkedChainAccount[] memory) {
        return chainAccounts[_user];
    }

    // ═════════════════════════════════════════════════════════════════
    //  2. SOCIAL ACCOUNTS
    // ═════════════════════════════════════════════════════════════════

    function linkSocialAccount(SocialType _platform, string calldata _handle) external onlyDIDOwner {
        if (bytes(_handle).length == 0) revert EmptyString();

        socialAccounts[msg.sender].push(LinkedSocialAccount({
            platform: _platform,
            handle: _handle,
            verified: false,
            linkedAt: block.timestamp,
            active: true
        }));

        emit SocialAccountLinked(msg.sender, _platform, _handle);
    }

    function verifySocialAccount(address _user, uint256 _index) external onlyVerifier {
        if (_index >= socialAccounts[_user].length) revert InvalidIndex();
        if (!socialAccounts[_user][_index].active) revert NotActive();
        if (socialAccounts[_user][_index].verified) revert AlreadyVerified();

        socialAccounts[_user][_index].verified = true;
        identity.addScoreFor(_user, 10);
        emit SocialAccountVerified(_user, socialAccounts[_user][_index].platform, _index);
    }

    function removeSocialAccount(uint256 _index) external onlyDIDOwner {
        if (_index >= socialAccounts[msg.sender].length) revert InvalidIndex();
        if (!socialAccounts[msg.sender][_index].active) revert AlreadyRemoved();

        socialAccounts[msg.sender][_index].active = false;
        identity.subScoreFor(msg.sender, 5);
        emit SocialAccountRemoved(msg.sender, _index);
    }

    function getLinkedSocialAccounts(address _user) external view returns (LinkedSocialAccount[] memory) {
        return socialAccounts[_user];
    }

    // ═════════════════════════════════════════════════════════════════
    //  3. AUTHORIZED dApps
    // ═════════════════════════════════════════════════════════════════

    function authorizeDApp(string calldata _name, address _dAppAddress) external onlyDIDOwner {
        if (_dAppAddress == address(0)) revert InvalidAddress();

        authorizedDApps[msg.sender].push(AuthorizedDApp({
            name: _name,
            dAppAddress: _dAppAddress,
            authorizedAt: block.timestamp,
            lastAccessed: block.timestamp,
            active: true
        }));

        emit DAppAuthorized(msg.sender, _dAppAddress, _name);
    }

    function revokeDApp(uint256 _index) external onlyDIDOwner {
        if (_index >= authorizedDApps[msg.sender].length) revert InvalidIndex();
        if (!authorizedDApps[msg.sender][_index].active) revert AlreadyRemoved();

        authorizedDApps[msg.sender][_index].active = false;
        emit DAppRevoked(msg.sender, _index);
    }

    function getAuthorizedDApps(address _user) external view returns (AuthorizedDApp[] memory) {
        return authorizedDApps[_user];
    }

    // ═════════════════════════════════════════════════════════════════
    //  4. ACTIVITY LOG
    // ═════════════════════════════════════════════════════════════════

    function logActivity(
        string calldata _action,
        string calldata _app,
        ActivityStatus _status
    ) external onlyDIDOwner {
        activityLog[msg.sender].push(ActivityEntry({
            action: _action,
            app: _app,
            status: _status,
            timestamp: block.timestamp
        }));

        emit ActivityLogged(msg.sender, _action);
    }

    function getRecentActivity(address _user) external view returns (ActivityEntry[] memory) {
        return activityLog[_user];
    }
}
