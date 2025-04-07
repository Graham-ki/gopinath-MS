'use client';
import { useParams } from 'next/navigation';
import { supabase } from '@/supabase/supabaseClient';
import { useEffect, useState } from 'react';
import { FiFileText, FiDollarSign, FiCalendar, FiTruck, FiLoader, FiArrowLeft, FiCheckCircle, FiXCircle, FiClock, FiAlertCircle, FiPrinter, FiPackage, FiPhone, FiMail } from 'react-icons/fi';
import Link from 'next/link';

export default function LPODetail() {
  const params = useParams();
  
  interface LPO {
    id: string;
    lpo_number: string;
    status: string;
    amount: number;
    created_at: string;
    approved_by?: string;
    approved_at?: string;
    suppliers?: { name: string; contact?: string; email?: string };
  }

  interface StockItem {
    id: string;
    name: string;
    quantity: number;
    cost: number;
    lpo_id: string;
    created_at: string;
  }

  const [lpo, setLpo] = useState<LPO | null>(null);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch LPO details
        const { data: lpoData, error: lpoError } = await supabase
          .from('purchase_lpo')
          .select('*, suppliers(name, contact, email)')
          .eq('id', params.id)
          .single();

        if (lpoError) throw lpoError;

        // Fetch related stock items
        const { data: itemsData, error: itemsError } = await supabase
          .from('stock_items')
          .select('*')
          .eq('lpo_id', params.id);

        if (itemsError) throw itemsError;

        setLpo(lpoData);
        setStockItems(itemsData || []);

        // Calculate total amount
        if (itemsData && itemsData.length > 0) {
          const calculatedAmount = itemsData.reduce(
            (sum, item) => sum + (item.cost * item.quantity), 
            0
          );
          setTotalAmount(calculatedAmount);
        } else {
          setTotalAmount(lpoData?.amount || 0);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load LPO details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Cancelled':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <FiXCircle className="mr-1.5 h-4 w-4" />
            Cancelled
          </span>
        );
      case 'Active':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <FiCheckCircle className="mr-1.5 h-4 w-4" />
            Active
          </span>
        );
      case 'Used':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
            <FiCheckCircle className="mr-1.5 h-4 w-4" />
            Used
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <FiClock className="mr-1.5 h-4 w-4" />
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            <FiAlertCircle className="mr-1.5 h-4 w-4" />
            Unknown
          </span>
        );
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow?.document.write(`
      <html>
        <head>
          <title>LPO ${lpo?.lpo_number} - Print</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #1a365d; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .header { display: flex; justify-content: space-between; }
            .total { font-weight: bold; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>LPO #${lpo?.lpo_number}</h1>
            <p>Date: ${new Date(lpo?.created_at || '').toLocaleDateString()}</p>
          </div>
          <p>Supplier: ${lpo?.suppliers?.name || 'N/A'}</p>
          <p>Status: ${lpo?.status}</p>
          
          <h2>Ordered Items</h2>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${stockItems.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td>UGX ${item.cost.toLocaleString()}</td>
                  <td>UGX ${(item.cost * item.quantity).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total">
            Total Amount: UGX ${totalAmount.toLocaleString()}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow?.document.close();
  };

  const handleCancelLPO = async () => {
    try {
      setActionLoading(true);
      const { error } = await supabase
        .from('purchase_lpo')
        .update({ status: 'Cancelled' })
        .eq('id', params.id);

      if (error) throw error;

      // Update local state
      if (lpo) {
        setLpo({ ...lpo, status: 'Cancelled' });
      }
      setShowCancelConfirm(false);
    } catch (error) {
      console.error('Error cancelling LPO:', error);
      setError(error instanceof Error ? error.message : 'Failed to cancel LPO');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return (
    <div className="flex-1 ml-16 p-6 flex flex-col items-center justify-center">
      <div className="flex items-center space-x-4">
        <FiLoader className="animate-spin h-8 w-8 text-blue-500" />
        <span className="text-lg font-medium text-gray-700">Loading LPO details...</span>
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
          <FiAlertCircle className="h-5 w-5 text-red-500 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-red-700">Error loading LPO details</h3>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      </div>
      <Link href="/lpos" className="inline-flex items-center text-blue-500 hover:text-blue-700">
        <FiArrowLeft className="mr-2" />
        Back to LPOs
      </Link>
    </div>
  );

  if (!lpo) return (
    <div className="flex-1 ml-16 p-6">
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg mb-4">
        <div className="flex items-center">
          <FiFileText className="h-5 w-5 text-yellow-500 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-yellow-700">LPO not found</h3>
            <p className="text-sm text-yellow-600">The requested LPO doesn&#39;t exist</p>
          </div>
        </div>
      </div>
      <Link href="/lpos" className="inline-flex items-center text-blue-500 hover:text-blue-700">
        <FiArrowLeft className="mr-2" />
        Back to LPOs
      </Link>
    </div>
  );

  return (
    <div className="flex-1 ml-16 p-6">
      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl max-w-md w-full">
            <div className="flex items-center mb-4">
              <FiAlertCircle className="h-6 w-6 text-yellow-500 mr-2" />
              <h2 className="text-xl font-semibold text-black">Confirm Cancellation</h2>
            </div>
            <p className="mb-6 text-black">Are you sure you want to cancel LPO #{lpo.lpo_number}? This action cannot be undone.</p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="text-black px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleCancelLPO}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center"
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <FiLoader className="animate-spin mr-2" />
                ) : (
                  <FiXCircle className="mr-2" />
                )}
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <Link 
          href="/lpos" 
          className="inline-flex items-center text-blue-500 hover:text-blue-700 mb-4"
        >
          <FiArrowLeft className="mr-2" />
          Back to LPOs
        </Link>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center">
              <FiFileText className="mr-3 text-blue-500" />
              LPO #{lpo.lpo_number}
            </h1>
            <p className="text-gray-500 mt-1">Purchase Order Details</p>
          </div>
          <div>
            {getStatusBadge(lpo.status)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LPO Details Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center mb-4">
            <div className="bg-blue-100 p-2 rounded-full mr-3">
              <FiFileText className="h-5 w-5 text-blue-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">LPO Details</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-gray-600 flex items-center">
                <FiFileText className="mr-2 text-gray-400" />
                LPO Number
              </span>
              <span className="font-medium text-gray-800">#{lpo.lpo_number}</span>
            </div>
            
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-gray-600 flex items-center">
                <FiDollarSign className="mr-2 text-gray-400" />
                Total Amount
              </span>
              <span className="font-medium text-gray-800">
                UGX {totalAmount.toLocaleString()}
              </span>
            </div>
            
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-gray-600 flex items-center">
                <FiCalendar className="mr-2 text-gray-400" />
                Created Date
              </span>
              <span className="font-medium text-gray-800">
                {new Date(lpo.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            
            {lpo.approved_by && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600 flex items-center">
                  <FiCheckCircle className="mr-2 text-gray-400" />
                  Approved By
                </span>
                <span className="font-medium text-gray-800">
                  {lpo.approved_by}
                  {lpo.approved_at && (
                    <span className="block text-sm text-gray-500">
                      {new Date(lpo.approved_at).toLocaleDateString()}
                    </span>
                  )}
                </span>
              </div>
            )}
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
                Supplier Name
              </span>
              <span className="font-medium text-gray-800">
                {lpo.suppliers?.name || 'Not specified'}
              </span>
            </div>
            
            {lpo.suppliers?.contact && (
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-gray-600 flex items-center">
                  <FiPhone className="mr-2 text-gray-400" />
                  Contact
                </span>
                <span className="font-medium text-gray-800">
                  {lpo.suppliers.contact}
                </span>
              </div>
            )}
            
            {lpo.suppliers?.email && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600 flex items-center">
                  <FiMail className="mr-2 text-gray-400" />
                  Email
                </span>
                <span className="font-medium text-gray-800">
                  {lpo.suppliers.email}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Items List Card */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <FiPackage className="mr-2 text-purple-500" />
            Ordered Items
          </h2>
          
          {stockItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stockItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        UGX {item.cost.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        UGX {(item.cost * item.quantity).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-right text-sm font-medium text-gray-500">
                      Total Amount:
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                      UGX {totalAmount.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <FiPackage className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No items found</h3>
              <p className="mt-1 text-sm text-gray-500">This LPO doesn&#39;t have any items associated with it.</p>
            </div>
          )}
        </div>

        {/* Actions Card */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <FiFileText className="mr-2 text-blue-500" />
            LPO Actions
          </h2>
          
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 flex items-center"
              disabled={actionLoading}
            >
              <FiPrinter className="mr-2" />
              Print LPO
            </button>
            
            {lpo.status !== 'Cancelled' && (
              <button 
                onClick={() => setShowCancelConfirm(true)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 flex items-center"
                disabled={actionLoading || lpo.status === 'Cancelled'}
              >
                <FiXCircle className="mr-2" />
                Cancel LPO
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}