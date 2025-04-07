'use client';
import { useParams } from 'next/navigation';
import { supabase } from '@/supabase/supabaseClient';
import { useEffect, useState } from 'react';
import { 
  FiPackage, 
  FiPhone, 
  FiMail, 
  FiMapPin, 
  FiCalendar,
  FiUser,
  FiInfo,
  FiArrowLeft,
  FiEdit2,
  FiShoppingBag,
  FiFileText,
  FiDollarSign,
  FiLoader
} from 'react-icons/fi';
import Link from 'next/link';

interface SupplierStats {
  totalOrders: number;
  activeLPOs: number;
  totalSpent: number;
  primarySupply: string | null;
}

export default function SupplierDetail() {
  const params = useParams();
  const [supplier, setSupplier] = useState<{ 
    id: string;
    name: string; 
    contact: string; 
    email?: string; 
    address?: string; 
    created_at: string 
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SupplierStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const fetchSupplier = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('suppliers')
          .select('*')
          .eq('id', params.id)
          .single();

        if (error) throw error;
        setSupplier(data);
      } catch (error) {
        console.error('Error fetching supplier:', error);
        setError(error instanceof Error ? error.message : 'Failed to load supplier');
      } finally {
        setLoading(false);
      }
    };

    fetchSupplier();
  }, [params.id]);

  useEffect(() => {
    // Update the stats fetching logic in the useEffect
const fetchSupplierStats = async () => {
  if (!supplier) return;

  try {
    setStatsLoading(true);

    // Fetch all stock items for this supplier
    const { data: stockItems } = await supabase
      .from('stock_items')
      .select('cost, quantity, name')
      .eq('supplier_id', supplier.id);

    // Calculate total orders (count of stock items)
    const totalOrders = stockItems?.length || 0;

    // Calculate total spent (sum of cost * quantity)
    const totalSpent = stockItems?.reduce((sum, item) => {
      return sum + ((item.cost || 0) * (item.quantity || 0));
    }, 0) || 0;

    // Fetch active LPOs
    const { count: activeLPOs } = await supabase
      .from('purchase_lpo')
      .select('*', { count: 'exact', head: true })
      .eq('supplier_id', supplier.id)
      .eq('status', 'Active');

    // Calculate primary supply (most frequent item)
    const itemCounts: Record<string, number> = {};
    stockItems?.forEach(item => {
      itemCounts[item.name] = (itemCounts[item.name] || 0) + 1;
    });

    let primarySupply = null;
    let maxCount = 0;
    for (const [name, count] of Object.entries(itemCounts)) {
      if (count > maxCount) {
        maxCount = count;
        primarySupply = name;
      }
    }

    setStats({
      totalOrders,
      activeLPOs: activeLPOs || 0,
      totalSpent,
      primarySupply
    });
  } catch (error) {
    console.error('Error fetching supplier stats:', error);
  } finally {
    setStatsLoading(false);
  }
};

    fetchSupplierStats();
  }, [supplier]);

  if (loading) return (
    <div className="flex-1 ml-16 p-6 flex flex-col items-center justify-center min-h-screen">
      <div className="flex flex-col items-center space-y-4">
        <div className="flex space-x-2">
          <div className="h-3 w-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="h-3 w-3 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="h-3 w-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        <div className="flex items-center space-x-2 text-gray-600">
          <FiPackage className="animate-spin" />
          <span>Loading supplier details...</span>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex-1 ml-16 p-6 flex items-center justify-center">
      <div className="bg-red-50 p-6 rounded-lg max-w-md text-center">
        <div className="flex justify-center text-red-500 mb-4">
          <FiInfo size={32} />
        </div>
        <h3 className="text-lg font-medium text-red-800 mb-2">Error loading supplier</h3>
        <p className="text-red-600">{error}</p>
        <Link 
          href="/suppliers" 
          className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors inline-flex items-center justify-center"
        >
          <FiArrowLeft className="mr-2" />
          Back to Suppliers
        </Link>
      </div>
    </div>
  );

  if (!supplier) return (
    <div className="flex-1 ml-16 p-6 flex items-center justify-center">
      <div className="bg-yellow-50 p-6 rounded-lg max-w-md text-center">
        <div className="flex justify-center text-yellow-500 mb-4">
          <FiInfo size={32} />
        </div>
        <h3 className="text-lg font-medium text-yellow-800 mb-2">Supplier Not Found</h3>
        <p className="text-yellow-600">The requested supplier could not be found</p>
        <Link 
          href="/suppliers" 
          className="mt-4 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 transition-colors inline-flex items-center justify-center"
        >
          <FiArrowLeft className="mr-2" />
          Back to Suppliers
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex-1 ml-16 p-6">
      <div className="mb-6">
        <Link 
          href="/suppliers" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
        >
          <FiArrowLeft className="mr-2" />
          Back to Suppliers
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center">
          <FiUser className="mr-3 text-blue-500" />
          {supplier.name}
        </h1>
        <p className="text-gray-400 mt-1">Supplier details and contact information</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Information Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center mb-4">
            <div className="bg-blue-100 p-2 rounded-lg mr-3">
              <FiPhone className="text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Contact Information</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="bg-gray-100 p-2 rounded-lg mr-3">
                <FiPhone className="text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone Number</p>
                <p className="font-medium text-gray-800">{supplier.contact}</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-gray-100 p-2 rounded-lg mr-3">
                <FiMail className="text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Email Address</p>
                <p className="font-medium text-gray-800">
                  {supplier.email || <span className="text-gray-400">Not provided</span>}
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-gray-100 p-2 rounded-lg mr-3">
                <FiMapPin className="text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Physical Address</p>
                <p className="font-medium text-gray-800">
                  {supplier.address || <span className="text-gray-400">Not provided</span>}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Details Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center mb-4">
            <div className="bg-blue-100 p-2 rounded-lg mr-3">
              <FiInfo className="text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Additional Details</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="bg-gray-100 p-2 rounded-lg mr-3">
                <FiCalendar className="text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Date Added</p>
                <p className="font-medium text-gray-800">
                  {new Date(supplier.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-gray-100 p-2 rounded-lg mr-3">
                <FiPackage className="text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Primary Supplies</p>
                <p className="font-medium text-gray-800">
                  {statsLoading ? (
                    <FiLoader className="animate-spin text-gray-400" />
                  ) : stats?.primarySupply || (
                    <span className="text-gray-400">Not specified</span>
                  )}
                </p>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <Link href="/suppliers" className="text-blue-600 hover:text-blue-800 flex items-center text-sm">
                <FiEdit2 className="mr-2" />
                Edit Supplier Details
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Orders</p>
              {statsLoading ? (
                <FiLoader className="animate-spin text-gray-400 mt-2" size={24} />
              ) : (
                <p className="text-2xl font-bold text-gray-800">{stats?.totalOrders || 0}</p>
              )}
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <FiShoppingBag className="text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active LPOs</p>
              {statsLoading ? (
                <FiLoader className="animate-spin text-gray-400 mt-2" size={24} />
              ) : (
                <p className="text-2xl font-bold text-gray-800">{stats?.activeLPOs || 0}</p>
              )}
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <FiFileText className="text-blue-600" />
            </div>
          </div>
        </div>
        
        {/* In the Total Spend card */}
<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm text-gray-500">Total Spend</p>
      {statsLoading ? (
        <div className="flex items-center mt-2">
          <FiLoader className="animate-spin text-gray-400 mr-2" />
          <span className="text-gray-500">Calculating...</span>
        </div>
      ) : (
        <p className="text-2xl font-bold text-gray-800">
          UGX {stats?.totalSpent}
        </p>
      )}
    </div>
    <div className="bg-purple-100 p-3 rounded-lg">
      <FiDollarSign className="text-purple-600" />
    </div>
  </div>
</div>
      </div>
    </div>
  );
}