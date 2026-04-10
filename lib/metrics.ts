import { Milestone, RiskTrend } from './types';

export interface WeeklyEntry {
  id: string;
  project_id: string;
  week_number: number;
  days_total: number;
  work_description: string;
  lab_attended: boolean;
  demo_shown: boolean;
  teacher_notes: string | null;
  created_at: string;
}

export interface PerformanceMetrics {
  milestonesCompleted: number;
  milestonesTotal: number;
  milestonesMissed: number;
  daysWorkedLatest: number;
  daysNotWorkedLatest: number;
  labsAttendedTotal: number;
  labsMissedTotal: number;
  currentRiskScore: number;
  riskTrend: RiskTrend[];
}

/**
 * Calculates metrics and risk scores using a Cox Proportional Hazards (CoxPH) inspired model.
 * h(t) = h0(t) * exp(β1x1 + β2x2 + ...)
 * Where x represents covariates like missed milestones and low attendance.
 */
export function calculateMetrics(
  milestones: Milestone[],
  weeklyEntries: WeeklyEntry[],
  currentWeek: number,
  teamId: string
): PerformanceMetrics {
  const now = new Date();
  const totalWeeks = 12; // Semester length
  
  // 1. Milestones Metrics
  const completed = milestones.filter(m => m.completed).length;
  const totalMs = milestones.length;
  const missedMs = milestones.filter(m => {
    if (m.status === 'missed') return true;
    if (m.status === 'completed') return false;
    if (!m.deadline) return false;
    return new Date(m.deadline) < now;
  }).length;

  // 2. Weekly Activity Metrics
  const sortedEntries = [...weeklyEntries].sort((a, b) => b.week_number - a.week_number);
  const latestEntry = sortedEntries[0];
  const daysWorkedLatest = latestEntry ? latestEntry.days_total : 0;
  const daysNotWorkedLatest = 7 - daysWorkedLatest;
  const labsAttendedTotal = weeklyEntries.filter(e => e.lab_attended).length;
  const effectiveTotalWeeks = Math.max(currentWeek, latestEntry?.week_number || 0);
  const labsMissedTotal = Math.max(0, effectiveTotalWeeks - labsAttendedTotal);

  /**
   * CoxPH Inspired Risk Calculation
   */
  const calculateCoxRiskForWeek = (weekNum: number) => {
    // h0(t): Baseline hazard. Increases exponentially as we approach finals (time pressure).
    // Formula: h0(t) = 15 * exp(0.15 * t)
    const baselineHazard = 15 * Math.exp(0.15 * weekNum);

    // Covariates (x)
    const msUpToWeek = milestones.filter(m => {
      if (!m.deadline) return true;
      // Use index-based week mapping if available, otherwise fallback to date math
      return getRelativeWeekNumber(new Date(m.deadline), milestones[0]?.deadline ? new Date(milestones[0].deadline) : new Date()) <= weekNum;
    });

    const completedCount = msUpToWeek.filter(m => m.status === 'completed').length;
    const completedRatio = msUpToWeek.length > 0 ? completedCount / msUpToWeek.length : 1;
    const missedCount = msUpToWeek.filter(m => m.status === 'missed' || (!m.status && m.deadline && new Date(m.deadline) < new Date())).length;

    // Attendance consistency up to this week
    const entriesUpToWeek = weeklyEntries.filter(e => e.week_number <= weekNum);
    const avgDaysWorked = entriesUpToWeek.length > 0 
      ? entriesUpToWeek.reduce((sum, e) => sum + e.days_total, 0) / entriesUpToWeek.length 
      : 3; // Neutral default
    
    const labsMissedRatio = weekNum > 0 
      ? (weekNum - entriesUpToWeek.filter(e => e.lab_attended).length) / weekNum 
      : 0;

    // Coefficients (β)
    // Positive = increases risk, Negative = decreases risk
    const b_missed_ms = 0.8;      // High impact
    const b_days_negative = 0.5;   // Days NOT worked impact
    const b_lab_missed = 0.6;      // Attendance impact
    const b_completed_neg = -1.2;  // High negative impact (lowers risk)

    // Calculate exponent component (βx)
    const x_missed_ms = missedCount;
    const x_days_low = Math.max(0, 5 - avgDaysWorked); // Penalty for < 5 days
    const x_lab_missed = labsMissedRatio * 5;          // Scaling factor
    const x_completed = completedRatio;

    const exponent = (b_missed_ms * x_missed_ms) + 
                     (b_days_negative * x_days_low) + 
                     (b_lab_missed * x_lab_missed) + 
                     (b_completed_neg * x_completed);

    // Hazard h(t) = h0(t) * exp(exponent)
    const risk = baselineHazard * Math.exp(exponent);

    // Normalize to 0-100 scale for UI
    return Math.min(100, Math.max(5, Math.round(risk)));
  };

  const riskTrend: RiskTrend[] = [];
  for (let i = 1; i <= effectiveTotalWeeks; i++) {
    riskTrend.push({ 
      teamId: teamId,
      week: i, 
      score: calculateCoxRiskForWeek(i),
      date: new Date().toISOString()
    });
  }

  const currentRiskScore = riskTrend.length > 0 ? riskTrend[riskTrend.length - 1].score : 0;

  return {
    milestonesCompleted: completed,
    milestonesTotal: totalMs,
    milestonesMissed: missedMs,
    daysWorkedLatest,
    daysNotWorkedLatest,
    labsAttendedTotal,
    labsMissedTotal,
    currentRiskScore,
    riskTrend
  };
}

function getRelativeWeekNumber(date: Date, startDate: Date): number {
    const diffTime = Math.abs(date.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.ceil(diffDays / 7));
}
