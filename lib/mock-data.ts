import { User, Team, RiskTrend, WeeklyLog, ProjectSettings } from './types';

export const mockUsers: User[] = [
  { id: 'student_001', name: 'Alice Johnson', email: 'alice@college.edu', role: 'student', password: 'password123', collegeIdVerified: true },
  { id: 'student_002', name: 'Bob Smith', email: 'bob@college.edu', role: 'student', password: 'password123', collegeIdVerified: true },
  { id: 'student_003', name: 'Carol Davis', email: 'carol@college.edu', role: 'student', password: 'password123', collegeIdVerified: true },
  { id: 'student_004', name: 'David Wilson', email: 'david@college.edu', role: 'student', password: 'password123', collegeIdVerified: true },
  { id: 'student_005', name: 'Emma Brown', email: 'emma@college.edu', role: 'student', password: 'password123', collegeIdVerified: true },
  { id: 'student_006', name: 'Frank Lee', email: 'frank@college.edu', role: 'student', password: 'password123', collegeIdVerified: true },
  { id: 'teacher_001', name: 'Dr. James Miller', email: 'james.miller@college.edu', role: 'teacher', password: 'password123', collegeIdVerified: true },
  { id: 'teacher_002', name: 'Prof. Sarah Anderson', email: 'sarah.anderson@college.edu', role: 'teacher', password: 'password123', collegeIdVerified: true },
];

export const mockTeams: Team[] = [
  { id: 'team_001', name: 'AI Research Team', leaderId: 'student_001', memberIds: ['student_001', 'student_002', 'student_003'], projectId: 'proj_001', teacherId: 'teacher_001', currentWeek: 8, milestoneDeadline: '2026-05-15', createdAt: '2026-01-15' },
  { id: 'team_002', name: 'Web Development Team', leaderId: 'student_004', memberIds: ['student_004', 'student_005'], projectId: 'proj_002', teacherId: 'teacher_001', currentWeek: 6, milestoneDeadline: '2026-05-20', createdAt: '2026-01-15' },
  { id: 'team_003', name: 'Mobile App Team', leaderId: 'student_006', memberIds: ['student_006'], projectId: 'proj_003', teacherId: 'teacher_002', currentWeek: 4, milestoneDeadline: '2026-05-30', createdAt: '2026-01-20' },
];

export const mockRiskTrends: RiskTrend[] = [
  { teamId: 'team_001', week: 1, score: 25, date: '2026-01-15' },
  { teamId: 'team_001', week: 2, score: 28, date: '2026-01-22' },
  { teamId: 'team_001', week: 3, score: 35, date: '2026-01-29' },
  { teamId: 'team_001', week: 4, score: 42, date: '2026-02-05' },
  { teamId: 'team_001', week: 5, score: 48, date: '2026-02-12' },
  { teamId: 'team_001', week: 6, score: 55, date: '2026-02-19' },
  { teamId: 'team_001', week: 7, score: 62, date: '2026-02-26' },
  { teamId: 'team_001', week: 8, score: 75, date: '2026-03-05' },
  { teamId: 'team_002', week: 1, score: 45, date: '2026-01-15' },
  { teamId: 'team_002', week: 2, score: 40, date: '2026-01-22' },
  { teamId: 'team_002', week: 3, score: 38, date: '2026-01-29' },
  { teamId: 'team_002', week: 4, score: 32, date: '2026-02-05' },
  { teamId: 'team_002', week: 5, score: 28, date: '2026-02-12' },
  { teamId: 'team_002', week: 6, score: 20, date: '2026-02-19' },
];

export const mockWeeklyLogs: WeeklyLog[] = [
  { id: 'log_001', teamId: 'team_001', week: 8, daysWorked: 4, workDescription: 'Implemented ML model training pipeline and data preprocessing', labsAttended: 3, submittedAt: '2026-03-05' },
  { id: 'log_002', teamId: 'team_001', week: 7, daysWorked: 5, workDescription: 'Completed exploratory data analysis and feature engineering', labsAttended: 2, submittedAt: '2026-02-26' },
  { id: 'log_003', teamId: 'team_001', week: 6, daysWorked: 3, workDescription: 'Literature review and dataset collection', labsAttended: 2, submittedAt: '2026-02-19' },
  { id: 'log_004', teamId: 'team_002', week: 6, daysWorked: 5, workDescription: 'Built user authentication system and database schema', labsAttended: 4, submittedAt: '2026-03-05' },
  { id: 'log_005', teamId: 'team_002', week: 5, daysWorked: 4, workDescription: 'API design and component architecture', labsAttended: 3, submittedAt: '2026-02-26' },
];

export const mockProjectSettings: ProjectSettings[] = [
  {
    id: 'settings_team_001',
    projectId: 'proj_001',
    teamId: 'team_001',
    teacherId: 'teacher_001',
    maxTeamSize: 4,
    inactiveDaysThreshold: 7,
    finalSubmissionDate: '2026-05-30',
    milestones: [
      { id: 'ms_001_1', name: 'Project Planning & Design', deadline: '2026-02-15', description: 'Complete project scope and design documents', submitted: true, submittedAt: '2026-02-14' },
      { id: 'ms_001_2', name: 'Core Development', deadline: '2026-03-30', description: 'Implement core features and functionality', submitted: false },
      { id: 'ms_001_3', name: 'Testing & Optimization', deadline: '2026-05-15', description: 'Complete testing and performance optimization', submitted: false },
    ],
    createdAt: '2026-01-15',
    updatedAt: '2026-01-15',
  },
  {
    id: 'settings_team_002',
    projectId: 'proj_002',
    teamId: 'team_002',
    teacherId: 'teacher_001',
    maxTeamSize: 3,
    inactiveDaysThreshold: 5,
    finalSubmissionDate: '2026-05-25',
    milestones: [
      { id: 'ms_002_1', name: 'Requirements & Design', deadline: '2026-02-10', description: 'Finalize requirements and UI/UX design', submitted: true, submittedAt: '2026-02-09' },
      { id: 'ms_002_2', name: 'Development Sprint', deadline: '2026-04-15', description: 'Main development phase', submitted: false },
      { id: 'ms_002_3', name: 'Final Review & Deployment', deadline: '2026-05-20', description: 'Code review, testing, and deployment', submitted: false },
    ],
    createdAt: '2026-01-15',
    updatedAt: '2026-01-15',
  },
];