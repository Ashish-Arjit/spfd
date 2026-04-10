import { User, Team, RiskTrend, WeeklyLog, ProjectSettings, MilestoneSubmission } from './types';
import { mockUsers, mockTeams, mockRiskTrends, mockWeeklyLogs, mockProjectSettings } from './mock-data';

const STORAGE_KEYS = {
  USERS: 'sdfds_users',
  TEAMS: 'sdfds_teams',
  RISK_TRENDS: 'sdfds_risk_trends',
  WEEKLY_LOGS: 'sdfds_weekly_logs',
  PROJECT_SETTINGS: 'sdfds_project_settings',
  MILESTONE_SUBMISSIONS: 'sdfds_milestone_submissions',
  CURRENT_USER: 'sdfds_current_user',
  DB_INITIALIZED: 'sdfds_db_initialized_v3', // bump version to force reset
};

export const initializeDatabase = () => {
  if (typeof window === 'undefined') return;
  const isInitialized = localStorage.getItem(STORAGE_KEYS.DB_INITIALIZED);
  if (isInitialized) return;
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(mockUsers));
  localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(mockTeams));
  localStorage.setItem(STORAGE_KEYS.RISK_TRENDS, JSON.stringify(mockRiskTrends));
  localStorage.setItem(STORAGE_KEYS.WEEKLY_LOGS, JSON.stringify(mockWeeklyLogs));
  localStorage.setItem(STORAGE_KEYS.PROJECT_SETTINGS, JSON.stringify(mockProjectSettings));
  localStorage.setItem(STORAGE_KEYS.MILESTONE_SUBMISSIONS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.DB_INITIALIZED, 'true');
};

export const getUsers = (): User[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.USERS);
  return data ? JSON.parse(data) : [];
};
export const saveUsers = (users: User[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
};
export const findUserByEmail = (email: string): User | null => getUsers().find(u => u.email === email) || null;
export const findUserById = (id: string): User | null => getUsers().find(u => u.id === id) || null;
export const createUser = (user: User): User => {
  const users = getUsers();
  const newUser = { ...user, id: `user_${Date.now()}` };
  users.push(newUser);
  saveUsers(users);
  return newUser;
};

export const getTeams = (): Team[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.TEAMS);
  return data ? JSON.parse(data) : [];
};
export const saveTeams = (teams: Team[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
};
export const getTeamById = (id: string): Team | null => getTeams().find(t => t.id === id) || null;
export const getTeamsForMember = (userId: string): Team[] => getTeams().filter(t => t.memberIds.includes(userId));

// Get teams for teacher - also reassigns mock teams to first teacher if none found
export const getTeamsForTeacher = (teacherId: string): Team[] => {
  const teams = getTeams();
  const assigned = teams.filter(t => t.teacherId === teacherId);
  
  // If no teams assigned to this teacher, reassign all mock teams to them (demo mode)
  if (assigned.length === 0) {
    const updated = teams.map(t => ({ ...t, teacherId }));
    saveTeams(updated);
    
    // Also update project settings teacherId
    const settings = getProjectSettings();
    const updatedSettings = settings.map(s => ({ ...s, teacherId }));
    saveProjectSettings(updatedSettings);
    
    return updated;
  }
  return assigned;
};

export const createTeam = (team: Omit<Team, 'id' | 'createdAt'>): Team => {
  const teams = getTeams();
  const newTeam: Team = { ...team, id: `team_${Date.now()}`, createdAt: new Date().toISOString() };
  teams.push(newTeam);
  saveTeams(teams);
  return newTeam;
};

export const getRiskTrends = (): RiskTrend[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.RISK_TRENDS);
  return data ? JSON.parse(data) : [];
};
export const saveRiskTrends = (trends: RiskTrend[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.RISK_TRENDS, JSON.stringify(trends));
};
export const getRiskTrendsByTeam = (teamId: string): RiskTrend[] =>
  getRiskTrends().filter(t => t.teamId === teamId).sort((a, b) => a.week - b.week);
export const getCurrentRiskScore = (teamId: string): number => {
  const trends = getRiskTrendsByTeam(teamId);
  if (trends.length === 0) return 0;
  return trends[trends.length - 1].score;
};

export const getWeeklyLogs = (): WeeklyLog[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.WEEKLY_LOGS);
  return data ? JSON.parse(data) : [];
};
export const saveWeeklyLogs = (logs: WeeklyLog[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.WEEKLY_LOGS, JSON.stringify(logs));
};
export const getWeeklyLogsByTeam = (teamId: string): WeeklyLog[] =>
  getWeeklyLogs().filter(l => l.teamId === teamId).sort((a, b) => b.week - a.week);
export const addWeeklyLog = (log: Omit<WeeklyLog, 'id' | 'submittedAt'>): WeeklyLog => {
  const logs = getWeeklyLogs();
  const newLog: WeeklyLog = { ...log, id: `log_${Date.now()}`, submittedAt: new Date().toISOString().split('T')[0] };
  logs.push(newLog);
  saveWeeklyLogs(logs);
  return newLog;
};

export const setCurrentUser = (user: User | null) => {
  if (typeof window === 'undefined') return;
  if (user) localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  else localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
};
export const getCurrentUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  return data ? JSON.parse(data) : null;
};
export const logout = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
};

export const getProjectSettings = (): ProjectSettings[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.PROJECT_SETTINGS);
  return data ? JSON.parse(data) : [];
};
export const saveProjectSettings = (settings: ProjectSettings[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.PROJECT_SETTINGS, JSON.stringify(settings));
};
export const getProjectSettingsForTeacher = (teacherId: string): ProjectSettings | null => {
  const settings = getProjectSettings();
  return settings.find(s => s.teacherId === teacherId) || null;
};
export const getProjectSettingsForTeam = (teamId: string): ProjectSettings | null => {
  const settings = getProjectSettings();
  return settings.find(s => s.teamId === teamId) || null;
};
export const createOrUpdateProjectSettings = (settings: ProjectSettings): ProjectSettings => {
  const allSettings = getProjectSettings();
  const existing = allSettings.findIndex(s => s.id === settings.id);
  if (existing >= 0) {
    allSettings[existing] = { ...settings, updatedAt: new Date().toISOString() };
  } else {
    allSettings.push({ ...settings, updatedAt: new Date().toISOString() });
  }
  saveProjectSettings(allSettings);
  return settings;
};

export const getMilestoneSubmissions = (): MilestoneSubmission[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.MILESTONE_SUBMISSIONS);
  return data ? JSON.parse(data) : [];
};
export const getMilestoneSubmissionsForTeam = (teamId: string): MilestoneSubmission[] =>
  getMilestoneSubmissions().filter(s => s.teamId === teamId);