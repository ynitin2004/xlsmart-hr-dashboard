import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SkillsDashboardAnalytics {
  totalEmployees: number;
  assessedEmployees: number;
  totalSkills: number;
  skillGaps: number;
  avgSkillLevel: number;
  topSkills: any[];
  criticalGaps: any[];
  recentAssessments: any[];
  aiInsights: {
    matchRate: number;
    efficiencyGain: number;
    activePrograms: number;
    completionRate: number;
    skillPredictions: { skill: string; trend: number }[];
    topTalentMatches: number;
  };
  loading: boolean;
}

const fetchSkillsDashboardAnalytics = async (): Promise<Omit<SkillsDashboardAnalytics, 'loading'>> => {
  // Optimize: Use parallel queries with only necessary data
  const [
    employeesCountResult,
    skillsCountResult,
    assessmentsResult,
    recentAssessmentsResult
  ] = await Promise.all([
    // Get total employees count only
    supabase
      .from('xlsmart_employees')
      .select('*', { count: 'exact', head: true }),
    
    // Get total skills count only  
    supabase
      .from('skills_master')
      .select('*', { count: 'exact', head: true }),
    
    // Get assessment data with only needed fields
    supabase
      .from('xlsmart_skill_assessments')
      .select('employee_id, overall_match_percentage, skill_gaps, level_fit_score, assessment_date')
      .order('assessment_date', { ascending: false }),
    
    // Get recent assessments for display (limit to 5)
    supabase
      .from('xlsmart_skill_assessments')
      .select('id, overall_match_percentage, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
  ]);

  // Handle errors
  if (employeesCountResult.error) throw employeesCountResult.error;
  if (skillsCountResult.error) throw skillsCountResult.error;
  if (assessmentsResult.error) throw assessmentsResult.error;
  if (recentAssessmentsResult.error) throw recentAssessmentsResult.error;

  // Process results efficiently
  const totalEmployees = employeesCountResult.count || 0;
  const totalSkills = skillsCountResult.count || 0;
  const assessments = assessmentsResult.data || [];
  const recentAssessments = recentAssessmentsResult.data || [];

  // Count unique employees who have been assessed
  const uniqueAssessedEmployees = new Set(assessments.map(a => a.employee_id)).size;

  // Get latest assessment per employee to avoid duplicates
  const latestAssessmentPerEmployee = new Map();
  assessments.forEach(assessment => {
    const employeeId = assessment.employee_id;
    const existingAssessment = latestAssessmentPerEmployee.get(employeeId);
    
    if (!existingAssessment || new Date(assessment.assessment_date) > new Date(existingAssessment.assessment_date)) {
      latestAssessmentPerEmployee.set(employeeId, assessment);
    }
  });

  // Calculate analytics from latest assessments only
  const latestAssessments = Array.from(latestAssessmentPerEmployee.values());
  const avgSkillLevel = latestAssessments.length > 0 
    ? latestAssessments.reduce((sum, a) => sum + (a.overall_match_percentage || 0), 0) / latestAssessments.length 
    : 0;
  
  // Count skill gaps from most recent assessment per employee only
  const totalSkillGaps = latestAssessments.reduce((sum, a) => {
    if (Array.isArray(a.skill_gaps)) {
      return sum + a.skill_gaps.length;
    }
    return sum;
  }, 0) || 0;

  // Calculate AI Insights metrics from latest assessments
  const highMatchEmployees = latestAssessments.filter(a => a.overall_match_percentage >= 80).length || 0;
  const matchRate = uniqueAssessedEmployees > 0 ? Math.round((highMatchEmployees / uniqueAssessedEmployees) * 100) : 0;
  
  // Calculate efficiency gain based on role fit scores from latest assessments
  const avgLevelFit = latestAssessments.length > 0 
    ? latestAssessments.reduce((sum, a) => sum + (a.level_fit_score || 0), 0) / latestAssessments.length 
    : 0;
  const efficiencyGain = Math.round(Math.max(0, avgLevelFit - 70)); // Baseline of 70%

  // Mock data for programs (could be enhanced with real data later)
  const activePrograms = Math.min(totalSkillGaps * 2, 50); // Assume 2 programs per skill gap, max 50
  const completionRate = Math.min(85, 60 + Math.round(avgSkillLevel / 3)); // Higher skill levels = better completion

  return {
    totalEmployees,
    assessedEmployees: uniqueAssessedEmployees,
    totalSkills,
    skillGaps: totalSkillGaps,
    avgSkillLevel: Math.round(avgSkillLevel * 10) / 10,
    topSkills: [],
    criticalGaps: [],
    recentAssessments,
    aiInsights: {
      matchRate,
      efficiencyGain,
      activePrograms,
      completionRate,
      skillPredictions: [
        { skill: 'AI/ML Skills', trend: 45 },
        { skill: 'Cybersecurity', trend: 32 },
        { skill: 'Cloud Computing', trend: 28 },
        { skill: 'Data Analysis', trend: 25 }
      ],
      topTalentMatches: highMatchEmployees
    }
  };
};

export const useSkillsDashboardAnalytics = (): SkillsDashboardAnalytics => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['skills-dashboard-analytics'],
    queryFn: fetchSkillsDashboardAnalytics,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  if (error) {
    console.error('Error fetching skills dashboard analytics:', error);
  }

  // Return data with fallback values to maintain UI consistency
  return {
    totalEmployees: data?.totalEmployees || 0,
    assessedEmployees: data?.assessedEmployees || 0,
    totalSkills: data?.totalSkills || 0,
    skillGaps: data?.skillGaps || 0,
    avgSkillLevel: data?.avgSkillLevel || 0,
    topSkills: data?.topSkills || [],
    criticalGaps: data?.criticalGaps || [],
    recentAssessments: data?.recentAssessments || [],
    aiInsights: data?.aiInsights || {
      matchRate: 0,
      efficiencyGain: 0,
      activePrograms: 0,
      completionRate: 0,
      skillPredictions: [],
      topTalentMatches: 0
    },
    loading: isLoading
  };
}; 