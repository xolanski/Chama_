import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  member_number: string | null;
  join_date: string;
}

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Please enter a valid phone number").optional().or(z.literal("")),
  member_number: z.string().min(3, "Member number must be at least 3 characters"),
});

type MemberFormValues = z.infer<typeof formSchema>;

const Members = () => {
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      full_name: "",
      phone: "",
      member_number: "",
    },
  });

  const generateMemberNumber = () => {
    return `MEM${Math.floor(1000 + Math.random() * 9000)}`;
  };

  const resetForm = () => {
    form.reset({
      email: "",
      full_name: "",
      phone: "",
      member_number: generateMemberNumber(),
    });
  };

  const onSubmit = async (data: MemberFormValues) => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      
      // First check if user already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', data.email)
        .single();

      if (existingUser) {
        throw new Error('A member with this email already exists');
      }

      // Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: Math.random().toString(36).slice(-8), // Generate a random password
        options: {
          data: {
            full_name: data.full_name,
            phone: data.phone || null,
            member_number: data.member_number,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Failed to create user account');

      // Add user to profiles table
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: authData.user.id,
        email: data.email,
        full_name: data.full_name,
        phone: data.phone || null,
        member_number: data.member_number,
        join_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (profileError) throw profileError;

      toast({
        title: 'Success!',
        description: `${data.full_name} has been added as a member. An invitation email has been sent to ${data.email}.`,
      });

      // Refresh members list and reset form
      await fetchMembers();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error adding member:", error);
      toast({
        title: "Error adding member",
        description: error instanceof Error ? error.message : "An error occurred while adding the member.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    // Set initial member number when component mounts
    form.setValue('member_number', generateMemberNumber());
  }, []);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("join_date", { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter((member) =>
    member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.member_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Members</h1>
            <p className="text-muted-foreground mt-1">Manage SACCO members</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (!open) {
              // Only reset form when closing the dialog
              resetForm();
            }
            setIsDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Member</DialogTitle>
                <DialogDescription>
                  Add a new member to the SACCO. An invitation email will be sent to their email address.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="member@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+254 7XX XXX XXX" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="member_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Member Number *</FormLabel>
                        <div className="flex space-x-2">
                          <FormControl>
                            <Input placeholder="MEM1234" {...field} />
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => form.setValue('member_number', generateMemberNumber())}
                          >
                            Generate
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        'Add Member'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Members</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
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
                    <TableHead>Member Number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No members found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          {member.member_number || "N/A"}
                        </TableCell>
                        <TableCell>{member.full_name}</TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>{member.phone || "N/A"}</TableCell>
                        <TableCell>
                          {new Date(member.join_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-success/10 text-success border-success">
                            Active
                          </Badge>
                        </TableCell>
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

export default Members;
