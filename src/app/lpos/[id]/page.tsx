'use client';
import { useParams } from 'next/navigation';
import { supabase } from '@/supabase/supabaseClient';
import { useEffect, useState } from 'react';

export default function LPODetail() {
  const params = useParams();
  interface LPO {
    lpo_number: string;
    status: string;
    amount: number;
    created_at: string;
    suppliers?: { name: string };
  }

  const [lpo, setLpo] = useState<LPO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLPO = async () => {
      try {
        const { data, error } = await supabase
          .from('purchase_lpo')
          .select('*, suppliers(name)')
          .eq('id', params.id)
          .single();

        if (error) throw error;
        setLpo(data);
      } catch (error) {
        console.error('Error fetching LPO:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLPO();
  }, [params.id]);

  if (loading) return <div className="flex-1 ml-16 p-6 flex items-center justify-center">
  <div className="animate-pulse flex space-x-2 items-center mt-50">
    <div className="h-2 w-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
    <div className="h-2 w-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
    <div className="h-2 w-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
    <span className="ml-2 text-green-500 font-medium">Loading...</span>
  </div>
</div>;
  if (!lpo) return <div>LPO not found</div>;

  return (
    <div className="p-6 text-black">
      <h1 className="text-2xl font-bold mb-4 text-white">LPO #{lpo.lpo_number}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">LPO Details</h2>
          <p>Status: <span>
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
          ) :
          (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              Unknown
            </span>
          )}
        </span></p>
          <p>Amount: UGX {lpo.amount}</p>
          <p>Created: {new Date(lpo.created_at).toLocaleDateString()}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Supplier Information</h2>
          <p>Supplier: {lpo.suppliers?.name || 'N/A'}</p>
        </div>
      </div>
    </div>
  );
}