'use client';
import React, { useState, useEffect } from 'react';
import { FiPackage, FiPlus, FiLoader, FiCheckCircle, FiXCircle, FiClock, FiAlertCircle, FiTrash2,FiPrinter } from 'react-icons/fi';
import Navbar from '../inventory/components/navbar';
import Sidebar from '../inventory/components/sidebar';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface Supplier {
  id: number;
  name: string;
}

interface LPO {
  id: number;
  lpo_number: string;
  supplier_id: number;
  supplier_name: string;
  date: string;
  status: 'Pending' | 'Active' | 'Cancelled' | 'Used';
  created_at: string;
  amount?: number; // Now optional since we'll calculate it dynamically
}

interface StockItem {
  id: number;
  lpo_id: number;
  cost: number;
  quantity: number;
}

const LPOPage = () => {
  const [lpos, setLpos] = useState<LPO[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newLPO, setNewLPO] = useState({
    lpo_number: '',
    supplier_id: 0,
    status: 'Active' as const
  });
  const [actionState, setActionState] = useState({
    showConfirmDialog: false,
    actionType: '',
    lpoId: 0
  });

  // Fetch LPOs, suppliers, and stock items from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch suppliers first
        const { data: supplierData, error: supplierError } = await supabase
          .from('suppliers')
          .select('id, name');
        
        if (supplierError) throw supplierError;
        setSuppliers(supplierData || []);
        
        // Fetch LPOs with supplier names
        const { data: lpoData, error: lpoError } = await supabase
          .from('purchase_lpo')
          .select(`
            *,
            suppliers (name)
          `);
        
        if (lpoError) throw lpoError;
        
        // Fetch all stock items
        const { data: itemsData, error: itemsError } = await supabase
          .from('stock_items')
          .select('id, lpo_id, cost, quantity');
        
        if (itemsError) throw itemsError;
        setStockItems(itemsData || []);

        // Format LPOs with supplier name and calculate amounts
        const formattedLPOs = (lpoData || []).map(lpo => {
          const itemsForLPO = itemsData?.filter(item => item.lpo_id === lpo.id) || [];
          const calculatedAmount = itemsForLPO.reduce(
            (sum, item) => sum + (item.cost * item.quantity), 
            0
          );
          
          return {
            ...lpo,
            supplier_name: lpo.suppliers?.name || 'Unknown',
            status: lpo.status || 'Pending',
            amount: calculatedAmount
          };
        });
        
        setLpos(formattedLPOs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Show confirmation dialog
  const showConfirmation = (actionType: string, lpoId: number) => {
    setActionState({
      showConfirmDialog: true,
      actionType,
      lpoId
    });
  };

  // Hide confirmation dialog
  const hideConfirmation = () => {
    setActionState({
      showConfirmDialog: false,
      actionType: '',
      lpoId: 0
    });
  };

  // Confirm LPO (mark as Used)
  const confirmLPO = async (id: number) => {
    try {
      const { error } = await supabase
        .from('purchase_lpo')
        .update({ status: 'Used' })
        .eq('id', id);
      
      if (error) throw error;
      
      setLpos(lpos.map(lpo => 
        lpo.id === id ? { ...lpo, status: 'Used' } : lpo
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm LPO');
      console.error('Error confirming LPO:', err);
    } finally {
      hideConfirmation();
    }
  };

  // Cancel an LPO
  const cancelLPO = async (id: number) => {
    try {
      const { error } = await supabase
        .from('purchase_lpo')
        .update({ status: 'Cancelled' })
        .eq('id', id);
      
      if (error) throw error;
      
      setLpos(lpos.map(lpo => 
        lpo.id === id ? { ...lpo, status: 'Cancelled' } : lpo
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel LPO');
      console.error('Error cancelling LPO:', err);
    } finally {
      hideConfirmation();
    }
  };

  // Delete an LPO
  const deleteLPO = async (id: number) => {
    try {
      // First delete related stock items
      const { error: itemsError } = await supabase
        .from('stock_items')
        .delete()
        .eq('lpo_id', id);
      
      if (itemsError) throw itemsError;
      
      // Then delete the LPO
      const { error: lpoError } = await supabase
        .from('purchase_lpo')
        .delete()
        .eq('id', id);
      
      if (lpoError) throw lpoError;
      
      setLpos(lpos.filter(lpo => lpo.id !== id));
      setStockItems(stockItems.filter(item => item.lpo_id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete LPO');
      console.error('Error deleting LPO:', err);
    } finally {
      hideConfirmation();
    }
  };

  // Handle confirmed action
  const handleConfirmedAction = () => {
    switch (actionState.actionType) {
      case 'confirm':
        confirmLPO(actionState.lpoId);
        break;
      case 'cancel':
        cancelLPO(actionState.lpoId);
        break;
      case 'delete':
        deleteLPO(actionState.lpoId);
        break;
      default:
        break;
    }
  };

  // Create new LPO
  const createLPO = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('purchase_lpo')
        .insert([{
          lpo_number: newLPO.lpo_number,
          supplier_id: newLPO.supplier_id,
          status: newLPO.status
        }])
        .select(`
          *,
          suppliers (name)
        `);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const createdLPO = {
          ...data[0],
          supplier_name: data[0].suppliers?.name || 'Unknown',
          amount: 0 // Initial amount is 0 until items are added
        };
        
        setLpos([createdLPO, ...lpos]);
        setIsCreateModalOpen(false);
        setNewLPO({
          lpo_number: '',
          supplier_id: 0,
          status: 'Active'
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create LPO');
      console.error('Error creating LPO:', err);
    }
  };

  // Print LPO
  const printLPO = (lpoId: number) => {
    const lpo = lpos.find(l => l.id === lpoId);
    const items = stockItems.filter(item => item.lpo_id === lpoId);
    
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
          <p>Supplier: ${lpo?.supplier_name || 'N/A'}</p>
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
              ${items.map(item => `
                <tr>
                  <td>Item ID: ${item.id}</td>
                  <td>${item.quantity}</td>
                  <td>UGX ${item.cost.toLocaleString()}</td>
                  <td>UGX ${(item.cost * item.quantity).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total">
            Total Amount: UGX ${lpo?.amount?.toLocaleString() || '0'}
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
          <span>Loading LPOs...</span>
        </div>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="flex-1 ml-16 p-6 flex items-center justify-center text-red-500 mt-50 font-large">
      Error: {error}
    </div>
  );

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

  return (
    <div className="flex text-white mt-10">
      <Sidebar />
      <div className="flex-1 ml-16 p-6">
        <Navbar />
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Local Purchase Orders</h1>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
          >
            <FiPlus className="mr-2" />
            Create New LPO
          </button>
        </div>

        {/* Create LPO Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md text-black">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Create New LPO</h2>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                  <FiXCircle className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={createLPO}>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      LPO Number *
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      value={newLPO.lpo_number}
                      onChange={(e) => setNewLPO({...newLPO, lpo_number: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Supplier *
                    </label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      value={newLPO.supplier_id}
                      onChange={(e) => setNewLPO({...newLPO, supplier_id: Number(e.target.value)})}
                      required
                    >
                      <option value="0">Select Supplier</option>
                      {suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Create LPO
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Confirmation Dialog */}
        {actionState.showConfirmDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md text-black">
              <div className="flex items-center mb-4">
                {actionState.actionType === 'delete' ? (
                  <FiAlertCircle className="h-6 w-6 text-red-500 mr-2" />
                ) : (
                  <FiAlertCircle className="h-6 w-6 text-yellow-500 mr-2" />
                )}
                <h2 className="text-xl font-semibold">Confirm Action</h2>
              </div>
              <p className="mb-6">
                {actionState.actionType === 'confirm' && 'Are you sure you want to mark this LPO as Used?'}
                {actionState.actionType === 'cancel' && 'Are you sure you want to cancel this LPO?'}
                {actionState.actionType === 'delete' && 'Are you sure you want to delete this LPO and all its items? This action cannot be undone.'}
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={hideConfirmation}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmedAction}
                  className={`px-4 py-2 text-white rounded-lg ${
                    actionState.actionType === 'delete' 
                      ? 'bg-red-500 hover:bg-red-600' 
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LPOs Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LPO Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lpos.map((lpo) => {
                  const itemsCount = stockItems.filter(item => item.lpo_id === lpo.id).length;
                  return (
                    <tr key={lpo.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        #{lpo.lpo_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {lpo.supplier_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {new Date(lpo.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        UGX {lpo.amount?.toLocaleString() || '0'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(lpo.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <Link
                          href={`/lpo-items/${lpo.id}`}
                          className="text-blue-500 hover:text-blue-700 inline-flex items-center"
                        >
                          <FiPackage className="mr-1" />
                          Items ({itemsCount})
                        </Link>
                        <button
                          onClick={() => printLPO(lpo.id)}
                          className="text-green-500 hover:text-green-700 inline-flex items-center"
                        >
                          <FiPrinter className="mr-1" />
                          Print
                        </button>
                        {lpo.status === 'Active' && (
                          <button
                            onClick={() => showConfirmation('confirm', lpo.id)}
                            className="text-purple-500 hover:text-purple-700 inline-flex items-center"
                          >
                            <FiCheckCircle className="mr-1" />
                            Confirm
                          </button>
                        )}
                        {lpo.status !== 'Cancelled' && lpo.status !== 'Used' && (
                          <button
                            onClick={() => showConfirmation('cancel', lpo.id)}
                            className="text-orange-500 hover:text-orange-700 inline-flex items-center"
                          >
                            <FiXCircle className="mr-1" />
                            Cancel
                          </button>
                        )}
                        <button
                          onClick={() => showConfirmation('delete', lpo.id)}
                          className="text-red-500 hover:text-red-700 inline-flex items-center"
                        >
                          <FiTrash2 className="mr-1" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LPOPage;