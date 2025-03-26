import React from 'react';
import Navbar from './components/navbar';
import Sidebar from './components/sidebar';

const AccountingPage = () => {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-64 p-6">
        <Navbar />
        <h1 className="text-3xl font-bold mb-6">Accounting</h1>
        <p>Manage financials here.</p>
      </div>
    </div>
  );
};

export default AccountingPage;
