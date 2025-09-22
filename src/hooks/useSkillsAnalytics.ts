import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SkillsAnalytics {
  totalSkills: number;
  employeesWithSkills: number;
  skillCategories: number;
  coverageRate: number;
  loading: boolean;
}

const fetchSkillsAnalytics = async (): Promise<Omit<SkillsAnalytics, 'loading'>> => {
  // Optimize: Use parallel queries and only fetch what we need
  const [
    skillsCountResult,
    skillsCategoriesResult,
    employeeSkillsResult,
    totalEmployeesResult
  ] = await Promise.all([
    // Get total skills count only
    supabase
      .from('skills_master')
      .select('*', { count: 'exact', head: true }),
    
    // Get distinct categories only
    supabase
      .from('skills_master')
      .select('category')
      .not('category', 'is', null),
    
    // Get unique employee IDs with skills
    supabase
      .from('employee_skills')
      .select('employee_id'),
    
    // Get total employees count
    supabase
      .from('xlsmart_employees')
      .select('*', { count: 'exact', head: true })
  ]);

  // Handle errors
  if (skillsCountResult.error) throw skillsCountResult.error;
  if (skillsCategoriesResult.error) throw skillsCategoriesResult.error;
  if (employeeSkillsResult.error) throw employeeSkillsResult.error;
  if (totalEmployeesResult.error) throw totalEmployeesResult.error;

  // Process results
  const totalSkills = skillsCountResult.count || 0;
  const uniqueCategories = new Set(skillsCategoriesResult.data?.map(skill => skill.category)).size;
  const employeesWithSkills = new Set(employeeSkillsResult.data?.map(es => es.employee_id)).size;
  const totalEmployees = totalEmployeesResult.count || 0;

  // Calculate coverage rate
  const coverageRate = totalEmployees && employeesWithSkills
    ? Math.round((employeesWithSkills / totalEmployees) * 100)
    : 0;

  return {
    totalSkills,
    employeesWithSkills,
    skillCategories: uniqueCategories,
    coverageRate,
  };
};

export const useSkillsAnalytics = (): SkillsAnalytics => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['skills-analytics'],
    queryFn: fetchSkillsAnalytics,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  if (error) {
    console.error('Error fetching skills analytics:', error);
  }

  return {
    totalSkills: data?.totalSkills || 0,
    employeesWithSkills: data?.employeesWithSkills || 0,
    skillCategories: data?.skillCategories || 0,
    coverageRate: data?.coverageRate || 0,
    loading: isLoading
  };
};