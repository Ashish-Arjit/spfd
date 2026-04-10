'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/auth-context';
import { createClient } from '@/lib/supabase/client';
import {
  getTeamsForTeacher,
  getCurrentRiskScore,
  getRiskTrendsByTeam,
  findUserById,
  getWeeklyLogsByTeam,
  getProjectSettingsForTeam,
  createOrUpdateProjectSettings,
} from '@/lib/storage';
import { Team, User, ProjectSettings, Milestone, WeeklyLog } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RiskLevelBadge } from '@/components/risk-level-badge';
import { RiskTrendChart } from '@/components/risk-trend-chart';
import { calculateMetrics, PerformanceMetrics } from '@/lib/metrics';
import Link from 'next/link';

// ─────────────────────────────────────────────
// Helper: days until a date
// ─────────────────────────────────────────────
function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─────────────────────────────────────────────
// Project Settings Modal
// ─────────────────────────────────────────────
interface SettingsModalProps {
  team: Team;
  settings: ProjectSettings | null;
  onClose: () => void;
  onSave: (s: ProjectSettings) => void;
}

function ProjectSettingsModal({ team, settings, onClose, onSave }: SettingsModalProps) {
  const defaultSettings: ProjectSettings = settings || {
    id: `settings_${team.id}`,
    projectId: team.projectId,
    teamId: team.id,
    teacherId: team.teacherId,
    maxTeamSize: 4,
    inactiveDaysThreshold: 7,
    finalSubmissionDate: '',
    milestones: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const [form, setForm] = useState<ProjectSettings>(JSON.parse(JSON.stringify(defaultSettings)));
  const [activeTab, setActiveTab] = useState<'general' | 'milestones'>('general');
  const [newMilestone, setNewMilestone] = useState({ name: '', deadline: '', description: '' });
  const [addingMilestone, setAddingMilestone] = useState(false);

  const updateField = <K extends keyof ProjectSettings>(key: K, value: ProjectSettings[K]) => {
    setForm(f => ({ ...f, [key]: value }));
  };

  const addMilestone = () => {
    if (!newMilestone.name || !newMilestone.deadline) return;
    const ms: Milestone = {
      id: crypto.randomUUID(), // Use a real UUID for Supabase compatibility
      name: newMilestone.name,
      deadline: newMilestone.deadline,
      description: newMilestone.description,
      completed: false,
    };
    setForm(f => ({ ...f, milestones: [...f.milestones, ms] }));
    setNewMilestone({ name: '', deadline: '', description: '' });
    setAddingMilestone(false);
  };

  const removeMilestone = (id: string) => {
    setForm(f => ({ ...f, milestones: f.milestones.filter(m => m.id !== id) }));
  };

  const updateMilestone = (id: string, field: keyof Milestone, value: string) => {
    setForm(f => ({
      ...f,
      milestones: f.milestones.map(m => m.id === id ? { ...m, [field]: value } : m),
    }));
  };

  const handleSave = () => {
    onSave({ ...form, updatedAt: new Date().toISOString() });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="w-full max-w-2xl my-4">
        <Card className="border-border bg-card overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-border flex justify-between items-center bg-primary/5">
            <div>
              <h2 className="text-xl font-bold text-foreground">Project Settings</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{team.name} · {team.id}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground text-xl transition-colors">×</button>
          </div>

          <div className="flex border-b border-border">
            {(['general', 'milestones'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-medium transition-colors capitalize ${activeTab === tab ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {tab === 'general' ? '⚙️ General' : '🏁 Milestones'}
              </button>
            ))}
          </div>

          <div className="p-5 max-h-[60vh] overflow-y-auto space-y-5">
            {activeTab === 'general' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">Max Team Size</label>
                    <input
                      type="number" min="1" max="10"
                      value={form.maxTeamSize}
                      onChange={e => updateField('maxTeamSize', Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">Inactive Days Threshold</label>
                    <input
                      type="number" min="1" max="30"
                      value={form.inactiveDaysThreshold}
                      onChange={e => updateField('inactiveDaysThreshold', Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Final Submission Date</label>
                  <input
                    type="date"
                    value={form.finalSubmissionDate}
                    onChange={e => updateField('finalSubmissionDate', e.target.value)}
                    className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
              </>
            )}

            {activeTab === 'milestones' && (
              <div className="space-y-3">
                {form.milestones.length === 0 && !addingMilestone && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No milestones yet. Add one below.</p>
                  </div>
                )}
                {form.milestones.map((ms, idx) => (
                  <div key={ms.id} className="p-4 border border-border rounded-lg bg-muted/30 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase">Milestone {idx + 1}</span>
                      <button onClick={() => removeMilestone(ms.id)} className="text-red-400 hover:text-red-600 text-xs transition-colors">Remove</button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <input
                          value={ms.name}
                          onChange={e => updateMilestone(ms.id, 'name', e.target.value)}
                          className="w-full px-3 py-1.5 border border-border bg-background text-foreground rounded-lg text-sm focus:outline-none"
                          placeholder="Milestone name"
                        />
                      </div>
                      <div>
                        <input
                          type="date"
                          value={ms.deadline}
                          onChange={e => updateMilestone(ms.id, 'deadline', e.target.value)}
                          className="w-full px-3 py-1.5 border border-border bg-background text-foreground rounded-lg text-sm focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {addingMilestone ? (
                  <div className="p-4 border-2 border-primary/30 border-dashed rounded-lg space-y-3 bg-primary/5">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        value={newMilestone.name}
                        onChange={e => setNewMilestone(n => ({ ...n, name: e.target.value }))}
                        className="w-full px-3 py-1.5 border border-border bg-background text-foreground rounded-lg text-sm focus:outline-none"
                        placeholder="Name *"
                      />
                      <input
                        type="date"
                        value={newMilestone.deadline}
                        onChange={e => setNewMilestone(n => ({ ...n, deadline: e.target.value }))}
                        className="w-full px-3 py-1.5 border border-border bg-background text-foreground rounded-lg text-sm focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={addMilestone} className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm">Add</button>
                      <button onClick={() => setAddingMilestone(false)} className="px-4 py-1.5 border border-border rounded-lg text-sm text-muted">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setAddingMilestone(true)} className="w-full py-2.5 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-primary transition-colors">+ Add Milestone</button>
                )}
              </div>
            )}
          </div>

          <div className="p-5 border-t border-border flex gap-3">
            <button onClick={handleSave} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold">Save Settings</button>
            <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-lg text-sm text-muted-foreground">Cancel</button>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Create Team Modal
// ─────────────────────────────────────────────
function CreateTeamModal({ teacherId, onClose, onCreated }: { teacherId: string, onClose: () => void, onCreated: () => void }) {
  const supabase = createClient();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const { error } = await (supabase.from('projects') as any).insert({
      name,
      teacher_id: teacherId,
      week_current: 1,
      submission_active: false,
      submission_day: 'Friday',
      students: []
    });
    setLoading(false);
    if (error) alert("Failed to create team: " + error.message);
    else {
      onCreated();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md p-6 bg-card border-border shadow-2xl">
        <h2 className="text-xl font-bold mb-4">Create New Project Team</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Project Name / Team Name</label>
            <input 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Smart City IoT"
              autoFocus
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleCreate} disabled={loading} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg font-bold">
              {loading ? 'Creating...' : 'Create Team'}
            </button>
            <button onClick={onClose} className="flex-1 py-2 border border-border rounded-lg text-muted-foreground">Cancel</button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// Team Detail Panel
// ─────────────────────────────────────────────
interface TeamDetailProps {
  team: Team;
  members: User[];
  settings: ProjectSettings | null;
  weeklyEntries: any[];
  metrics: PerformanceMetrics | null;
  onOpenSettings: () => void;
  onDelete: () => void;
}

function TeamDetailPanel({ team, members, settings, weeklyEntries, metrics, onOpenSettings, onDelete }: TeamDetailProps) {
  const supabase = createClient();
  const riskScore = metrics?.currentRiskScore || 0;
  const riskTrends = metrics?.riskTrend || [];
  const milestones = settings?.milestones || [];
  const completedCount = metrics?.milestonesCompleted || 0;

  const handleDeleteTeam = async () => {
    if (!confirm(`Are you absolutely sure you want to delete "${team.name}"? This will permanently remove all logs, milestones and project data.`)) return;
    
    // 1. Send notification to Team Leader before deleting the project
    if (team.leaderId) {
       await (supabase.from('notifications') as any).insert({
         user_id: team.leaderId,
         title: "Project Team Removed",
         message: `Your project "${team.name}" has been removed/rejected by the mentor. Please contact your teacher for feedback.`,
         type: 'danger'
       });
    }

    // 2. Cascade delete in Supabase
    await supabase.from('milestones').delete().eq('project_id', team.id);
    await supabase.from('weekly_entries').delete().eq('project_id', team.id);
    const { error } = await supabase.from('projects').delete().eq('id', team.id);
    
    if (error) alert("Deletion failed: " + error.message);
    else onDelete();
  };

  const updateWeeklyEntry = async (entryId: string, field: string, value: any) => {
    const { error } = await (supabase
      .from('weekly_entries') as any)
      .update({ [field]: value })
      .eq('id', entryId);
    
    if (error) alert("Failed to update entry: " + error.message);
  };

  const updateMilestoneScore = async (milestoneId: string, completed: boolean) => {
    const { error } = await (supabase
      .from('milestones') as any)
      .update({ 
        completed, 
        completed_at: completed ? new Date().toISOString() : null 
      })
      .eq('id', milestoneId);
    
    if (error) alert("Failed to update milestone: " + error.message);
  };

  const addTeamMember = async (student: any) => {
    const currentStudents = team.memberIds || [];
    if (currentStudents.includes(student.id)) {
      alert("Student is already in the team!");
      return;
    }

    const updatedStudentsList = [...(team as any).rawStudents || [], {
      id: student.id,
      name: student.name,
      email: student.email
    }];

    const { error } = await (supabase.from('projects') as any)
      .update({ students: updatedStudentsList })
      .eq('id', team.id);

    if (error) alert("Failed to add member: " + error.message);
    else window.location.reload(); // Refresh to see new members
  };

  const removeTeamMember = async (studentId: string) => {
    const updatedList = ((team as any).rawStudents || []).filter((s: any) => s.id !== studentId);
    const { error } = await (supabase.from('projects') as any).update({ students: updatedList }).eq('id', team.id);
    if (error) alert("Remove failed: " + error.message);
    else window.location.reload();
  };

  const setTeamLead = async (studentId: string) => {
    const { error } = await (supabase.from('projects') as any).update({ created_by: studentId }).eq('id', team.id);
    if (error) alert("Lead update failed: " + error.message);
    else window.location.reload();
  };

  const toggleSubmission = async (active: boolean) => {
    const { error } = await (supabase
      .from('projects') as any)
      .update({ submission_active: active })
      .eq('id', team.id);
    if (error) alert("Failed to update access: " + error.message);
  };

  const updateSubmissionDay = async (day: string) => {
    const { error } = await (supabase
      .from('projects') as any)
      .update({ submission_day: day })
      .eq('id', team.id);
    if (error) alert("Failed to update day: " + error.message);
  };

  const updateSubmissionWindow = async (days: number) => {
    const { error } = await (supabase
      .from('projects') as any)
      .update({ submission_window: days })
      .eq('id', team.id);
    if (error) alert("Failed to update window: " + error.message);
  };
  
  return (
    <div className="space-y-6 pb-20">
      <Card className="p-6 border-border bg-card shadow-sm">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h2 className="text-3xl font-bold text-foreground tracking-tight">{team.name}</h2>
            <p className="text-xs text-muted-foreground font-mono mt-1">Project ID: {team.id}</p>
          </div>
          <div className="flex items-center gap-3">
            <RiskLevelBadge score={riskScore} size="lg" />
            <button onClick={onOpenSettings} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors">
              <span>⚙️ Settings</span>
            </button>
            <button onClick={handleDeleteTeam} className="p-2 border border-red-500/30 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors" title="Delete Team">
              🗑️
            </button>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Submission Control</h3>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold">Week {team.currentWeek} Status:</span>
              <button 
                onClick={() => toggleSubmission(!(team as any).submission_active)}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                  (team as any).submission_active 
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' 
                    : 'bg-red-500 text-white'
                }`}
              >
                {(team as any).submission_active ? '● Submissions Open' : '○ Submissions Closed'}
              </button>
            </div>

            <div className="flex items-center gap-3 border-l border-border pl-6">
              <span className="text-sm font-bold">Allowed Day:</span>
              <select 
                value={(team as any).submission_day || 'Friday'}
                onChange={(e) => updateSubmissionDay(e.target.value)}
                className="bg-muted px-3 py-1.5 rounded-lg text-xs font-bold border-none focus:ring-2 focus:ring-primary"
              >
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 border-l border-border pl-6">
              <span className="text-sm font-bold">Window (Days):</span>
              <select 
                value={(team as any).submission_window || 1}
                onChange={(e) => updateSubmissionWindow(parseInt(e.target.value))}
                className="bg-muted px-3 py-1.5 rounded-lg text-xs font-bold border-none focus:ring-2 focus:ring-primary"
              >
                {[1, 2, 3, 4, 5, 6, 7].map(d => (
                  <option key={d} value={d}>{d} Day{d > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-8">
          <div className="p-4 bg-muted/40 rounded-xl text-center border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">MS Done</p>
            <p className="text-xl font-black text-primary">{metrics?.milestonesCompleted}/{metrics?.milestonesTotal}</p>
          </div>
          <div className="p-4 bg-muted/40 rounded-xl text-center border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">Days Work</p>
            <p className="text-xl font-black text-primary">{metrics?.daysWorkedLatest}</p>
          </div>
          <div className="p-4 bg-muted/40 rounded-xl text-center border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">Labs Done</p>
            <p className="text-xl font-black text-primary">{metrics?.labsAttendedTotal}</p>
          </div>
          <div className="p-4 bg-muted/40 rounded-xl text-center border border-border/50">
            <p className="text-[10px] text-orange-600/70 uppercase font-black tracking-widest mb-1">Lab Missed</p>
            <p className="text-xl font-black text-orange-600">{metrics?.labsMissedTotal}</p>
          </div>
          <div className="p-4 bg-muted/40 rounded-xl text-center border border-border/50">
            <p className="text-[10px] text-red-600/70 uppercase font-black tracking-widest mb-1">MS Missed</p>
            <p className="text-xl font-black text-red-600">{metrics?.milestonesMissed}</p>
          </div>
          <div className="p-4 bg-muted/40 rounded-xl text-center border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">Days Off</p>
            <p className="text-xl font-black text-primary">{metrics?.daysNotWorkedLatest}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 border-border bg-card shadow-sm h-full">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-foreground">📈 Performance Curve</h3>
            <span className="text-[10px] text-muted-foreground font-bold uppercase py-1 px-2 bg-muted rounded">Real-time Risk Analysis</span>
          </div>
          <RiskTrendChart data={riskTrends} height={300} />
        </Card>

        <Card className="p-6 border-border bg-card shadow-sm">
          <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
            <span>🏁 Project Milestones</span>
            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{completedCount}/{milestones.length}</span>
          </h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {milestones.length === 0 ? (
              <p className="text-sm text-center py-10 text-muted italic border-2 border-dashed border-muted rounded-xl">No milestones configured for this team.</p>
            ) : (
              milestones.map((ms, idx) => {
                const isLate = ms.completed && ms.completed_at && ms.deadline && new Date(ms.completed_at) > new Date(ms.deadline);
                
                return (
                  <div key={ms.id} className={`p-4 rounded-xl border flex justify-between items-center transition-all ${ms.completed ? 'bg-green-500/5 border-green-500/20 shadow-sm' : 'bg-muted/30 border-transparent hover:border-border'}`}>
                    <div>
                      <p className={`text-sm font-bold ${ms.completed ? 'text-green-700' : 'text-foreground'}`}>{ms.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider font-mono">
                         Deadline: {ms.deadline ? formatDate(ms.deadline) : 'Not set'}
                      </p>
                      {ms.completed && ms.completed_at && (
                        <p className="text-[9px] text-muted-foreground/70 italic mt-1 font-mono">
                          Fixed: {formatDate(ms.completed_at)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {ms.completed ? (
                        <div className="text-right">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-sm ${isLate ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                            {isLate ? 'Late' : 'On-Time'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Pending</span>
                      )}
                      
                      <input 
                        type="checkbox" 
                        checked={ms.completed || false} 
                        onChange={(e) => updateMilestoneScore(ms.id, e.target.checked)}
                        className="w-4 h-4 rounded accent-primary cursor-pointer"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      <Card className="p-6 border-border bg-card shadow-sm mt-8">
        <h3 className="text-lg font-bold text-foreground mb-6">📅 Weekly Progress & Attendance Verification</h3>
        <div className="space-y-4">
          {weeklyEntries.length === 0 ? (
            <p className="text-sm text-center py-10 text-muted italic border-2 border-dashed border-muted rounded-xl">No weekly logs submitted by students yet.</p>
          ) : (
            weeklyEntries.map((entry) => (
              <div key={entry.id} className="p-5 rounded-xl border border-border bg-muted/20 space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h4 className="font-bold text-sm">Week {entry.week_number} Log</h4>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                      Submitted: {new Date(entry.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={entry.lab_attended} 
                        onChange={(e) => updateWeeklyEntry(entry.id, 'lab_attended', e.target.checked)}
                        className="w-4 h-4 rounded accent-primary"
                      />
                      <span className="text-[11px] font-bold uppercase text-foreground">Lab Attended</span>
                    </label>

                    <label className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={entry.demo_shown} 
                        onChange={(e) => updateWeeklyEntry(entry.id, 'demo_shown', e.target.checked)}
                        className="w-4 h-4 rounded accent-primary"
                      />
                      <span className="text-[11px] font-bold uppercase text-foreground">Demo Shown</span>
                    </label>
                  </div>
                </div>

                <div className="bg-background/80 p-4 rounded-lg border border-border/50">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mb-2">Student Description</p>
                  <p className="text-sm italic text-foreground/80 leading-relaxed">"{entry.work_description}"</p>
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Mentor Feedbacks / Notes</p>
                  <input 
                    type="text" 
                    placeholder="Add feedback for this week..." 
                    defaultValue={entry.teacher_notes || ''}
                    onBlur={(e) => updateWeeklyEntry(entry.id, 'teacher_notes', e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="p-6 border-border bg-card shadow-sm mt-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-foreground">👥 Team Members</h3>
          <StudentSearch onSelect={addTeamMember} />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {members.length === 0 ? (
            <p className="col-span-full text-center py-10 text-muted-foreground italic border border-dashed border-border rounded-xl">Team is empty. Use the search above to add students.</p>
          ) : (
            members.map(member => (
              <div key={member.id} className="p-4 rounded-xl bg-muted/40 border border-border/50 flex flex-col justify-between group transition-all hover:border-primary/50">
                <div className="flex justify-between items-start">
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">{member.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{member.email}</p>
                  </div>
                  <button onClick={() => removeTeamMember(member.id)} className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-500/10 rounded transition-all">
                    Remove
                  </button>
                </div>
                
                <div className="mt-3 pt-3 border-t border-border/30 flex justify-between items-center">
                  {member.id === team.leaderId ? 
                    <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-1 rounded-full ring-1 ring-primary/20">Project Lead</span> : 
                    <button 
                      onClick={() => setTeamLead(member.id)}
                      className="text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
                    >
                      Set as Lead
                    </button>
                  }
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

function StudentSearch({ onSelect }: { onSelect: (s: any) => void }) {
  const supabase = createClient();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const search = async () => {
      if (query.length < 3) { setResults([]); return; }
      setLoading(true);
      const { data } = await supabase.from('profiles')
        .select('id, name, email')
        .eq('role', 'student')
        .ilike('name', `%${query}%`)
        .limit(5);
      setResults(data || []);
      setLoading(false);
    };
    const timer = setTimeout(search, 500);
    return () => clearTimeout(timer);
  }, [query, supabase]);

  return (
    <div className="relative w-full max-w-xs">
      <input 
        type="text" 
        placeholder="Search students to add..." 
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full text-xs px-4 py-2 border border-border rounded-full bg-muted/20 focus:ring-2 focus:ring-primary outline-none"
      />
      {loading && <div className="absolute right-4 top-2.5 animate-spin w-3 h-3 border border-primary border-t-transparent rounded-full" />}
      
      {results.length > 0 && (
        <Card className="absolute top-full left-0 w-full mt-2 z-50 p-2 shadow-2xl border-border bg-card">
          {results.map(s => (
            <button 
              key={s.id} 
              onClick={() => { onSelect(s); setQuery(''); setResults([]); }}
              className="w-full text-left p-2 hover:bg-muted text-xs rounded transition-colors"
            >
              <p className="font-bold">{s.name}</p>
              <p className="text-[10px] text-muted-foreground">{s.email}</p>
            </button>
          ))}
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Teacher Dashboard
// ─────────────────────────────────────────────
export default function TeacherDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const supabase = createClient();
  const [teacherTeams, setTeacherTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [teamSettings, setTeamSettings] = useState<ProjectSettings | null>(null);
  const [weeklyEntries, setWeeklyEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const fetchTeams = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('projects')
        .select('*')
        .eq('teacher_id', user.id);
      
      const supaProjects: any[] = data || [];
      if (supaProjects.length > 0 && !error) {
        const mapped: Team[] = supaProjects.map(p => ({
          id: p.id, 
          name: p.name, 
          projectId: p.id, 
          leaderId: p.created_by || '',
          teacherId: user.id || '', 
          memberIds: (p.students as any[] || []).map((s: any) => s.id),
          rawStudents: p.students || [], // Keep full student metadata
          currentWeek: p.week_current || 1, 
          submission_active: p.submission_active || false,
          submission_day: p.submission_day || 'Friday',
          submission_window: p.submission_window || 1,
          milestoneDeadline: '', 
          createdAt: p.created_at || ''
        }));
        setTeacherTeams(mapped);
        if (!selectedTeam && mapped.length > 0) pickTeam(mapped[0]);
      } else {
        setTeacherTeams([]);
      }
    } catch (err) { } finally { setLoading(false); }
  }, [user, supabase, selectedTeam]);

  const refreshMilestones = useCallback(async (teamId: string, teacherId: string) => {
    const { data: msData } = await (supabase.from('milestones') as any).select('*').eq('project_id', teamId);
    const settings = getProjectSettingsForTeam(teamId);
    
    if (msData && msData.length > 0) {
        const syncedMilestones: Milestone[] = msData.map((m: any) => ({
            id: m.id,
            name: m.description,
            deadline: m.deadline || '',
            description: '', 
            completed: m.completed || false,
            completed_at: m.completed_at || undefined
        }));

        setTeamSettings({
            ...(settings || {
              id: `settings_${teamId}`,
              projectId: teamId,
              teamId: teamId,
              teacherId: teacherId,
              maxTeamSize: 4,
              inactiveDaysThreshold: 7,
              finalSubmissionDate: '',
              milestones: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }),
            milestones: syncedMilestones,
            id: settings?.id || `settings_${teamId}`,
            projectId: settings?.projectId || teamId,
            teamId: settings?.teamId || teamId,
            teacherId: settings?.teacherId || teacherId
        });
    } else {
        setTeamSettings(settings);
    }
  }, [supabase]);

  const pickTeam = useCallback(async (team: Team) => {
    setSelectedTeam(team);
    try {
      const { data, error } = await supabase.from('projects').select('*').eq('id', team.id).single();
      const supaProj: any = data;
      if (supaProj && !error) {
        const studentList = (supaProj.students as any[] | null) || [];
        const members = studentList.map(s => ({
          id: s.id, name: s.name, email: s.email, role: 'student' as 'student'
        } as User));
        setTeamMembers(members);
      } else {
        setTeamMembers(team.memberIds.map(id => findUserById(id)).filter((u): u is User => u !== null));
      }
      
      await refreshMilestones(team.id, team.teacherId);
      
      const { data: weekData } = await supabase.from('weekly_entries')
        .select('*')
        .eq('project_id', team.id)
        .order('week_number', { ascending: false });
      if (weekData) setWeeklyEntries(weekData);

    } catch (e) {
      setTeamMembers([]);
    }
  }, [supabase, refreshMilestones]);

  useEffect(() => {
    if (!selectedTeam) return;

    const channel = supabase
      .channel(`mentor-milestones-${selectedTeam.id}`)
      .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'milestones',
          filter: `project_id=eq.${selectedTeam.id}`
      }, (payload) => {
          refreshMilestones(selectedTeam.id, selectedTeam.teacherId); 
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTeam?.id, supabase, refreshMilestones]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'teacher') { router.push('/dashboard'); return; }

    fetchTeams();
  }, [authLoading, user, supabase, router, fetchTeams]);

  const metrics: any | null = useMemo(() => {
    if (!selectedTeam || !teamSettings) return null;
    return calculateMetrics(teamSettings.milestones, weeklyEntries, selectedTeam.currentWeek, selectedTeam.id);
  }, [teamSettings, weeklyEntries, selectedTeam]);

  const currentRiskScore = metrics ? metrics.currentRiskScore : 0;
  const riskTrends = metrics ? metrics.riskTrend : [];

  const handleSaveSettings = async (settings: ProjectSettings) => {
    try {
      // 1. Sync Milestones to Supabase
      if (settings.milestones.length > 0) {
        const milestonesToSync = settings.milestones.map(ms => ({
          id: ms.id, // Preserve ID for upsert
          project_id: settings.projectId,
          description: ms.name,
          deadline: ms.deadline || null,
          completed: ms.completed || false,
          completed_at: ms.completed_at || null, // Preserve completion timestamp
          created_by: user!.id,
          week_target: 1 
        }));

        // Use 'upsert' instead of delete-insert to avoid breaking existing relations
        // and preserve student 'completed_at' dates if they exist.
        // 2. Identify and delete milestones that were removed from the UI
        const currentMsIds = settings.milestones.map(m => m.id);
        await supabase
          .from('milestones')
          .delete()
          .eq('project_id', settings.projectId)
          .not('id', 'in', `(${currentMsIds.join(',')})`); // Fixed: Use IN filter correctly for Supabase

        // 3. Upsert the remaining/new milestones
        const { error: msError } = await (supabase
          .from('milestones') as any)
          .upsert(milestonesToSync);

        if (msError) {
          console.error("Supabase Milestone sync failed:", msError.message);
          alert("Error saving milestones: " + msError.message);
        } else {
          console.log("Milestones saved successfully to Supabase!");
        }
      }
      createOrUpdateProjectSettings(settings);
      setTeamSettings(settings);
      setShowSettingsModal(false);
    } catch (e) {
      setShowSettingsModal(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden absolute inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <header className="border-b p-4 sticky top-0 bg-card/80 backdrop-blur-md z-30 flex justify-between items-center px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 hover:bg-muted rounded-lg"
          >
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tight text-foreground">Teacher Dashboard</h1>
            <p className="hidden sm:block text-[10px] text-muted-foreground uppercase font-black tracking-widest">Welcome, {user?.name}</p>
          </div>
        </div>
        <button onClick={() => { logout(); router.push('/login'); }} className="px-3 py-1.5 border border-border rounded-lg text-xs font-bold hover:bg-muted transition-colors">Logout</button>
      </header>

      <main className="max-w-7xl mx-auto p-4 lg:p-6 flex flex-col lg:flex-row gap-6">
        <aside className={`fixed lg:static inset-y-0 left-0 w-72 lg:w-64 bg-card lg:bg-transparent z-50 lg:z-0 border-r lg:border-0 shadow-2xl lg:shadow-none transition-transform duration-300 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex-shrink-0 p-6 lg:p-0`}>
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold italic">SP</div>
            <h1 className="font-black text-xl tracking-tighter">SPFD <span className="text-primary text-[10px] uppercase font-bold tracking-widest block">Mentor</span></h1>
          </div>

          <Button onClick={() => { setShowCreateModal(true); setIsMobileMenuOpen(false); }} className="w-full mb-6 font-bold py-6 bg-primary text-primary-foreground shadow-lg hover:shadow-primary/20 transition-all">+ New Team</Button>
          
          <Card className="p-4 shadow-sm border-border bg-card/50 backdrop-blur-sm">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Project Teams ({teacherTeams.length})</h3>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
              {teacherTeams.length === 0 ? (
                <p className="text-xs text-center py-4 text-muted italic">No teams found.</p>
              ) : (
                teacherTeams.map(team => (
                  <button 
                    key={team.id} 
                    onClick={() => { pickTeam(team); setIsMobileMenuOpen(false); }} 
                    className={`w-full text-left p-3 rounded-xl border transition-all ${selectedTeam?.id === team.id ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'border-border text-foreground hover:bg-muted/50'}`}
                  >
                    <p className="font-bold text-sm truncate">{team.name}</p>
                    <p className="text-[9px] mt-0.5 opacity-60">Week {team.currentWeek} · {team.memberIds.length} Std</p>
                  </button>
                ))
              )}
            </div>
          </Card>
        </aside>

        <div className="flex-1 min-w-0 z-10">
          {selectedTeam ? (
            <TeamDetailPanel 
              team={selectedTeam} 
              members={teamMembers} 
              settings={teamSettings} 
              weeklyEntries={weeklyEntries} 
              metrics={metrics}
              onOpenSettings={() => setShowSettingsModal(true)} 
              onDelete={() => {
                setSelectedTeam(null);
                fetchTeams();
              }}
            />
          ) : (
            <Card className="p-12 text-center bg-card/50 backdrop-blur-sm border-border/50 text-muted-foreground italic animate-pulse">
              Select a team from the menu to view progress analysis.
            </Card>
          )}
        </div>
      </main>

      {showSettingsModal && selectedTeam && (
        <ProjectSettingsModal team={selectedTeam} settings={teamSettings} onClose={() => setShowSettingsModal(false)} onSave={handleSaveSettings} />
      )}

      {showCreateModal && user && (
        <CreateTeamModal teacherId={user.id} onClose={() => setShowCreateModal(false)} onCreated={fetchTeams} />
      )}
    </div>
  );
}