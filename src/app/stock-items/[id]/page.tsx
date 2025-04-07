'use client';
import { useParams } from 'next/navigation';
import { supabase } from '@/supabase/supabaseClient';
import { useEffect, useState } from 'react';
import { FiPackage, FiBox, FiFileText, FiDollarSign, FiCalendar, FiTruck, FiLoader, FiArrowLeft } from 'react-icons/fi';
import Link from 'next/link';

export default function StockItemDetail() {
  const params = useParams();
  interface StockItem {
    id: string;
    name: string;
    quantity: number;
    lpo_number: string;
    grn_number: string;
    cost: number;
    created_at: string;
    suppliers?: { name: string };
  }

  const [item, setItem] = useState<StockItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase
          .from('stock_items')
          .select('*, suppliers(name)')
          .eq('id', params.id)
          .single();

        if (error) throw error;
        setItem(data);
      } catch (error) {
        console.error('Error fetching stock item:', error);
        setError(error instanceof Error ? error.message : 'Failed to load item details');
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [params.id]);

  if (loading) return (
    <div className="flex-1 ml-16 p-6 flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="animate-pulse flex space-x-2 items-center mb-4">
          <div className="h-2 w-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="h-2 w-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="h-2 w-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        <div className="flex items-center text-blue-500">
          <FiLoader className="animate-spin mr-2" />
          <span className="font-medium">Loading item details...</span>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex-1 ml-16 p-6">
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <FiLoader className="h-5 w-5 text-red-500" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
      <Link href="/inventory" className="mt-4 inline-flex items-center text-blue-500 hover:text-blue-700">
        <FiArrowLeft className="mr-2" />
        Back to Inventory
      </Link>
    </div>
  );

  if (!item) return (
    <div className="flex-1 ml-16 p-6">
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <FiPackage className="h-5 w-5 text-yellow-500" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">Item not found</p>
          </div>
        </div>
      </div>
      <Link href="/inventory" className="mt-4 inline-flex items-center text-blue-500 hover:text-blue-700">
        <FiArrowLeft className="mr-2" />
        Back to Inventory
      </Link>
    </div>
  );

  return (
    <div className="flex-1 ml-16 p-6">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <Link href="/inventory-page" className="inline-flex items-center text-blue-500 hover:text-blue-700 mb-2">
            <FiArrowLeft className="mr-2" />
            Back to Inventory
          </Link>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <FiPackage className="mr-3 text-blue-500" />
            {item.name}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Information Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center mb-4">
            <div className="bg-blue-100 p-2 rounded-full mr-3">
              <FiBox className="h-5 w-5 text-blue-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Stock Information</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-gray-600 flex items-center">
                <FiBox className="mr-2 text-gray-400" />
                Quantity
              </span>
              <span className="font-medium text-black">
                {item.quantity} {item.quantity === 1 ? 'unit' : 'units'}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-gray-600 flex items-center">
                <FiFileText className="mr-2 text-gray-400" />
                GRN Number
              </span>
              <span className="font-medium text-black">
                {item.grn_number || 'N/A'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600 flex items-center">
                <FiDollarSign className="mr-2 text-gray-400" />
                Unit Cost
              </span>
              <span className="font-medium text-black">
                UGX {item.cost.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Supplier Information Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center mb-4">
            <div className="bg-green-100 p-2 rounded-full mr-3">
              <FiTruck className="h-5 w-5 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Supplier Information</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-gray-600 flex items-center">
                <FiTruck className="mr-2 text-gray-400" />
                Supplier
              </span>
              <span className="font-medium text-black">
                {item.suppliers?.name || 'Not specified'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600 flex items-center">
                <FiCalendar className="mr-2 text-gray-400" />
                Date Added
              </span>
              <span className="font-medium text-black">
                {new Date(item.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Additional Space for More Information 
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <FiFileText className="mr-2 text-purple-500" />
            Additional Information
          </h2>
          <p className="text-gray-500">
            More details about this item can be added here. Consider including fields like:
          </p>
          <ul className="list-disc list-inside text-gray-500 mt-2 space-y-1">
            <li>Item category or type</li>
            <li>Storage location</li>
            <li>Minimum stock level</li>
            <li>Last updated timestamp</li>
          </ul>
        </div>*/}
      </div>
    </div>
  );
}