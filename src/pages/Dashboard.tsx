import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Wallet, CreditCard, TrendingUp } from "lucide-react";

interface Stats {
  totalMembers: number;
  totalSavings: number;
  activeLoans: number;
  totalLoanAmount: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalMembers: 0,
    totalSavings: 0,
    activeLoans: 0,
    totalLoanAmount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch total members
        const { count: membersCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });

        // Fetch total savings
        const { data: savingsData } = await supabase
          .from("savings_accounts")
          .select("balance");

        const totalSavings = savingsData?.reduce((acc, account) => 
          acc + Number(account.balance || 0), 0) || 0;

        // Fetch active loans
        const { count: loansCount, data: loansData } = await supabase
          .from("loans")
          .select("outstanding_balance", { count: "exact" })
          .in("status", ["approved", "active"]);

        const totalLoanAmount = loansData?.reduce((acc, loan) => 
          acc + Number(loan.outstanding_balance || 0), 0) || 0;

        setStats({
          totalMembers: membersCount || 0,
          totalSavings,
          activeLoans: loansCount || 0,
          totalLoanAmount,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Total Members",
      value: stats.totalMembers,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Total Savings",
      value: `KSh ${stats.totalSavings.toLocaleString()}`,
      icon: Wallet,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Active Loans",
      value: stats.activeLoans,
      icon: CreditCard,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Outstanding Amount",
      value: `KSh ${stats.totalLoanAmount.toLocaleString()}`,
      icon: TrendingUp,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your SACCO operations</p>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-4 bg-muted rounded w-24"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded w-32"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Recent transactions and activities will appear here
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-muted-foreground text-sm">
                Common actions and shortcuts will appear here
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
