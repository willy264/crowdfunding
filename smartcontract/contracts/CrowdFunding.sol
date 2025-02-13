// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CrowdFunding {

    // Custom errors 
    error OnlyProjectCreator();
    error GoalNotReached();
    error DeadlineInPast();
    error InvalidProjectId();
    error ContributionZero();
    error DeadlineNotReached();
    error FundsAlreadyDisbursed();
    error InsufficientRewardTokens();
    error ProjectAlreadyFinalized();
    error NotProjectCreator();

    struct Project {
        address creator;
        string projectName;
        IERC20 token;
        uint256 fundingGoal; // target amount
        uint256 deadline;
        uint256 totalFunded;
        bool goalReached;
        bool fundsReleased;
    }


    mapping (uint => Project) public projects;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    uint256 public projectCount;


    // Events
    event ProjectCreated(uint256 projectId, address creator, uint256 goal, uint256 deadline);
    event ContributionReceived(uint256 projectId, address backer, uint256 amount);
    event FundsReleased(uint256 projectId);
    event RefundIssued(uint256 projectId, address backer, uint256 amount);

    function createProject(
        address _creator,
        string memory _projectName,
        uint256 _goal,
        uint256 _deadline,
        IERC20 _token
    ) public {
        if (_deadline <= block.timestamp) revert DeadlineInPast();
        if (_goal == 0) revert ContributionZero();

        projects[projectCount] = Project(
            _creator,
            _projectName,
            _token,
            _goal,
            _deadline,
            0,
            false,
            false
        );
        projectCount += 1;

        emit ProjectCreated(projectCount, _creator, _goal, _deadline);
    }

    function contribute(uint256 _projectId, uint256 _amount) external {
        Project storage projectInstance = projects[_projectId]; 
    
        if (block.timestamp > projectInstance.deadline) revert DeadlineNotReached();
        if (_amount == 0) revert ContributionZero();

        projectInstance.totalFunded += _amount;
        contributions[_projectId][msg.sender] += _amount;
        // projectInstance.token.transferFrom(msg.sender, address(this), _amount);
        projectInstance.token.transfer(address(this), _amount); 
        projectInstance.token.approve(msg.sender, _amount);

        emit ContributionReceived(_projectId, msg.sender, _amount);
    }

    function releaseFunds(uint256 _projectId) external {
        Project storage projectInstance = projects[_projectId];

        if (msg.sender != projectInstance.creator) revert NotProjectCreator();
        if (block.timestamp < projectInstance.deadline) revert DeadlineNotReached();
        if (projectInstance.totalFunded < projectInstance.fundingGoal) revert GoalNotReached();
        if (projectInstance.fundsReleased == false) revert FundsAlreadyDisbursed();

        projectInstance.token.transfer(projectInstance.creator, projectInstance.totalFunded);
        projectInstance.fundsReleased = true;

        emit FundsReleased(_projectId);
    }

    function refund(uint256 _projectId) external {
        Project storage projectInstance = projects[_projectId];

        if (block.timestamp < projectInstance.deadline) revert DeadlineNotReached();
        if (projectInstance.totalFunded >= projectInstance.fundingGoal) revert FundsAlreadyDisbursed();

        uint256 amount = contributions[_projectId][msg.sender];
        if (amount == 0) revert ContributionZero();

        contributions[_projectId][msg.sender] = 0;
        projectInstance.token.transfer(msg.sender, amount);

        emit RefundIssued(_projectId, msg.sender, amount);
    }

}