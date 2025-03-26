// app/supplier-lpos/[id]/page.tsx
'use client';
import React, { useState, useEffect } from 'react';
import Navbar from '../../inventory/components/navbar';
import Sidebar from '../../inventory/components/sidebar';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useParams } from 'next/navigation';

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

  if (loading) return <div className="flex-1 ml-16 p-6 flex items-center justify-center">
  <div className="animate-pulse flex space-x-2 items-center mt-50">
    <div className="h-2 w-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
    <div className="h-2 w-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
    <div className="h-2 w-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
    <span className="ml-2 text-green-500 font-large">LPOs Loading...</span>
  </div>
</div>;
  if (error) return <div className="flex-1 ml-16 p-6 text-red-500">Error: {error}</div>;

  return (
    <div className="flex text-black">
      <Sidebar />
      <div className="flex-1 ml-16 p-6">
        <Navbar />
        
        <Link href="/suppliers" className="text-blue-500 hover:text-blue-700 mb-4 inline-block">
          ← Back to Suppliers
        </Link>

        <h1 className="text-2xl font-bold mb-2">LPOs for Supplier: {supplier?.name}</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mt-4">
          {lpos.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LPO Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lpos.map((lpo) => (
                  <tr key={lpo.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{lpo.lpo_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap">UGX {lpo.amount?.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        lpo.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                        lpo.status === 'Active' ? 'bg-green-100 text-green-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {lpo.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(lpo.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link 
                        href={`/lpo-items/${lpo.id}`}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        View Items
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No LPOs found for this supplier
            </div>
          )}
        </div>
      </div>
    </div>
  );
}