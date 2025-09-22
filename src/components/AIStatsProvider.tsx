import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AIStats {
  employees: string;
  roles: string; 
  accuracy: string;
  skills: string;
  loading: boolean;
}

const fetchAIStats = async (): Promise<Omit<AIStats, 'loading'>> => {
  // Optimize: Use parallel queries and only fetch counts
  const [
    employeesResult,
    rolesResult, 
    mappingsResult,
    skillsResult
  ] = await Promise.all([
    supabase.from('xlsmart_employees').select('*', { count: 'exact', head: true }),
    supabase.from('xlsmart_standard_roles').select('*', { count: 'exact', head: true }),
    supabase.from('xlsmart_role_mappings').select('mapping_confidence'),
    supabase.from('skills_master').select('*', { count: 'exact', head: true })
  ]);

  const employeeCount = employeesResult.count || 0;
  const roleCount = rolesResult.count || 0;
  const skillCount = skillsResult.count || 0;
  
  // Calculate average accuracy from mappings
  const mappings = mappingsResult.data || [];
  const averageAccuracy = mappings.length > 0 
    ? Math.round(mappings.reduce((sum: number, m: any) => sum + (m.mapping_confidence || 0), 0) / mappings.length)
    : 0;

  return {
    employees: employeeCount.toLocaleString(),
    roles: roleCount.toString(),
    accuracy: `${averageAccuracy}%`,
    skills: skillCount.toString(),
  };
};

export const useAIStats = (): AIStats => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['ai-stats'],
    queryFn: fetchAIStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  if (error) {
    console.error('Error fetching AI stats:', error);
  }

  return {
    employees: data?.employees || "0",
    roles: data?.roles || "0",
    accuracy: data?.accuracy || "0%",
    skills: data?.skills || "0",
    loading: isLoading
  };
};