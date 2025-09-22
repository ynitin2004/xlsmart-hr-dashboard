import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmployeeMovesHistory } from "@/components/EmployeeMovesHistory";
import { Target, TrendingUp, Users, AlertTriangle, Loader2 } from "lucide-react";
import { useMobilityAnalytics } from "@/hooks/useMobilityAnalytics";
import { useState, Suspense, lazy, Component, ErrorInfo, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

// Lazy load the heavy AI Mobility Planning component for better performance
const EmployeeMobilityPlanningAI = lazy(() => import("@/components/EmployeeMobilityPlanningAI"));

// Loading component for AI Mobility Planning
const AIMobilityPlanningLoader = () => (
  <div className="flex items-center justify-center py-12">
    <div className="flex items-center space-x-3">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <span className="text-muted-foreground">Loading AI Mobility Planning...</span>
    </div>
  </div>
);

// Proper React Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('MobilityDashboard Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

const MobilityDashboard = () => {
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  
  // Add error handling for the analytics hook
  let mobilityAnalytics;
  try {
    mobilityAnalytics = useMobilityAnalytics();
  } catch (error) {
    console.error('Error in useMobilityAnalytics:', error);
    mobilityAnalytics = {
      mobilityRate: 0,
      retentionRate: 0,
      activePlans: 0,
      atRiskEmployees: 0,
      totalEmployees: 0,
      loading: false
    };
  }

  // Use analytics data instead of separate employee fetch
  const highRiskEmployeesCount = mobilityAnalytics.atRiskEmployees;

  const mobilityStats = [
    { 
      value: mobilityAnalytics.loading ? "..." : `${mobilityAnalytics.mobilityRate}%`, 
      label: "Mobility Rate", 
      icon: Target, 
      color: "text-blue-600",
      description: "Annual internal moves"
    },
    { 
      value: mobilityAnalytics.loading ? "..." : `${mobilityAnalytics.retentionRate}%`, 
      label: "Retention Rate", 
      icon: Users, 
      color: "text-green-600",
      description: "Successful transitions"
    },
    { 
      value: mobilityAnalytics.loading ? "..." : mobilityAnalytics.activePlans.toString(), 
      label: "Active Plans", 
      icon: TrendingUp, 
      color: "text-purple-600",
      description: "Current mobility plans"
    },
    { 
      value: mobilityAnalytics.loading ? "..." : mobilityAnalytics.atRiskEmployees.toString(), 
      label: "At-Risk Employees", 
      icon: AlertTriangle, 
      color: "text-orange-600",
      description: "High turnover risk"
    }
  ];

  return (
    <ErrorBoundary fallback={
      <div className="space-y-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-red-800 font-semibold mb-2">Employee Mobility Dashboard Error</h2>
          <p className="text-red-600">There was an error loading the mobility dashboard. Please check the browser console for details.</p>
        </div>
      </div>
    }>
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-foreground">Employee Mobility & Planning</h1>
          <p className="text-muted-foreground text-lg">
            Plan internal mobility, reduce turnover risk, and optimize talent flow
          </p>
        </div>

        {/* Mobility Stats */}
        <section className="bg-muted/50 rounded-xl p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-2">Mobility Analytics</h2>
            <p className="text-muted-foreground">
              Overview of employee mobility and retention metrics
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {mobilityStats.map((stat, index) => (
              <Card key={index} className="hover:shadow-md transition-all duration-200 cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                    </div>
                    <div className={`p-2 rounded-lg bg-muted/50 ${stat.color}`}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Mobility Planning Engine */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-primary" />
                <span>Mobility Planning Engine</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ErrorBoundary fallback={
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <p className="text-yellow-800">AI Mobility Planning component failed to load. Please refresh the page.</p>
                </div>
              }>
                <Suspense fallback={<AIMobilityPlanningLoader />}>
                  <EmployeeMobilityPlanningAI />
                </Suspense>
              </ErrorBoundary>
            </CardContent>
          </Card>
        </section>

        {/* Mobility Insights */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>High-Risk Employees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="font-medium text-red-800">At-Risk Count</p>
                  <p className="text-sm text-red-600">{highRiskEmployeesCount} employees need attention</p>
                </div>
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="font-medium text-orange-800">Performance Issues</p>
                  <p className="text-sm text-orange-600">Low performance ratings detected</p>
                </div>
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="font-medium text-yellow-800">Role Misalignment</p>
                  <p className="text-sm text-yellow-600">Employees without proper role assignments</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mobility Opportunities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="font-medium text-green-800">Cross-Department Transfer</p>
                  <p className="text-sm text-green-600">23 potential matches identified</p>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="font-medium text-blue-800">Skill-Based Rotation</p>
                  <p className="text-sm text-blue-600">18 development opportunities</p>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="font-medium text-purple-800">Leadership Track</p>
                  <p className="text-sm text-purple-600">12 management candidates</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Recent Moves History */}
        <section>
          <ErrorBoundary fallback={
            <Card>
              <CardHeader>
                <CardTitle>Employee Moves History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <p className="text-yellow-800">Employee moves history failed to load. This might be due to database table issues.</p>
                </div>
              </CardContent>
            </Card>
          }>
            <EmployeeMovesHistory />
          </ErrorBoundary>
        </section>
      </div>
    </ErrorBoundary>
  );
};

export default MobilityDashboard;