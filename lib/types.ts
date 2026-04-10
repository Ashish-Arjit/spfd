export type UserRole = 'student' | 'teacher';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password: string;
  collegeIdVerified: boolean;
  collegeIdImage?: string;
}

export interface ProjectSettings {
  id: string;
  projectId: string;
  teamId: string;
  teacherId: string;
  maxTeamSize: number;
  inactiveDaysThreshold: number;
  finalSubmissionDate: string;
  milestones: Milestone[];
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  name: string;
  deadline: string;
  description?: string;
  completed?: boolean;
  completed_at?: string;
  status?: 'pending' | 'completed' | 'missed';
}

export interface MilestoneSubmission {
  id: string;
  teamId: string;
  milestoneId: string;
  submittedAt: string;
  notes?: string;
}

export interface Team {
  id: string;
  name: string;
  leaderId: string;
  memberIds: string[];
  projectId: string;
  teacherId: string;
  currentWeek: number;
  submission_active?: boolean;
  submission_day?: string;
  submission_window?: number;
  milestoneDeadline: string;
  createdAt: string;
}

export interface RiskTrend {
  teamId: string;
  week: number;
  score: number;
  date: string;
  status?: 'pending' | 'completed' | 'missed' | null;
}

export interface WeeklyLog {
  id: string;
  teamId: string;
  week: number;
  daysWorked: number;
  workDescription: string;
  labsAttended: number;
  submittedAt: string;
}

export interface RiskLevel {
  level: 'low' | 'medium' | 'high';
  score: number;
}