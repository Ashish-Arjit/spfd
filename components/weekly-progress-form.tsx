'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { FieldGroup, FieldLabel } from '@/components/ui/field';
import { Checkbox } from '@/components/ui/checkbox';
import { createClient } from '@/lib/supabase/client';

interface WeeklyProgressFormProps {
  teamId: string;
  currentWeek: number;
  submissionActive: boolean;
  submissionDay: string;
  submissionWindow?: number;
  alreadySubmitted: boolean;
  onSubmit?: () => void;
}

export function WeeklyProgressForm({ 
  teamId, 
  currentWeek, 
  submissionActive, 
  submissionDay, 
  submissionWindow = 1, 
  alreadySubmitted, 
  onSubmit 
}: WeeklyProgressFormProps) {
  const supabase = createClient();
  const [formData, setFormData] = useState({
    days_total: 5,
    work_description: '',
    lab_attended: false,
    demo_shown: false,
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'days_total' ? parseInt(value) : value,
    }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const { error } = await supabase.from('weekly_entries').insert({
        project_id: teamId,
        week_number: currentWeek,
        days_total: formData.days_total,
        work_description: formData.work_description,
        lab_attended: formData.lab_attended,
        demo_shown: formData.demo_shown,
        milestones_hit: [], // Default empty array as jsonb
      } as any);

      if (error) {
        alert("Submission failed: " + error.message);
      } else {
        setSuccess(true);
        setFormData({
          days_total: 5,
          work_description: '',
          lab_attended: false,
          demo_shown: false,
        });
        
        // Advance the week automatically
        await (supabase
          .from('projects') as any)
          .update({ week_current: currentWeek + 1, submission_active: false })
          .eq('id', teamId);

        setTimeout(() => setSuccess(false), 3000);
        onSubmit?.();
      }
    } finally {
      setLoading(false);
    }
  };

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = days[new Date().getDay()];
  
  // Calculate if today is within the submission window (e.g. Day + X days)
  const isWithinWindow = () => {
    const targetIdx = days.indexOf(submissionDay);
    if (targetIdx === -1) return false;
    
    const todayIdx = new Date().getDay();
    
    // Check if today falls in the range [targetIdx, targetIdx + submissionWindow - 1]
    // modulo 7 to handle wrap-around weeks
    for (let i = 0; i < (submissionWindow || 1); i++) {
       if (((targetIdx + i) % 7) === todayIdx) return true;
    }
    return false;
  };

  const isCorrectDay = isWithinWindow();
  const canSubmit = submissionActive && isCorrectDay && !alreadySubmitted;

  if (alreadySubmitted) {
    return (
      <Card className="p-6 border-border bg-muted/20">
        <div className="text-center py-4">
          <p className="text-lg font-bold text-foreground">Week {currentWeek} Progress Logged</p>
          <p className="text-sm text-muted-foreground mt-2">You have already submitted your progress for this week. Submissions are limited to once per week.</p>
        </div>
      </Card>
    );
  }

  if (!submissionActive || !isCorrectDay) {
    return (
      <Card className="p-6 border-border bg-muted/20">
        <div className="text-center py-4">
          <p className="text-lg font-bold text-foreground opacity-50">Submission Portal Closed</p>
          <p className="text-sm text-muted-foreground mt-2 italic">
            {!isCorrectDay 
              ? `Submissions are allowed on ${submissionDay}${submissionWindow > 1 ? ` (Window: ${submissionWindow} days)` : 's'}.` 
              : "Wait for your mentor to open this week's submission window."}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-border bg-card">
      <h3 className="text-lg font-semibold text-foreground mb-4">Weekly Progress Log (Week {currentWeek})</h3>

      {success && (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-200 rounded-lg">
          <p className="text-green-700 text-sm">✓ Weekly log submitted successfully!</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldGroup>
            <FieldLabel>Days Worked This Week</FieldLabel>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                name="days_total"
                min="0"
                max="7"
                value={formData.days_total}
                onChange={handleInputChange}
                className="flex-1"
              />
              <span className="text-muted-foreground text-sm">/ 7 days</span>
            </div>
          </FieldGroup>

          <div className="flex flex-col justify-center gap-3 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="lab_attended" 
                checked={formData.lab_attended} 
                onCheckedChange={(checked) => handleCheckboxChange('lab_attended', !!checked)} 
              />
              <label htmlFor="lab_attended" className="text-sm font-medium leading-none cursor-pointer">
                Lab Session Attended
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="demo_shown" 
                checked={formData.demo_shown} 
                onCheckedChange={(checked) => handleCheckboxChange('demo_shown', !!checked)} 
              />
              <label htmlFor="demo_shown" className="text-sm font-medium leading-none cursor-pointer">
                In-person Demo Shown
              </label>
            </div>
          </div>
        </div>

        <FieldGroup>
          <FieldLabel>Work Description</FieldLabel>
          <textarea
            name="work_description"
            placeholder="Describe the work completed this week..."
            value={formData.work_description}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            required
          />
        </FieldGroup>

        <Button
          type="submit"
          disabled={loading || !formData.work_description.trim()}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {loading ? 'Submitting...' : 'Submit Weekly Log'}
        </Button>
      </form>
    </Card>
  );
}

