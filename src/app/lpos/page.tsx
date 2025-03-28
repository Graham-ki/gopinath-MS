'use client';
import React, { useState, useEffect } from 'react';
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
  amount: number;
  status: 'Pending' | 'Active' | 'Cancelled' | 'Used';
  items: string;
  created_at: string;
}

const LPOPage = () => {
  const [lpos, setLpos] = useState<LPO[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newLPO, setNewLPO] = useState({
    lpo_number: '',
    supplier_id: 0,
    amount: 0,
    status: 'Active' as const
  });
  const [actionState, setActionState] = useState({
    showConfirmDialog: false,
    actionType: '',
    lpoId: 0
  });

  // Fetch LPOs and suppliers from Supabase
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
        
        // Format LPOs with supplier name
        const formattedLPOs = (lpoData || []).map(lpo => ({
          ...lpo,
          supplier_name: lpo.suppliers?.name || 'Unknown',
          status: lpo.status || 'Pending'
        }));
        
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
      const { error } = await supabase
        .from('purchase_lpo')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setLpos(lpos.filter(lpo => lpo.id !== id));
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
          amount: newLPO.amount,
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
          supplier_name: data[0].suppliers?.name || 'Unknown'
        };
        
        setLpos([...lpos, createdLPO]);
        setIsCreateModalOpen(false);
        setNewLPO({
          lpo_number: '',
          supplier_id: 0,
          amount: 0,
          status: 'Active'
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create LPO');
      console.error('Error creating LPO:', err);
    }
  };

  if (loading) return <div className="flex-1 ml-16 p-6 flex items-center justify-center">
    <div className="animate-pulse flex space-x-2 items-center mt-50">
      <div className="h-2 w-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
      <div className="h-2 w-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
      <div className="h-2 w-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      <span className="ml-2 text-green-500 font-large">LPOs Loading...</span>
    </div>
  </div>;
  
  if (error) return <div className="flex-1 ml-16 p-6 flex items-center justify-center text-red-500 mt-50 font-large">Error: {error}</div>;

  return (
    <div className="flex text-white mt-10">
      <Sidebar />
      <div className="flex-1 ml-16 p-6">
        <Navbar />
        <h1 className="text-3xl font-bold mb-6">Local Purchase Orders</h1>
        
        {/* Add New LPO Button */}
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg mb-6 hover:bg-blue-600 transition-colors"
        >
          Create New LPO
        </button>

        {/* Create LPO Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md text-black">
              <h2 className="text-xl font-semibold mb-4">Create New LPO</h2>
              <form onSubmit={createLPO}>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      LPO Number *
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg"
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
                      className="w-full p-2 border rounded-lg"
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
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Amount (UGX)
                    </label>
                    <input
                      type="number"
                      className="w-full p-2 border rounded-lg"
                      value={newLPO.amount || ''}
                      onChange={(e) => setNewLPO({...newLPO, amount: Number(e.target.value)})}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
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
              <h2 className="text-xl font-semibold mb-4">Confirm Action</h2>
              <p className="mb-6">
                {actionState.actionType === 'confirm' && 'Are you sure you want to mark this LPO as Used?'}
                {actionState.actionType === 'cancel' && 'Are you sure you want to cancel this LPO?'}
                {actionState.actionType === 'delete' && 'Are you sure you want to delete this LPO? This action cannot be undone.'}
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={hideConfirmation}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmedAction}
                  className={`px-4 py-2 rounded-lg text-white ${
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
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 text-black">
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-3 px-4 text-left">LPO Number</th>
                  <th className="py-3 px-4 text-left">Supplier</th>
                  <th className="py-3 px-4 text-left">Date</th>
                  <th className="py-3 px-4 text-left">Amount</th>
                  <th className="py-3 px-4 text-left">Status</th>
                  <th className="py-3 px-4 text-left">Items</th>
                  <th className="py-3 px-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lpos.map((lpo) => (
                  <tr key={lpo.id} className="border-b">
                    <td className="py-3 px-4">{lpo.lpo_number}</td>
                    <td className="py-3 px-4">{lpo.supplier_name}</td>
                    <td className="py-3 px-4">{new Date(lpo.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-4">UGX {lpo.amount?.toLocaleString() || '0'}</td>
                    <td className="py-3 px-4">
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
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Link 
                        href={`/lpo-items/${lpo.id}`}
                        className="text-blue-500 hover:text-blue-700 hover:underline"
                      >
                        View Items
                      </Link>
                    </td>
                    <td className="py-3 px-4 space-x-2">
                      {lpo.status === 'Active' && (
                        <button
                          onClick={() => showConfirmation('confirm', lpo.id)}
                          className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-sm"
                        >
                          Confirm
                        </button>
                      )}
                      {lpo.status !== 'Cancelled' && lpo.status !== 'Used' && (
                        <button
                          onClick={() => showConfirmation('cancel', lpo.id)}
                          className="bg-orange-500 text-white px-3 py-1 rounded hover:bg-orange-600 text-sm"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        onClick={() => showConfirmation('delete', lpo.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LPOPage;