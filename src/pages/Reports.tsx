import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, TrendingUp, DollarSign } from "lucide-react";

interface ReportData {
  totalMembers: number;
  totalSavings: number;
  totalLoans: number;
  totalOutstanding: number;
  monthlyDeposits: number;
  monthlyWithdrawals: number;
  loansDisbursed: number;
  loansRepaid: number;
}

const Reports = () => {
  const [data, setData] = useState<ReportData>({
    totalMembers: 0,
    totalSavings: 0,
    totalLoans: 0,
    totalOutstanding: 0,
    monthlyDeposits: 0,
    monthlyWithdrawals: 0,
    loansDisbursed: 0,
    loansRepaid: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      // Fetch members count
      const { count: membersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Fetch savings data
      const { data: savingsData } = await supabase
        .from("savings_accounts")
        .select("balance");

      const totalSavings = savingsData?.reduce((acc, account) => 
        acc + Number(account.balance || 0), 0) || 0;

      // Fetch loans data
      const { data: loansData } = await supabase
        .from("loans")
        .select("principal_amount, outstanding_balance");

      const totalLoans = loansData?.reduce((acc, loan) => 
        acc + Number(loan.principal_amount || 0), 0) || 0;

      const totalOutstanding = loansData?.reduce((acc, loan) => 
        acc + Number(loan.outstanding_balance || 0), 0) || 0;

      // Fetch current month transactions
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: transactionsData } = await supabase
        .from("transactions")
        .select("transaction_type, amount")
        .gte("transaction_date", startOfMonth.toISOString());

      const monthlyDeposits = transactionsData
        ?.filter(t => t.transaction_type === 'deposit')
        .reduce((acc, t) => acc + Number(t.amount || 0), 0) || 0;

      const monthlyWithdrawals = transactionsData
        ?.filter(t => t.transaction_type === 'withdrawal')
        .reduce((acc, t) => acc + Number(t.amount || 0), 0) || 0;

      const loansDisbursed = transactionsData
        ?.filter(t => t.transaction_type === 'loan_disbursement')
        .reduce((acc, t) => acc + Number(t.amount || 0), 0) || 0;

      const loansRepaid = transactionsData
        ?.filter(t => t.transaction_type === 'loan_repayment')
        .reduce((acc, t) => acc + Number(t.amount || 0), 0) || 0;

      setData({
        totalMembers: membersCount || 0,
        totalSavings,
        totalLoans,
        totalOutstanding,
        monthlyDeposits,
        monthlyWithdrawals,
        loansDisbursed,
        loansRepaid,
      });
    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setLoading(false);
    }
  };

  const reports = [
    {
      title: "Financial Summary",
      description: "Complete overview of all financial activities",
      icon: DollarSign,
      color: "text-primary",
    },
    {
      title: "Member Report",
      description: "Detailed member information and statistics",
      icon: FileText,
      color: "text-secondary",
    },
    {
      title: "Savings Report",
      description: "All savings accounts and transaction history",
      icon: TrendingUp,
      color: "text-accent",
    },
    {
      title: "Loans Report",
      description: "Loans disbursed, repayments, and outstanding",
      icon: FileText,
      color: "text-warning",
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">Financial reports and accounting summaries</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Members
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.totalMembers}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Savings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">KSh {data.totalSavings.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Loans Disbursed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">KSh {data.totalLoans.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Outstanding Balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">KSh {data.totalOutstanding.toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Deposits</p>
                    <p className="text-xl font-bold text-success">
                      KSh {data.monthlyDeposits.toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Withdrawals</p>
                    <p className="text-xl font-bold text-destructive">
                      KSh {data.monthlyWithdrawals.toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Loans Issued</p>
                    <p className="text-xl font-bold text-primary">
                      KSh {data.loansDisbursed.toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Loan Repayments</p>
                    <p className="text-xl font-bold text-secondary">
                      KSh {data.loansRepaid.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              {reports.map((report, index) => {
                const Icon = report.icon;
                return (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-${report.color.split('-')[1]}/10`}>
                            <Icon className={`w-6 h-6 ${report.color}`} />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{report.title}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {report.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" className="w-full">
                        <Download className="w-4 h-4 mr-2" />
                        Export Report
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Reports;
