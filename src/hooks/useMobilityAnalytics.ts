import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface MobilityAnalytics {
  mobilityRate: number;
  retentionRate: number;
  activePlans: number;
  atRiskEmployees: number;
  totalEmployees: number;
  loading: boolean;
}

const fetchMobilityAnalytics = async (): Promise<Omit<MobilityAnalytics, 'loading'>> => {
  // Optimize: Use parallel queries with only necessary data
  const [
    employeesCountResult,
    activeEmployeesResult,
    mobilityPlansResult,
    actualMovesResult
  ] = await Promise.all([
    // Get total employees count only
    supabase
      .from('xlsmart_employees')
      .select('*', { count: 'exact', head: true }),
    
    // Get active employees with performance data for risk assessment
    supabase
      .from('xlsmart_employees')
      .select('id, is_active, performance_rating, standard_role_id')
      .eq('is_active', true),
    
    // Get mobility plans with only needed fields
    supabase
      .from('ai_analysis_results')
      .select('input_parameters, created_by')
      .eq('analysis_type', 'mobility_plan')
      .eq('status', 'completed'),
    
    // Get actual moves from last year for mobility rate calculation (with fallback)
    supabase
      .from('employee_moves')
      .select('employee_id, created_at')
      .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
      .limit(1000) // Add limit to prevent large queries
  ]);

  // Handle errors with better logging
  if (employeesCountResult.error) {
    console.error('Error fetching employees count:', employeesCountResult.error);
    throw employeesCountResult.error;
  }
  if (activeEmployeesResult.error) {
    console.error('Error fetching active employees:', activeEmployeesResult.error);
    throw activeEmployeesResult.error;
  }
  if (mobilityPlansResult.error) {
    console.error('Error fetching mobility plans:', mobilityPlansResult.error);
    throw mobilityPlansResult.error;
  }
  if (actualMovesResult.error) {
    console.error('Error fetching employee moves:', actualMovesResult.error);
    // Don't throw for employee_moves table - it might not exist
    console.warn('Employee moves table might not exist, continuing without mobility rate calculation');
  }

  // Process results efficiently
  const totalEmployees = employeesCountResult.count || 0;
  const activeEmployees = activeEmployeesResult.data || [];
  const mobilityPlans = mobilityPlansResult.data || [];
  const actualMoves = actualMovesResult.error ? [] : (actualMovesResult.data || []);

  // Calculate retention rate (active employees vs total)
  const retentionRate = totalEmployees > 0 
    ? Math.round((activeEmployees.length / totalEmployees) * 100)
    : 0;

  // Count unique employees with mobility plans (avoid duplicates)
  const uniqueEmployeesWithPlans = new Set();
  mobilityPlans.forEach(plan => {
    const params = plan.input_parameters as any;
    const employeeId = params?.employee_id || 
                      params?.employeeId ||
                      plan.created_by;
    if (employeeId) {
      uniqueEmployeesWithPlans.add(employeeId);
    }
  });

  const activePlans = uniqueEmployeesWithPlans.size;

  // Calculate ACTUAL mobility rate from executed moves (not just plans)
  const uniqueEmployeesWhoMoved = new Set();
  actualMoves.forEach((move: any) => {
    uniqueEmployeesWhoMoved.add(move.employee_id);
  });

  // Cap mobility rate at 100% maximum
  const mobilityRate = totalEmployees > 0 
    ? Math.min(100, Math.round((uniqueEmployeesWhoMoved.size / totalEmployees) * 100))
    : 0;

  // Estimate at-risk employees (those with low performance or without assignments)
  const atRiskEmployees = activeEmployees.filter(emp => 
    (emp.performance_rating && emp.performance_rating < 3) || !emp.standard_role_id
  ).length;

  return {
    mobilityRate,
    retentionRate,
    activePlans,
    atRiskEmployees,
    totalEmployees
  };
};

export const useMobilityAnalytics = (): MobilityAnalytics => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['mobility-analytics'],
    queryFn: fetchMobilityAnalytics,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  if (error) {
    console.error('Error fetching mobility analytics:', error);
  }

  return {
    mobilityRate: data?.mobilityRate || 0,
    retentionRate: data?.retentionRate || 0,
    activePlans: data?.activePlans || 0,
    atRiskEmployees: data?.atRiskEmployees || 0,
    totalEmployees: data?.totalEmployees || 0,
    loading: isLoading
  };
};