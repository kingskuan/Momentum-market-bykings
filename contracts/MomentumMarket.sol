// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MomentumMarket
 * @notice Trade real-time AI-powered match momentum — not binary outcomes
 * @dev Deployed on X Layer Testnet for OKX Build X Hackathon
 */
contract MomentumMarket {
    address public owner;
    uint256 public constant PLATFORM_FEE_BPS = 200; // 2%
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MIN_POSITION = 0.001 ether;

    enum PositionType { LONG, SHORT }

    struct Match {
        bytes32 matchId;
        string teamA;
        string teamB;
        string flagA;
        string flagB;
        uint8  momentumA;   // 0-100, AI-updated
        uint8  momentumB;   // 0-100, AI-updated
        bool   active;
        bool   settled;
        uint256 startTime;
        uint256 endTime;
        uint256 totalPool;
    }

    struct Position {
        address        trader;
        bytes32        matchId;
        uint8          teamId;        // 0 = teamA, 1 = teamB
        PositionType   posType;
        uint256        amount;
        uint8          entryMomentum; // momentum at time of entry
        bool           settled;
        bool           won;
    }

    mapping(bytes32 => Match)       public matches;
    mapping(bytes32 => Position)    public positions;
    mapping(bytes32 => bytes32[])   public matchPositions;
    mapping(address => bytes32[])   public traderPositions;
    bytes32[]                       public allMatchIds;

    // ── Events ──────────────────────────────────────────────────────────────
    event MatchCreated(bytes32 indexed matchId, string teamA, string teamB, uint256 endTime);
    event MomentumUpdated(bytes32 indexed matchId, uint8 momentumA, uint8 momentumB, uint256 timestamp);
    event PositionOpened(bytes32 indexed posId, address indexed trader, uint8 teamId, PositionType posType, uint256 amount, uint8 entryMomentum);
    event MatchSettled(bytes32 indexed matchId, uint256 totalPool);
    event WinningsDistributed(address indexed trader, uint256 amount);

    // ── Modifiers ───────────────────────────────────────────────────────────
    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }

    constructor() { owner = msg.sender; }

    // ── Admin: Create Match ─────────────────────────────────────────────────
    function createMatch(
        bytes32        matchId,
        string calldata teamA,
        string calldata teamB,
        string calldata flagA,
        string calldata flagB,
        uint256        duration
    ) external onlyOwner {
        require(matches[matchId].startTime == 0, "Match exists");
        matches[matchId] = Match({
            matchId:   matchId,
            teamA:     teamA,
            teamB:     teamB,
            flagA:     flagA,
            flagB:     flagB,
            momentumA: 50,
            momentumB: 50,
            active:    true,
            settled:   false,
            startTime: block.timestamp,
            endTime:   block.timestamp + duration,
            totalPool: 0
        });
        allMatchIds.push(matchId);
        emit MatchCreated(matchId, teamA, teamB, block.timestamp + duration);
    }

    // ── Admin: AI Oracle pushes new momentum scores ─────────────────────────
    function updateMomentum(
        bytes32 matchId,
        uint8   momentumA,
        uint8   momentumB
    ) external onlyOwner {
        Match storage m = matches[matchId];
        require(m.active && !m.settled, "Match inactive");
        require(momentumA <= 100 && momentumB <= 100, "Score out of range");
        m.momentumA = momentumA;
        m.momentumB = momentumB;
        emit MomentumUpdated(matchId, momentumA, momentumB, block.timestamp);
    }

    // ── User: Open a momentum position ─────────────────────────────────────
    function openPosition(
        bytes32      matchId,
        uint8        teamId,   // 0 or 1
        PositionType posType   // LONG or SHORT
    ) external payable {
        Match storage m = matches[matchId];
        require(m.active && !m.settled, "Match not active");
        require(block.timestamp < m.endTime, "Match ended");
        require(msg.value >= MIN_POSITION, "Below minimum");
        require(teamId <= 1, "Invalid team");

        uint8 entryMomentum = teamId == 0 ? m.momentumA : m.momentumB;

        bytes32 posId = keccak256(
            abi.encodePacked(matchId, msg.sender, block.timestamp, block.prevrandao)
        );
        require(positions[posId].amount == 0, "Position collision");

        positions[posId] = Position({
            trader:        msg.sender,
            matchId:       matchId,
            teamId:        teamId,
            posType:       posType,
            amount:        msg.value,
            entryMomentum: entryMomentum,
            settled:       false,
            won:           false
        });

        matchPositions[matchId].push(posId);
        traderPositions[msg.sender].push(posId);
        m.totalPool += msg.value;

        emit PositionOpened(posId, msg.sender, teamId, posType, msg.value, entryMomentum);
    }

    // ── Admin: Settle match and distribute winnings ─────────────────────────
    function settleMatch(bytes32 matchId) external onlyOwner {
        Match storage m = matches[matchId];
        require(m.active && !m.settled, "Invalid state");
        m.active  = false;
        m.settled = true;

        bytes32[] storage posIds = matchPositions[matchId];
        uint256 winnerPool = 0;

        // First pass: determine winners
        for (uint256 i = 0; i < posIds.length; i++) {
            Position storage pos = positions[posIds[i]];
            uint8 finalMomentum = pos.teamId == 0 ? m.momentumA : m.momentumB;
            bool wentUp = finalMomentum > pos.entryMomentum;
            pos.won = (pos.posType == PositionType.LONG && wentUp) ||
                      (pos.posType == PositionType.SHORT && !wentUp);
            if (pos.won) winnerPool += pos.amount;
        }

        // Second pass: distribute
        uint256 fee              = (m.totalPool * PLATFORM_FEE_BPS) / BASIS_POINTS;
        uint256 distributable    = m.totalPool - fee;

        for (uint256 i = 0; i < posIds.length; i++) {
            Position storage pos = positions[posIds[i]];
            pos.settled = true;
            if (pos.won && winnerPool > 0) {
                uint256 payout = (pos.amount * distributable) / winnerPool;
                payable(pos.trader).transfer(payout);
                emit WinningsDistributed(pos.trader, payout);
            }
        }

        if (fee > 0) payable(owner).transfer(fee);
        emit MatchSettled(matchId, m.totalPool);
    }

    // ── Views ───────────────────────────────────────────────────────────────
    function getMatch(bytes32 matchId) external view returns (Match memory) {
        return matches[matchId];
    }

    function getAllMatchIds() external view returns (bytes32[] memory) {
        return allMatchIds;
    }

    function getTraderPositions(address trader) external view returns (bytes32[] memory) {
        return traderPositions[trader];
    }

    function getPosition(bytes32 posId) external view returns (Position memory) {
        return positions[posId];
    }

    receive() external payable {}
}
