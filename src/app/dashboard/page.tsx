'use client'
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Navbar from '../inventory/components/navbar';
import Sidebar from '../inventory/components/sidebar';
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  CubeIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const DashboardPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  interface SystemLog {
    action: string;
    details: string;
    created_by?: string;
    created_at: string;
  }

  const [dashboardData, setDashboardData] = useState<{
    totalIncome: number;
    totalExpenses: number;
    profit: number;
    inventoryCount: number;
    pendingOrders: number;
    systemLogs: SystemLog[];
  }>({
    totalIncome: 0,
    totalExpenses: 0,
    profit: 0,
    inventoryCount: 0,
    pendingOrders: 0,
    systemLogs: []
  });

  // Check authentication and authorization
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (!session || error) {
        router.push('/login');
        return;
      }

      // Fetch user profile to check role and usertype
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('role, usertype')
        .eq('id', session.user.id)
        .single();

      if (profileError || !profile || profile.role != 1 || profile.usertype != 'inventory') {
        router.push('/unauthorized');
        return;
      }

      setAuthorized(true);
      fetchDashboardData();
    };

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch total income (sum of completed orders)
        const { data: incomeData } = await supabase
          .from('orders')
          .select('total_amount')
          .eq('status', 'Completed');
        
        const totalIncome = incomeData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

        // Fetch total expenses
        const { data: expenseData } = await supabase
          .from('expenses')
          .select('amount');
        
        const totalExpenses = expenseData?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0;

        // Calculate profit
        const profit = totalIncome - totalExpenses;

        // Fetch inventory count
        const { count: inventoryCount } = await supabase
          .from('stock_items')
          .select('*', { count: 'exact', head: true });

        // Fetch pending orders count
        const { count: pendingOrders } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Pending');

        // Fetch system logs
        const { data: systemLogs } = await supabase
          .from('system_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        setDashboardData({
          totalIncome,
          totalExpenses,
          profit,
          inventoryCount: inventoryCount || 0,
          pendingOrders: pendingOrders || 0,
          systemLogs: systemLogs || []
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount).replace('UGX', 'UGX ');
  };

  // Overview cards data
  const overviewData = [
    { 
      title: 'Total Revenue', 
      value: formatCurrency(dashboardData.totalIncome), 
      icon: CurrencyDollarIcon, 
      color: 'bg-blue-500' 
    },
    { 
      title: 'Expenses', 
      value: formatCurrency(dashboardData.totalExpenses), 
      icon: ChartBarIcon, 
      color: 'bg-green-500' 
    },
    { 
      title: 'Profit', 
      value: formatCurrency(dashboardData.profit), 
      icon: ArrowTrendingUpIcon, 
      color: dashboardData.profit >= 0 ? 'bg-purple-500' : 'bg-red-500'
    },
    { 
      title: 'Inventory Levels', 
      value: `${dashboardData.inventoryCount} Items`, 
      icon: CubeIcon, 
      color: 'bg-yellow-500' 
    },
    { 
      title: 'Pending Orders', 
      value: dashboardData.pendingOrders, 
      icon: ClockIcon, 
      color: 'bg-red-500' 
    },
  ];

  if (loading) {
    return (
      <div className="flex-1 ml-16 p-6 flex items-center justify-center">
        <div className="animate-pulse flex space-x-2 items-center mt-50">
          <div className="h-2 w-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="h-2 w-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="h-2 w-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          <span className="ml-2 text-green-500 font-large">Loading...</span>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-500">Unauthorized Access</div>
      </div>
    );
  }

  return (
    <div className="flex mt-5">
      <Sidebar />
      <div className="flex-1 ml-16 p-6">
        <Navbar />
        <div className="text-center mt-5">
          <h1 className="text-3xl font-bold mb-6">Mepani Technical Service</h1>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {overviewData.map((item, index) => (
            <div
              key={index}
              className={`${item.color} p-6 rounded-lg shadow-md text-white flex flex-col items-center justify-center`}
            >
              <item.icon className="h-8 w-8 mb-2" />
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="text-2xl font-bold">{item.value}</p>
            </div>
          ))}
        </div>

        {/* System Logs Table */}
        <div className="bg-white rounded-lg shadow-md p-6 text-black">
          <h2 className="text-xl font-semibold mb-4">Recent actions</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-3 px-4 text-left">Action</th>
                  <th className="py-3 px-4 text-left">Details</th>
                  <th className="py-3 px-4 text-left">Created By</th>
                  <th className="py-3 px-4 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.systemLogs.map((log, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-3 px-4 capitalize">{log.action}</td>
                    <td className="py-3 px-4">{log.details}</td>
                    <td className="py-3 px-4">{log.created_by || 'System'}</td>
                    <td className="py-3 px-4">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {dashboardData.systemLogs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-3 px-4 text-center text-gray-500">
                      No system logs found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;