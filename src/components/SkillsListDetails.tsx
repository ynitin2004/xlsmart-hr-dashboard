import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Search, Star, TrendingUp, Users, Grid3X3, List, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EditSkillDialog } from "@/components/EditSkillDialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

interface Skill {
  id: string;
  name: string;
  category?: string;
  proficiency_level?: string;
  description?: string;
  created_at?: string;
  usage_count?: number;
}

const SKILLS_PER_PAGE = 20;

const fetchSkills = async (page: number, searchTerm: string, category: string): Promise<{ skills: Skill[], totalCount: number, categories: string[] }> => {
  const from = (page - 1) * SKILLS_PER_PAGE;
  const to = from + SKILLS_PER_PAGE - 1;

  // Build query with filters
  let query = supabase
    .from('skills_master')
    .select('*', { count: 'exact' })
    .order('name')
    .range(from, to);

  // Apply search filter if provided
  if (searchTerm.trim()) {
    query = query.or(`name.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
  }

  // Apply category filter if not "all"
  if (category && category !== "all") {
    query = query.eq('category', category);
  }

  const { data, error, count } = await query;
  
  if (error) throw error;

  // Get categories for filter dropdown (separate query for performance)
  const { data: categoriesData } = await supabase
    .from('skills_master')
    .select('category')
    .not('category', 'is', null);

  const categories = [...new Set(categoriesData?.map(skill => skill.category).filter(Boolean))] as string[];
  
  return {
    skills: data || [],
    totalCount: count || 0,
    categories
  };
};

export const SkillsListDetails = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [editSkill, setEditSkill] = useState<Skill | null>(null);
  const [deleteSkill, setDeleteSkill] = useState<Skill | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debounced search term for better performance
  const debouncedSearchTerm = useMemo(() => searchTerm, [searchTerm]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['skills', currentPage, debouncedSearchTerm, selectedCategory],
    queryFn: () => fetchSkills(currentPage, debouncedSearchTerm, selectedCategory),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    keepPreviousData: true, // Keep previous data while loading new page
  });

  const deleteSkillMutation = useMutation({
    mutationFn: async (skillId: string) => {
      const { error } = await supabase
        .from('skills_master')
        .delete()
        .eq('id', skillId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Skill deleted successfully",
      });
      
      // Invalidate and refetch skills
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      queryClient.invalidateQueries({ queryKey: ['skills-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['skills-dashboard-analytics'] });
      
      setDeleteSkill(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete skill",
        variant: "destructive",
      });
    }
  });

  const handleDelete = () => {
    if (!deleteSkill) return;
    deleteSkillMutation.mutate(deleteSkill.id);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const skills = data?.skills || [];
  const categories = data?.categories || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / SKILLS_PER_PAGE);

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            Error loading skills: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Skills Inventory</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton className="h-10 w-64" />
              <div className="flex space-x-2">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-10 w-10" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-32" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Skills Inventory</h2>
          <Badge variant="secondary">
            {skills.length} Total Skills
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'card' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('card')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                placeholder="Search skills by name, category, or description..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedCategory === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => handleCategoryChange("all")}
          >
            All Categories
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => handleCategoryChange(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center text-muted-foreground">
          Loading skills...
        </div>
      )}

      {/* No Results */}
      {!isLoading && skills.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          {searchTerm || selectedCategory !== "all" ? 'No skills found matching your criteria.' : 'No skills found.'}
        </div>
      )}

      {/* Skills Grid or List */}
      {viewMode === 'card' && skills.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((skill) => (
            <Card key={skill.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent/10 rounded-lg">
                      <Star className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">
                        {skill.name}
                      </CardTitle>
                    </div>
                  </div>
                  {skill.usage_count && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{skill.usage_count}</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {skill.category && (
                    <Badge variant="secondary" className="text-xs">
                      {skill.category}
                    </Badge>
                  )}
                  {skill.proficiency_level && (
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        skill.proficiency_level === 'Expert' ? 'border-green-500 text-green-600' :
                        skill.proficiency_level === 'Advanced' ? 'border-blue-500 text-blue-600' :
                        skill.proficiency_level === 'Intermediate' ? 'border-yellow-500 text-yellow-600' :
                        'border-gray-500 text-gray-600'
                      }`}
                    >
                      {skill.proficiency_level}
                    </Badge>
                  )}
                </div>
                
                {skill.description && (
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {skill.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between pt-2 border-t">
                  {skill.created_at && (
                    <div className="text-xs text-muted-foreground">
                      Added: {new Date(skill.created_at).toLocaleDateString()}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditSkill(skill)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteSkill(skill)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {viewMode === 'list' && skills.length > 0 && (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Skill Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Proficiency</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Added</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {skills.map((skill) => (
              <TableRow key={skill.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent/10 rounded-lg">
                      <Star className="h-3 w-3 text-accent" />
                    </div>
                    <div>
                      <div className="font-medium">{skill.name}</div>
                      {skill.description && (
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {skill.description}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {skill.category ? (
                    <Badge variant="secondary" className="text-xs">
                      {skill.category}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {skill.proficiency_level ? (
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        skill.proficiency_level === 'Expert' ? 'border-green-500 text-green-600' :
                        skill.proficiency_level === 'Advanced' ? 'border-blue-500 text-blue-600' :
                        skill.proficiency_level === 'Intermediate' ? 'border-yellow-500 text-yellow-600' :
                        'border-gray-500 text-gray-600'
                      }`}
                    >
                      {skill.proficiency_level}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {skill.usage_count ? (
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{skill.usage_count}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </TableCell>
                <TableCell>
                  {skill.created_at ? (
                    <span className="text-sm">{new Date(skill.created_at).toLocaleDateString()}</span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditSkill(skill)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteSkill(skill)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * SKILLS_PER_PAGE) + 1} to {Math.min(currentPage * SKILLS_PER_PAGE, totalCount)} of {totalCount} skills
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {editSkill && (
        <EditSkillDialog
          skill={editSkill}
          open={!!editSkill}
          onOpenChange={(open) => {
            if (!open) {
              setEditSkill(null);
            }
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['skills'] });
            queryClient.invalidateQueries({ queryKey: ['skills-analytics'] });
            setEditSkill(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deleteSkill && (
        <ConfirmDeleteDialog
          open={!!deleteSkill}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteSkill(null);
            }
          }}
          onConfirm={handleDelete}
          title="Delete Skill"
          description={`Are you sure you want to delete the skill "${deleteSkill.name}"? This action cannot be undone.`}
          isLoading={deleteSkillMutation.isPending}
        />
      )}
    </div>
  );
};