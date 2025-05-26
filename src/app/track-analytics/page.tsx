import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Hero Section */}
        <div className="grid md:grid-cols-2">
          {/* Left Content */}
          <div className="p-10 md:p-12 flex flex-col justify-center">
            <div className="flex items-center mb-6">
              <div className="bg-indigo-600 text-white p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
              </div>
              <span className="ml-3 text-xl font-semibold text-indigo-600">MTS</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Welcome to <span className="text-indigo-600">MTS</span>
            </h1>
            
            <h2 className="text-xl md:text-2xl font-medium text-indigo-500 mb-6">
              Delivery Analytics
            </h2>
            
            <p className="text-gray-600 text-lg mb-8">
              View truck routes, performance metrics, and actionable analytics to optimize your delivery operations.
            </p>
            
            <Link href="/analytics-dashboard" className="flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-lg transition duration-200 w-full md:w-auto">
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
          
          {/* Right Illustration */}
          <div className="bg-indigo-50 hidden md:flex items-center justify-center p-8">
            <div className="relative w-full h-full">
              {/* Delivery truck illustration */}
              <svg viewBox="0 0 500 400" className="w-full h-full">
                <path d="M100,250 L400,250 L400,200 L350,200 L350,150 L300,150 L300,200 L100,200 Z" fill="#4F46E5" opacity="0.2"/>
                <rect x="100" y="200" width="300" height="50" fill="#4F46E5" opacity="0.8"/>
                <rect x="150" y="150" width="50" height="50" fill="#4F46E5"/>
                <rect x="250" y="150" width="50" height="50" fill="#4F46E5"/>
                <circle cx="170" cy="270" r="20" fill="#1E1B4B"/>
                <circle cx="330" cy="270" r="20" fill="#1E1B4B"/>
                
                {/* Route path */}
                <path d="M50,300 Q150,250 250,280 Q350,310 450,280" stroke="#4F46E5" strokeWidth="3" fill="none" strokeDasharray="5,5"/>
                
                {/* Analytics chart */}
                <rect x="120" y="100" width="30" height="80" fill="#A5B4FC"/>
                <rect x="170" y="60" width="30" height="120" fill="#4F46E5"/>
                <rect x="220" y="80" width="30" height="100" fill="#A5B4FC"/>
                <rect x="270" y="40" width="30" height="140" fill="#4F46E5"/>
                <rect x="320" y="90" width="30" height="90" fill="#A5B4FC"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}