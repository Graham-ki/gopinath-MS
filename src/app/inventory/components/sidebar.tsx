'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import {
  HomeIcon,
  CalculatorIcon,
  FolderIcon,
  CubeIcon,
  ChartBarIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ChevronDoubleRightIcon,
  ChevronDoubleLeftIcon,
} from '@heroicons/react/24/outline'; // Import icons from Heroicons

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(true); // State to manage collapse/expand

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div
      className={`bg-gray-800 text-white ${
        isCollapsed ? 'w-20' : 'w-52'
      } h-full fixed top-0 left-0 p-2 shadow-lg transition-all duration-300`}
    >
      {/* Collapse/Expand Button */}
      <button
        onClick={toggleSidebar}
        className="w-full flex justify-center items-center p-2 mb-4 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors duration-200"
      >
        {isCollapsed ? (
          <ChevronDoubleRightIcon className="h-5 w-5 text-white" />
        ) : (
          <ChevronDoubleLeftIcon className="h-5 w-5 text-white" />
        )}
      </button>

      {/* Navigation Links */}
      <ul className="space-y-2">
        <li>
          <Link
            href="/dashboard"
            className="flex items-center p-2 rounded-lg hover:bg-gray-700 transition-colors duration-200 relative"
          >
            <HomeIcon className="h-5 w-5" />
            {!isCollapsed && <span className="ml-3">Dashboard</span>}
            {isCollapsed && (
              <span className="absolute left-5 bg-gray-700 text-white text-sm px-2 py-1 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                Dashboard
              </span>
            )}
          </Link>
        </li>
        <li>
          <Link
            href="/accounting"
            className="flex items-center p-2 rounded-lg hover:bg-gray-700 transition-colors duration-200 relative"
          >
            <CalculatorIcon className="h-5 w-5" />
            {!isCollapsed && <span className="ml-3">Accounting</span>}
            {isCollapsed && (
              <span className="absolute left-5 bg-gray-700 text-white text-sm px-2 py-1 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                Accounting
              </span>
            )}
          </Link>
        </li>
        <li>
          <Link
            href="/inventory-page"
            className="flex items-center p-2 rounded-lg hover:bg-gray-700 transition-colors duration-200 relative"
          >
            <FolderIcon className="h-5 w-5" />
            {!isCollapsed && <span className="ml-3">Inventory</span>}
            {isCollapsed && (
              <span className="absolute left-5 bg-gray-700 text-white text-sm px-2 py-1 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                Inventory
              </span>
            )}
          </Link>
        </li>
        <li>
          <Link
            href="/manufacturing"
            className="flex items-center p-2 rounded-lg hover:bg-gray-700 transition-colors duration-200 relative"
          >
            <CubeIcon className="h-5 w-5" />
            {!isCollapsed && <span className="ml-3">Manufacturing</span>}
            {isCollapsed && (
              <span className="absolute left-5 bg-gray-700 text-white text-sm px-2 py-1 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                Manufacturing
              </span>
            )}
          </Link>
        </li>
        <li>
          <Link
            href="/sales-crm"
            className="flex items-center p-2 rounded-lg hover:bg-gray-700 transition-colors duration-200 relative"
          >
            <ChartBarIcon className="h-5 w-5" />
            {!isCollapsed && <span className="ml-3">Sales & CRM</span>}
            {isCollapsed && (
              <span className="absolute left-5 bg-gray-700 text-white text-sm px-2 py-1 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                Sales & CRM
              </span>
            )}
          </Link>
        </li>
        <li>
          <Link
            href="/reports"
            className="flex items-center p-2 rounded-lg hover:bg-gray-700 transition-colors duration-200 relative"
          >
            <DocumentTextIcon className="h-5 w-5" />
            {!isCollapsed && <span className="ml-3">Reports</span>}
            {isCollapsed && (
              <span className="absolute left-5 bg-gray-700 text-white text-sm px-2 py-1 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                Reports
              </span>
            )}
          </Link>
        </li>
        <li>
          <Link
            href="/user-management"
            className="flex items-center p-2 rounded-lg hover:bg-gray-700 transition-colors duration-200 relative"
          >
            <UserGroupIcon className="h-5 w-5" />
            {!isCollapsed && <span className="ml-3">User Management</span>}
            {isCollapsed && (
              <span className="absolute left-5 bg-gray-700 text-white text-sm px-2 py-1 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                User Management
              </span>
            )}
          </Link>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;