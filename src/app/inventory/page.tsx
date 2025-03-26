import React from 'react';
import DashboardOverview from './dashboardoverview';

const Dashboard = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Admin Dashboard</h1>
      <DashboardOverview />
    </div>
  );
};

export default Dashboard;
