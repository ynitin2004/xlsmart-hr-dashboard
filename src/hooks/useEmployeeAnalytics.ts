import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface EmployeeAnalytics {
  totalEmployees: number;
  activeEmployees: number;
  roleAssignmentRate: number;
  dataCompleteness: number;
  skillsAssessmentRate: number;
  avgPerformanceRating: number;
  loading: boolean;
}

const fetchEmployeeAnalytics = async (): Promise<Omit<EmployeeAnalytics, 'loading'>> => {
  // Optimize: Use parallel queries and select only needed fields
  const [employeesResult, assessmentResult] = await Promise.all([
    supabase
      .from('xlsmart_employees')
      .select('id, first_name, last_name, email, current_position, current_department, is_active, standard_role_id, ai_suggested_role_id, performance_rating', { count: 'exact' }),
    supabase
      .from('xlsmart_skill_assessments')
      .select('employee_id')
  ]);

  if (employeesResult.error) throw employeesResult.error;
  if (assessmentResult.error) throw assessmentResult.error;

  const employees = employeesResult.data || [];
  const totalEmployees = employeesResult.count || 0;
  
  const activeEmployees = employees.filter(emp => emp.is_active).length;

  // Calculate role assignment rate
  const assignedRoles = employees.filter(emp => emp.standard_role_id || emp.ai_suggested_role_id).length;
  const roleAssignmentRate = totalEmployees ? Math.round((assignedRoles / totalEmployees) * 100) : 0;

  // Calculate data completeness - more flexible requirements
  const completeProfiles = employees.filter(emp => 
    emp.first_name && emp.last_name && emp.email && emp.current_position &&
    (emp.current_department || emp.current_position) // Allow department to be empty if position is filled
  ).length;
  const dataCompleteness = totalEmployees ? Math.round((completeProfiles / totalEmployees) * 100) : 0;

  // Count unique employees who have assessments
  const uniqueAssessedEmployees = new Set(assessmentResult.data?.map(a => a.employee_id)).size;
  const skillsAssessmentRate = totalEmployees ? Math.round((uniqueAssessedEmployees / totalEmployees) * 100) : 0;

  // Calculate average performance rating
  const validRatings = employees.map(emp => emp.performance_rating).filter(rating => rating && !isNaN(rating));
  const avgRating = validRatings.length > 0 
    ? validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length 
    : 0;

  return {
    totalEmployees,
    activeEmployees,
    roleAssignmentRate,
    dataCompleteness,
    skillsAssessmentRate,
    avgPerformanceRating: Math.round(avgRating * 10) / 10,
  };
};

export const useEmployeeAnalytics = (): EmployeeAnalytics => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['employee-analytics'],
    queryFn: fetchEmployeeAnalytics,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  if (error) {
    console.error('Error fetching employee analytics:', error);
  }

  return {
    totalEmployees: data?.totalEmployees || 0,
    activeEmployees: data?.activeEmployees || 0,
    roleAssignmentRate: data?.roleAssignmentRate || 0,
    dataCompleteness: data?.dataCompleteness || 0,
    skillsAssessmentRate: data?.skillsAssessmentRate || 0,
    avgPerformanceRating: data?.avgPerformanceRating || 0,
    loading: isLoading
  };
};