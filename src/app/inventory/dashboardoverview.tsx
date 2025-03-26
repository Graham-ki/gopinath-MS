import React from 'react';
import Navbar from './components/navbar';
import Sidebar from './components/sidebar';
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  CubeIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'; // Import icons for cards

const DashboardPage = () => {
  // Dummy data for overview cards
  const overviewData = [
    { title: 'Total Revenue', value: 'UGX 12,345,000', icon: CurrencyDollarIcon, color: 'bg-blue-500' },
    { title: 'Expenses', value: 'UGX 8,765,000,000', icon: ChartBarIcon, color: 'bg-green-500' },
    { title: 'Profit', value: 'UGX 3,580,000', icon: ArrowTrendingUpIcon, color: 'bg-purple-500' },
    { title: 'Inventory Levels', value: '1,234 Items', icon: CubeIcon, color: 'bg-yellow-500' },
    { title: 'Pending Orders', value: '56', icon: ClockIcon, color: 'bg-red-500' },
  ];

  // Dummy data for system logs/transactions
  const systemLogs = [
    { transaction: 'Order #123', date: '2023-10-01', createdBy: 'Admin', action: 'Delete' },
    { transaction: 'Order #124', date: '2023-10-02', createdBy: 'Manager', action: 'Delete' },
    { transaction: 'Order #125', date: '2023-10-03', createdBy: 'Admin', action: 'Delete' },
    { transaction: 'Order #126', date: '2023-10-04', createdBy: 'Staff', action: 'Delete' },
  ];

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

        {/* System Logs/Transactions Table */}
        <div className="bg-white rounded-lg shadow-md p-6 text-black">
          <h2 className="text-xl font-semibold mb-4">System Logs / Transactions</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-3 px-4 text-left">Transaction</th>
                  <th className="py-3 px-4 text-left">Date</th>
                  <th className="py-3 px-4 text-left">Created By</th>
                  <th className="py-3 px-4 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {systemLogs.map((log, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-3 px-4">{log.transaction}</td>
                    <td className="py-3 px-4">{log.date}</td>
                    <td className="py-3 px-4">{log.createdBy}</td>
                    <td className="py-3 px-4">
                      <button className="text-red-500 hover:text-red-700">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;