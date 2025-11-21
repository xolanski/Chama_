-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'member');

-- Create enum for loan status
CREATE TYPE public.loan_status AS ENUM ('pending', 'approved', 'active', 'completed', 'defaulted');

-- Create enum for transaction types
CREATE TYPE public.transaction_type AS ENUM ('deposit', 'withdrawal', 'loan_disbursement', 'loan_repayment', 'interest', 'fees');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  national_id TEXT UNIQUE,
  date_of_birth DATE,
  address TEXT,
  member_number TEXT UNIQUE,
  join_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create savings accounts table
CREATE TABLE public.savings_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  account_number TEXT UNIQUE NOT NULL,
  balance DECIMAL(15,2) DEFAULT 0 NOT NULL CHECK (balance >= 0),
  interest_rate DECIMAL(5,2) DEFAULT 5.0,
  opened_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dormant', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES public.savings_accounts(id) ON DELETE CASCADE NOT NULL,
  transaction_type transaction_type NOT NULL,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  balance_after DECIMAL(15,2) NOT NULL,
  description TEXT,
  reference_number TEXT UNIQUE,
  processed_by UUID REFERENCES public.profiles(id),
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create loans table
CREATE TABLE public.loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  loan_number TEXT UNIQUE NOT NULL,
  principal_amount DECIMAL(15,2) NOT NULL CHECK (principal_amount > 0),
  interest_rate DECIMAL(5,2) NOT NULL CHECK (interest_rate >= 0),
  duration_months INTEGER NOT NULL CHECK (duration_months > 0),
  monthly_payment DECIMAL(15,2) NOT NULL,
  outstanding_balance DECIMAL(15,2) NOT NULL,
  status loan_status DEFAULT 'pending',
  application_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  approval_date TIMESTAMP WITH TIME ZONE,
  disbursement_date TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES public.profiles(id),
  purpose TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create loan repayments table
CREATE TABLE public.loan_repayments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_id UUID REFERENCES public.loans(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  principal_paid DECIMAL(15,2) NOT NULL,
  interest_paid DECIMAL(15,2) NOT NULL,
  balance_after DECIMAL(15,2) NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_by UUID REFERENCES public.profiles(id),
  reference_number TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_repayments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins and staff can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'staff')
  );

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for savings_accounts
CREATE POLICY "Members can view their own accounts"
  ON public.savings_accounts FOR SELECT
  USING (auth.uid() = member_id);

CREATE POLICY "Admins and staff can view all accounts"
  ON public.savings_accounts FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'staff')
  );

CREATE POLICY "Admins and staff can manage accounts"
  ON public.savings_accounts FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'staff')
  );

-- RLS Policies for transactions
CREATE POLICY "Members can view their own transactions"
  ON public.transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.savings_accounts
      WHERE savings_accounts.id = transactions.account_id
      AND savings_accounts.member_id = auth.uid()
    )
  );

CREATE POLICY "Admins and staff can view all transactions"
  ON public.transactions FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'staff')
  );

CREATE POLICY "Admins and staff can insert transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'staff')
  );

-- RLS Policies for loans
CREATE POLICY "Members can view their own loans"
  ON public.loans FOR SELECT
  USING (auth.uid() = member_id);

CREATE POLICY "Admins and staff can view all loans"
  ON public.loans FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'staff')
  );

CREATE POLICY "Members can apply for loans"
  ON public.loans FOR INSERT
  WITH CHECK (auth.uid() = member_id);

CREATE POLICY "Admins and staff can manage loans"
  ON public.loans FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'staff')
  );

-- RLS Policies for loan_repayments
CREATE POLICY "Members can view their own repayments"
  ON public.loan_repayments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.loans
      WHERE loans.id = loan_repayments.loan_id
      AND loans.member_id = auth.uid()
    )
  );

CREATE POLICY "Admins and staff can view all repayments"
  ON public.loan_repayments FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'staff')
  );

CREATE POLICY "Admins and staff can insert repayments"
  ON public.loan_repayments FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'staff')
  );

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_savings_accounts_updated_at
  BEFORE UPDATE ON public.savings_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loans_updated_at
  BEFORE UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, member_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New Member'),
    NEW.email,
    'MEM' || TO_CHAR(now(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')
  );
  
  -- Assign member role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_savings_accounts_member_id ON public.savings_accounts(member_id);
CREATE INDEX idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX idx_transactions_date ON public.transactions(transaction_date DESC);
CREATE INDEX idx_loans_member_id ON public.loans(member_id);
CREATE INDEX idx_loans_status ON public.loans(status);
CREATE INDEX idx_loan_repayments_loan_id ON public.loan_repayments(loan_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);