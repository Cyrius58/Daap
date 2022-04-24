// SPDX-License-Identifier: MIT

pragma solidity 0.8.13 ;
import "@openzeppelin/contracts/access/Ownable.sol";


contract Voting is Ownable {

// ::::::::::::: VARS ::::::::::::: //
    // arrays for draw, uint for single
    uint[] private winningProposalsID;
    Proposal[] private winningProposals;
    uint private winningProposalID;
    
    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint votedProposalId;
    }

    struct Proposal {
        string description;
        uint voteCount;
    }

    enum WorkflowStatus {
        RegisteringVoters,
        ProposalsRegistrationStarted,
        ProposalsRegistrationEnded,
        VotingSessionStarted,
        VotingSessionEnded,
        VotesTallied
    }

    WorkflowStatus private workflowStatus;
    Proposal[] private proposalsArray;
    uint private nbProposals;
    uint private nbProposalsMax;
    uint private nbVoters;
    uint private nbVotersMax;
    uint private nbVotes;
    mapping (address => Voter) private voters;
//

// ::::::::::::: EVENTS ::::::::::::: //

    event VoterRegistered(address voterAddress); 
    event WorkflowStatusChange(WorkflowStatus previousStatus, WorkflowStatus newStatus);
    event ProposalRegistered(uint proposalId);
    event Voted (address voter, uint proposalId);
    event MaxProposals(uint MaxProposal);
    event MaxVoters(uint MaxVoters);

//
// ::::::::::::: MODIFIERS ::::::::::::: //


    modifier onlyVoters() {
        require(voters[msg.sender].isRegistered, 'You\'re not a voter');
        _;
    }
    modifier onlyRegisteringVotersStatus(){
        require(workflowStatus == WorkflowStatus.RegisteringVoters, 'Voters registration is not open yet');
        _;
    }

    modifier onlyProposalsRegistrationStartedStatus(){
        require(workflowStatus == WorkflowStatus.ProposalsRegistrationStarted, 'Proposals registration is not open yet');
        _;
    }
    modifier onlyVotingSessionStartedStatus(){
        require(workflowStatus == WorkflowStatus.VotingSessionStarted, 'Voting session havent started yet');
        _;
    }
    modifier onlyVotingSessionEndedStatus(){
       require(workflowStatus == WorkflowStatus.VotingSessionEnded, 'Current status is not voting session ended');
       _;
    }
//    

// ::::::::::::: GETTERS ::::::::::::: //

    function getNbProposals()public view returns (uint){
        return nbProposals;
    }
    function getNbVoters()public view returns (uint){
        return nbVoters;
    }
    function getOneProposal(uint _id) external onlyVoters view returns (Proposal memory) {
        require(_id<=nbProposals,'Not proposal listed with this id');
        return proposalsArray[_id];
    }
    function getTotalVotes()public view onlyVotingSessionEndedStatus returns (uint){
        return nbVotes;
    }
    function getVoter(address _addr) external onlyVoters view returns (Voter memory) {
        return voters[_addr];
    }
    function getWinner() external view returns (Proposal[] memory) {
        require(workflowStatus == WorkflowStatus.VotesTallied, 'Votes are not tallied yet');
        return winningProposals;
    }
    function getWorkflowStatus() public view returns (WorkflowStatus){
        return workflowStatus;
    }
//

// ::::::::::::: REGISTRATION ::::::::::::: // 
    function defineMaxVoters(uint _nbVotersMax) external onlyOwner onlyRegisteringVotersStatus{
        require(nbVotersMax==0,'nb of voter max already set');
        require(_nbVotersMax>=2,'Nb max of voters must be superior/equal to 2');
        require(_nbVotersMax<=100,'Programm code is set to accept maximum 100 voters');
        nbVotersMax=_nbVotersMax;
        emit MaxVoters(nbVotersMax);
    }

    function addVoter(address _addr) public onlyOwner onlyRegisteringVotersStatus{
        require(nbVotersMax!=0,'please set first nb max of voter');
        require(voters[_addr].isRegistered != true, 'Already registered');
        require(nbVoters<nbVotersMax,'Nb max of voters reached');
        voters[_addr].isRegistered = true;
        nbVoters+=1;
        emit VoterRegistered(_addr);
    }
//

// ::::::::::::: PROPOSAL ::::::::::::: // 
    function defineMaxProposals(uint _nbProposalsMax) external onlyOwner onlyProposalsRegistrationStartedStatus{
        require(nbProposalsMax==0,'nb of proposal max already set');
        require(_nbProposalsMax>=2,'Nb max of proposals must be superior/equal to 2');
        require(_nbProposalsMax<=100,'Programm code is set to accept maximum 100 proposals');
        nbProposalsMax=_nbProposalsMax;

        emit MaxProposals(nbProposalsMax);
    }

    function addProposal(string memory _desc) external onlyVoters onlyProposalsRegistrationStartedStatus{
        require(nbProposalsMax!=0,'please set first nb max of proposals');
        require(keccak256(abi.encode(_desc)) != keccak256(abi.encode("")), 'Vous ne pouvez pas ne rien proposer'); // facultatif
        require(nbProposals<nbProposalsMax,'Nb max of proposals reached');


        // voir que desc est different des autres

        Proposal memory proposal;
        proposal.description = _desc;
        proposalsArray.push(proposal);
        nbProposals+=1;
        emit ProposalRegistered(proposalsArray.length-1);
    }
//

// ::::::::::::: VOTE ::::::::::::: //

    function setVote( uint _id) external onlyVoters onlyVotingSessionStartedStatus{
        require(voters[msg.sender].hasVoted != true, 'You have already voted');
        require(_id <= proposalsArray.length, 'Proposal not found'); // pas obligé, et pas besoin du >0 car uint

        voters[msg.sender].votedProposalId = _id;
        voters[msg.sender].hasVoted = true;
        proposalsArray[_id].voteCount++;
        nbVotes+=1;
        emit Voted(msg.sender, _id);
    }

//

// ::::::::::::: STATE ::::::::::::: //

    function startProposalsRegistering() external onlyOwner {
        require(nbVotersMax!=0,'You need first to set the nb max of voters');
        require(nbVoters!=0,'You need first to set at least 1 voter');
        workflowStatus = WorkflowStatus.ProposalsRegistrationStarted;
        emit WorkflowStatusChange(WorkflowStatus.RegisteringVoters, WorkflowStatus.ProposalsRegistrationStarted);
    }

    function endProposalsRegistering() external onlyOwner {
        require(nbProposals>1,'You need at least to add 2 proposal');
        workflowStatus = WorkflowStatus.ProposalsRegistrationEnded;
        emit WorkflowStatusChange(WorkflowStatus.ProposalsRegistrationStarted, WorkflowStatus.ProposalsRegistrationEnded);
    }

    function startVotingSession() external onlyOwner {
        require(workflowStatus == WorkflowStatus.ProposalsRegistrationEnded, 'Registering proposals phase is not finished');
        workflowStatus = WorkflowStatus.VotingSessionStarted;
        emit WorkflowStatusChange(WorkflowStatus.ProposalsRegistrationEnded, WorkflowStatus.VotingSessionStarted);
    }

    function endVotingSession() external onlyOwner {
        require(workflowStatus == WorkflowStatus.VotingSessionStarted, 'Voting session havent started yet');
        require(nbVotes>0,'You need at least 1 vote');
        workflowStatus = WorkflowStatus.VotingSessionEnded;
        emit WorkflowStatusChange(WorkflowStatus.VotingSessionStarted, WorkflowStatus.VotingSessionEnded);
    }

    function tallyVotesDraw() external onlyOwner {
        uint highestCount;
        uint[5]memory winners; // egalite entre 5 personnes max
        uint nbWinners;
        for (uint i = 0; i < proposalsArray.length; i++) {
            if (proposalsArray[i].voteCount == highestCount) {
                winners[nbWinners]=i;
                nbWinners++;
            }
            if (proposalsArray[i].voteCount > highestCount) {
                delete winners;
                winners[0]= i;
                highestCount = proposalsArray[i].voteCount;
                nbWinners=1;
            }
        }
        for(uint j=0;j<nbWinners;j++){
            winningProposalsID.push(winners[j]);
            winningProposals.push(proposalsArray[winners[j]]);
        }
        workflowStatus = WorkflowStatus.VotesTallied;
        emit WorkflowStatusChange(WorkflowStatus.VotingSessionEnded, WorkflowStatus.VotesTallied);
    }
//
}