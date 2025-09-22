import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Search, User, MapPin, Mail, Phone, Grid3X3, List, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EditEmployeeDialog } from "@/components/EditEmployeeDialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { RoleMappingPagination } from "@/components/RoleMappingPagination";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  current_position: string;
  current_department?: string;
  current_location?: string;
  email?: string;
  phone?: string;
  hire_date?: string;
  employee_number?: string;
}

const EMPLOYEES_PER_PAGE = 20;

const fetchEmployees = async (page: number, searchTerm: string): Promise<{ employees: Employee[], totalCount: number }> => {
  const from = (page - 1) * EMPLOYEES_PER_PAGE;
  const to = from + EMPLOYEES_PER_PAGE - 1;

  let query = supabase
    .from('xlsmart_employees')
    .select('id, first_name, last_name, current_position, current_department, current_location, email, phone, hire_date, employee_number', { count: 'exact' })
    .order('first_name')
    .range(from, to);

  // Apply search filter if provided
  if (searchTerm.trim()) {
    query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,current_position.ilike.%${searchTerm}%,current_department.ilike.%${searchTerm}%`);
  }

  const { data, error, count } = await query;
  
  if (error) throw error;
  
  return {
    employees: data || [],
    totalCount: count || 0
  };
};

export const EmployeeListDetails = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [deleteEmployee, setDeleteEmployee] = useState<Employee | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debounced search term for better performance
  const debouncedSearchTerm = useMemo(() => searchTerm, [searchTerm]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['employees', currentPage, debouncedSearchTerm],
    queryFn: () => fetchEmployees(currentPage, debouncedSearchTerm),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    keepPreviousData: true, // Keep previous data while loading new page
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const { error } = await supabase
        .from('xlsmart_employees')
        .delete()
        .eq('id', employeeId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Employee deleted successfully",
      });
      
      // Invalidate and refetch employees
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['ai-stats'] });
      
      setDeleteEmployee(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete employee",
        variant: "destructive",
      });
    }
  });

  const handleDelete = () => {
    if (!deleteEmployee) return;
    deleteEmployeeMutation.mutate(deleteEmployee.id);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const employees = data?.employees || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / EMPLOYEES_PER_PAGE);

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            Error loading employees: {error.message}
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
            <Users className="h-5 w-5" />
            <span>Employee Directory</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton className="h-10 w-64" />
              <div className="flex space-x-2">
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Employee Directory</span>
              <Badge variant="secondary">{totalCount.toLocaleString()} employees</Badge>
            </div>
            <div className="flex items-center space-x-2">
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
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees by name, position, or department..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="text-center text-muted-foreground">
                Loading employees...
              </div>
            )}

            {/* Employee List */}
            {!isLoading && employees.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                {searchTerm ? 'No employees found matching your search.' : 'No employees found.'}
              </div>
            )}

            {/* Card View */}
            {viewMode === 'card' && employees.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {employees.map((employee) => (
                  <Card key={employee.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm">
                              {employee.first_name} {employee.last_name}
                            </h3>
                            <p className="text-xs text-muted-foreground">{employee.current_position}</p>
                            {employee.current_department && (
                              <p className="text-xs text-muted-foreground flex items-center mt-1">
                                <MapPin className="h-3 w-3 mr-1" />
                                {employee.current_department}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditEmployee(employee)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteEmployee(employee)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mt-3 space-y-1">
                        {employee.email && (
                          <p className="text-xs text-muted-foreground flex items-center">
                            <Mail className="h-3 w-3 mr-2" />
                            {employee.email}
                          </p>
                        )}
                        {employee.phone && (
                          <p className="text-xs text-muted-foreground flex items-center">
                            <Phone className="h-3 w-3 mr-2" />
                            {employee.phone}
                          </p>
                        )}
                        {employee.employee_number && (
                          <p className="text-xs text-muted-foreground">
                            ID: {employee.employee_number}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && employees.length > 0 && (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">
                          {employee.first_name} {employee.last_name}
                        </TableCell>
                        <TableCell>{employee.current_position}</TableCell>
                        <TableCell>{employee.current_department || '-'}</TableCell>
                        <TableCell>{employee.email || '-'}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditEmployee(employee)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteEmployee(employee)}
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
              <RoleMappingPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                pageSize={EMPLOYEES_PER_PAGE}
                totalCount={totalCount}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editEmployee && (
        <EditEmployeeDialog
          employee={editEmployee}
          open={!!editEmployee}
          onOpenChange={(open) => {
            if (!open) {
              setEditEmployee(null);
            }
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            queryClient.invalidateQueries({ queryKey: ['employee-analytics'] });
            setEditEmployee(null);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteEmployee && (
        <ConfirmDeleteDialog
          open={!!deleteEmployee}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteEmployee(null);
            }
          }}
          onConfirm={handleDelete}
          title="Delete Employee"
          description={`Are you sure you want to delete ${deleteEmployee.first_name} ${deleteEmployee.last_name}? This action cannot be undone.`}
          isLoading={deleteEmployeeMutation.isPending}
        />
      )}
    </div>
  );
};