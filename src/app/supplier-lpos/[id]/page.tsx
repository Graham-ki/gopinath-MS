// app/supplier-lpos/[id]/page.tsx
'use client';
import React, { useState, useEffect } from 'react';
import Navbar from '../../inventory/components/navbar';
import Sidebar from '../../inventory/components/sidebar';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FiArrowLeft, FiFileText, FiDollarSign, FiCalendar, FiEye, FiLoader, FiCheckCircle, FiXCircle, FiAlertCircle } from 'react-icons/fi';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface LPO {
  id: number;
  lpo_number: string;
  amount: number;
  status: string;
  created_at: string;
}

interface Supplier {
  id: number;
  name: string;
}

export default function SupplierLPOsPage() {
  const params = useParams();
  const supplierId = params?.id as string;
  
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [lpos, setLpos] = useState<LPO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch supplier details
        const { data: supplierData, error: supplierError } = await supabase
          .from('suppliers')
          .select('id, name')
          .eq('id', supplierId)
          .single();

        if (supplierError) throw supplierError;
        setSupplier(supplierData);

        // Fetch LPOs for this supplier
        const { data: lpoData, error: lpoError } = await supabase
          .from('purchase_lpo')
          .select('id, lpo_number, amount, status, created_at')
          .eq('supplier_id', supplierId)
          .order('created_at', { ascending: false });

        if (lpoError) throw lpoError;
        setLpos(lpoData || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    if (supplierId) fetchData();
  }, [supplierId]);

  if (loading) return (
    <div className="flex-1 ml-16 p-6 flex flex-col items-center justify-center min-h-screen">
      <div className="flex flex-col items-center space-y-4">
        <div className="flex space-x-2">
          <div className="h-3 w-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="h-3 w-3 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="h-3 w-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        <div className="flex items-center space-x-2 text-gray-600">
          <FiLoader className="animate-spin" />
          <span>Loading supplier LPOs...</span>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex-1 ml-16 p-6 flex items-center justify-center">
      <div className="bg-red-50 p-6 rounded-lg max-w-md text-center">
        <div className="flex justify-center text-red-500 mb-4">
          <FiAlertCircle size={32} />
        </div>
        <h3 className="text-lg font-medium text-red-800 mb-2">Error loading data</h3>
        <p className="text-red-600">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex text-black">
      <Sidebar />
      <div className="flex-1 ml-16 p-6">
        <Navbar />
        
        <Link 
          href="/suppliers" 
          className="flex items-center text-blue-500 hover:text-blue-700 mb-6 transition-colors"
        >
          <FiArrowLeft className="mr-2" />
          Back to Suppliers
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center text-white">
            <FiFileText className="mr-3 text-blue-500" />
            LPOs for {supplier?.name}
          </h1>
          <p className="text-gray-600">View and manage all purchase orders for this supplier</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mt-4">
          {lpos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ">
                      <FiFileText className="mr-2" />
                      LPO Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ">
                      <FiDollarSign className="mr-2" />
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ">
                      <FiCalendar className="mr-2" />
                      Date Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lpos.map((lpo) => (
                    <tr key={lpo.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-medium">
                        {lpo.lpo_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        UGX {lpo.amount?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {lpo.status === 'Cancelled' ? (
                            <FiXCircle className="mr-2 text-red-500" />
                          ) : lpo.status === 'Active' ? (
                            <FiCheckCircle className="mr-2 text-green-500" />
                          ) : (
                            <FiLoader className="mr-2 text-yellow-500 animate-spin" />
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            lpo.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                            lpo.status === 'Active' ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {lpo.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {new Date(lpo.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link 
                          href={`/lpo-items/${lpo.id}`}
                          className="flex items-center text-blue-500 hover:text-blue-700 transition-colors"
                        >
                          <FiEye className="mr-2" />
                          View Items
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FiFileText className="text-gray-400 text-3xl" />
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-1">No LPOs found</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                This supplier don&apos;t have any purchase orders yet. Create a new LPO to get started.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}