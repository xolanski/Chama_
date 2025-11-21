import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Search, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Loan {
  id: string;
  loan_number: string;
  principal_amount: number;
  outstanding_balance: number;
  interest_rate: number;
  duration_months: number;
  monthly_payment: number;
  status: string;
  application_date: string;
  profiles: {
    full_name: string;
    member_number: string;
  };
}

const Loans = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      const { data, error } = await supabase
        .from("loans")
        .select(`
          *,
          profiles!loans_member_id_fkey (
            full_name,
            member_number
          )
        `)
        .order("application_date", { ascending: false });

      if (error) throw error;
      setLoans(data || []);
    } catch (error) {
      console.error("Error fetching loans:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLoans = loans.filter((loan) =>
    loan.loan_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loan.profiles?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loan.profiles?.member_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeLoans = loans.filter(l => l.status === 'active' || l.status === 'approved');
  const totalOutstanding = activeLoans.reduce((sum, loan) => sum + Number(loan.outstanding_balance || 0), 0);
  const totalDisbursed = loans.reduce((sum, loan) => sum + Number(loan.principal_amount || 0), 0);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { className: string; label: string }> = {
      pending: { className: "bg-warning/10 text-warning border-warning", label: "Pending" },
      approved: { className: "bg-primary/10 text-primary border-primary", label: "Approved" },
      active: { className: "bg-success/10 text-success border-success", label: "Active" },
      completed: { className: "bg-muted text-muted-foreground", label: "Completed" },
      defaulted: { className: "bg-destructive/10 text-destructive border-destructive", label: "Defaulted" },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Loans</h1>
            <p className="text-muted-foreground mt-1">Manage credit and loans</p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Loan Application
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Loans
              </CardTitle>
              <CheckCircle className="w-5 h-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeLoans.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Outstanding Amount
              </CardTitle>
              <AlertCircle className="w-5 h-5 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KSh {totalOutstanding.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Disbursed
              </CardTitle>
              <TrendingUp className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KSh {totalDisbursed.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Loans</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search loans..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loan Number</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Monthly Payment</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLoans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No loans found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLoans.map((loan) => (
                      <TableRow key={loan.id}>
                        <TableCell className="font-medium">
                          {loan.loan_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div>{loan.profiles?.full_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {loan.profiles?.member_number}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          KSh {Number(loan.principal_amount).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          KSh {Number(loan.outstanding_balance).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          KSh {Number(loan.monthly_payment).toLocaleString()}
                        </TableCell>
                        <TableCell>{loan.duration_months} months</TableCell>
                        <TableCell>{getStatusBadge(loan.status)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Loans;
