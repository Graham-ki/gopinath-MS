'use client';
import React, { useState, useEffect } from 'react';
import Navbar from '../../inventory/components/navbar';
import Sidebar from '../../inventory/components/sidebar';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useParams } from 'next/navigation';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface LPOItem {
  id: number;
  lpo_id: number;
  name: string;
  quantity: number;
  cost: number;
  total: number;
  grn_number: string;
}

interface LPO {
  id: number;
  lpo_number: string;
  supplier_name: string;
  created_at: string;
  status: string;
  amount: number;
  supplier_id?: number;
}

const LPOItemsPage = () => {
  const params = useParams();
  const lpoId = Number(params?.id);
  const [lpo, setLpo] = useState<LPO | null>(null);
  const [items, setItems] = useState<LPOItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNaN(lpoId)) {
      setError('Invalid LPO ID');
      setLoading(false);
      return;
    }
  }, [lpoId]);

  // Fetch LPO and its items from stock_items table
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!lpoId || isNaN(lpoId)) return;
        
        setLoading(true);
        
        // 1. First fetch the LPO data including supplier_id
        const { data: lpoData, error: lpoError } = await supabase
          .from('purchase_lpo')
          .select(`
            id,
            lpo_number,
            created_at,
            status,
            amount,
            supplier_id
          `)
          .eq('id', lpoId)
          .single();
        
        if (lpoError) throw lpoError;
        if (!lpoData) throw new Error('LPO not found');
    
        // 2. Fetch the supplier details
        let supplierName = 'Unknown';
        if (lpoData.supplier_id) {
          const { data: supplierData, error: supplierError } = await supabase
            .from('suppliers')
            .select('name')
            .eq('id', lpoData.supplier_id)
            .single();
          
          if (!supplierError && supplierData) {
            supplierName = supplierData.name;
          }
        }
    
        // Format LPO with supplier name
        const formattedLPO = {
          ...lpoData,
          supplier_name: supplierName,
          created_at: lpoData.created_at,
          lpo_number: lpoData.lpo_number || 'Unknown'
        };
        setLpo(formattedLPO);
    
        // 3. Fetch items associated with this LPO
        const { data: itemsData, error: itemsError } = await supabase
          .from('stock_items')
          .select(`
            id,
            name,
            quantity,
            cost,
            grn_number,
            lpo_id
          `)
          .eq('lpo_id', lpoId);
        
        if (itemsError) throw itemsError;
        
        // Format items with totals
        const formattedItems = itemsData?.map(item => ({
          ...item,
          lpo_id: lpoId,
          total: item.quantity * item.cost
        })) || [];
        
        setItems(formattedItems);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
        console.error('Error fetching LPO items:', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (lpoId && !isNaN(lpoId)) {
      fetchData();
    }
  }, [lpoId]);

  if (loading) return (
    <div className="flex-1 ml-16 p-6 flex items-center justify-center">
      <div className="animate-pulse flex space-x-2 items-center mt-50">
        <div className="h-2 w-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="h-2 w-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="h-2 w-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        <span className="ml-2 text-green-500 font-large">Items Loading...</span>
      </div>
    </div>
  );

  if (error) return <div className="flex-1 ml-16 p-6 text-red-500">Error: {error}</div>;
  if (!lpo) return <div className="flex-1 ml-16 p-6">LPO not found</div>;

  return (
    <div className="flex text-white mt-10">
      <Sidebar />
      <div className="flex-1 ml-16 p-6">
        <Navbar />
        
        {/* Back button */}
        <Link 
          href="/lpos"
          className="text-white-500 hover:text-blue-700 mb-4 inline-block"
        >
          ← Back to LPOs
        </Link>
        
        <div className="mb-8 p-6 bg-white rounded-xl shadow-lg border border-gray-100 max-w-2xl mx-auto">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
            LPO: {lpo.lpo_number}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start">
                <span className="text-gray-600 font-medium min-w-[100px]">Supplier:</span>
                <span className="text-gray-800 font-semibold">{lpo.supplier_name}</span>
              </div>
              
              <div className="flex items-start">
                <span className="text-gray-600 font-medium min-w-[100px]">Date:</span>
                <span className="text-gray-800">
                  {new Date(lpo.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-start">
                <span className="text-gray-600 font-medium min-w-[100px]">Amount:</span>
                <span className="text-gray-800 font-semibold">
                  UGX {lpo.amount?.toLocaleString() || '0'}
                </span>
              </div>
              
              <div className="flex items-start">
                <span className="text-gray-600 font-medium min-w-[100px]">Status:</span>
                <span>
                  {lpo.status === 'Cancelled' ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      Cancelled
                    </span>
                  ) : lpo.status === 'Active' ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Active
                    </span>
                  ) : lpo.status === 'Used' ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Used
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      Unknown
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 text-black">
          <h2 className="text-xl font-semibold mb-4">Items</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-3 px-4 text-left">Name</th>
                  <th className="py-3 px-4 text-left">GRN Number</th>
                  <th className="py-3 px-4 text-left">Quantity</th>
                  <th className="py-3 px-4 text-left">Unit Cost</th>
                  <th className="py-3 px-4 text-left">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-3 px-4">{item.name}</td>
                    <td className="py-3 px-4">{item.grn_number}</td>
                    <td className="py-3 px-4">{item.quantity}</td>
                    <td className="py-3 px-4">UGX {item.cost.toLocaleString()}</td>
                    <td className="py-3 px-4">UGX {item.total.toLocaleString()}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 px-4 text-center text-gray-500">
                      No items found for this LPO
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

export default LPOItemsPage;