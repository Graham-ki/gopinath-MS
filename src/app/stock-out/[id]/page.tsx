'use client';
import { useParams } from 'next/navigation';
import { supabase } from '@/supabase/supabaseClient';
import { useEffect, useState } from 'react';
import { FiPackage, FiUser, FiUsers, FiCalendar, FiArrowLeft, FiLoader, FiBox, FiCheckCircle, FiFileText } from 'react-icons/fi';
import Link from 'next/link';

export default function StockOutDetail() {
  const params = useParams();
  
  interface StockOutRecord {
    id: string;
    name: string;
    quantity: number;
    takenby: string;
    issuedby: string;
    created_at: string;
    purpose?: string;
    department?: string;
  }

  const [record, setRecord] = useState<StockOutRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecord = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase
          .from('stock_out')
          .select('*')
          .eq('id', params.id)
          .single();

        if (error) throw error;
        setRecord(data);
      } catch (error) {
        console.error('Error fetching stock out record:', error);
        setError(error instanceof Error ? error.message : 'Failed to load record');
      } finally {
        setLoading(false);
      }
    };

    fetchRecord();
  }, [params.id]);

  if (loading) return (
    <div className="flex-1 ml-16 p-6 flex flex-col items-center justify-center">
      <div className="flex items-center space-x-4">
        <FiLoader className="animate-spin h-8 w-8 text-blue-500" />
        <span className="text-lg font-medium text-gray-700">Loading stock out record...</span>
      </div>
      <div className="mt-4 w-full max-w-md bg-gray-100 rounded-full h-2.5">
        <div className="bg-blue-500 h-2.5 rounded-full animate-pulse" style={{ width: '60%' }}></div>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex-1 ml-16 p-6">
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-4">
        <div className="flex items-center">
          <FiLoader className="h-5 w-5 text-red-500 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-red-700">Error loading record</h3>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      </div>
      <Link href="/inventory-page" className="inline-flex items-center text-blue-500 hover:text-blue-700">
        <FiArrowLeft className="mr-2" />
        Back to Stock Records
      </Link>
    </div>
  );

  if (!record) return (
    <div className="flex-1 ml-16 p-6">
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg mb-4">
        <div className="flex items-center">
          <FiPackage className="h-5 w-5 text-yellow-500 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-yellow-700">Record not found</h3>
            <p className="text-sm text-yellow-600">The requested stock out record don&apos;t exist</p>
          </div>
        </div>
      </div>
      <Link href="/inventory-page" className="inline-flex items-center text-blue-500 hover:text-blue-700">
        <FiArrowLeft className="mr-2" />
        Back to Stock Records
      </Link>
    </div>
  );

  return (
    <div className="flex-1 ml-16 p-6">
      <div className="mb-6">
        <Link 
          href="/inventory-page" 
          className="inline-flex items-center text-blue-500 hover:text-blue-700 mb-4"
        >
          <FiArrowLeft className="mr-2" />
          Back to Stock Records
        </Link>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center">
              <FiPackage className="mr-3 text-blue-500" />
              Stock Out Record
            </h1>
            <p className="text-gray-500 mt-1">Transaction ID: {record.id}</p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <FiCheckCircle className="mr-1.5 h-4 w-4" />
            Completed
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Item Information Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center mb-4">
            <div className="bg-blue-100 p-2 rounded-full mr-3">
              <FiBox className="h-5 w-5 text-blue-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Item Information</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-gray-600 flex items-center">
                <FiPackage className="mr-2 text-gray-400" />
                Product Name
              </span>
              <span className="font-medium text-gray-800">{record.name}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600 flex items-center">
                <FiBox className="mr-2 text-gray-400" />
                Quantity
              </span>
              <span className="font-medium text-gray-800">
                {record.quantity} {record.quantity === 1 ? 'unit' : 'units'}
              </span>
            </div>
          </div>
        </div>

        {/* Transaction Details Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center mb-4">
            <div className="bg-purple-100 p-2 rounded-full mr-3">
              <FiUsers className="h-5 w-5 text-purple-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Transaction Details</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-gray-600 flex items-center">
                <FiUser className="mr-2 text-gray-400" />
                Taken By
              </span>
              <span className="font-medium text-gray-800">{record.takenby}</span>
            </div>
            
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-gray-600 flex items-center">
                <FiUser className="mr-2 text-gray-400" />
                Issued By
              </span>
              <span className="font-medium text-gray-800">{record.issuedby}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600 flex items-center">
                <FiCalendar className="mr-2 text-gray-400" />
                Date
              </span>
              <span className="font-medium text-gray-800">
                {new Date(record.created_at).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Additional Information Card */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <FiFileText className="mr-2 text-green-500" />
            Additional Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Purpose</h3>
              <p className="text-gray-800">
                {record.purpose || <span className="text-gray-400">Not specified</span>}
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Department</h3>
              <p className="text-gray-800">
                {record.department || <span className="text-gray-400">Not specified</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Signature Section */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <FiUser className="mr-2 text-blue-500" />
            Authorization
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Issuer Signature</h3>
              <div className="h-20 border-b-2 border-gray-300"></div>
              <p className="text-sm text-gray-500 mt-1">{record.issuedby}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Receiver Signature</h3>
              <div className="h-20 border-b-2 border-gray-300"></div>
              <p className="text-sm text-gray-500 mt-1">{record.takenby}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}