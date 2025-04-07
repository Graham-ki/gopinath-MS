'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../../inventory/components/navbar';
import Sidebar from '../../inventory/components/sidebar';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  FiArrowLeft, FiPlus, FiX, FiCheck, FiAlertCircle,
  FiFileText, FiDollarSign, FiCalendar, FiEye,
  FiTruck, FiPackage, FiClipboard, FiEdit2,
  FiClock, FiUser, FiMessageSquare, FiSearch, FiLoader, FiRefreshCw
} from 'react-icons/fi';

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
  created_at: string;
  receiving_date?: string;
  quantity_received?: number;
  quantity_available?: number;
  is_approved?: boolean;
  approved_by?: string;
  approved_at?: string;
  approval_comment?: string;
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

interface NewStockItem {
  name: string;
  quantity: number;
  cost: number;
}

const LPOItemsPage = () => {
  const params = useParams();
  const lpoId = Number(params?.id);
  const [lpo, setLpo] = useState<LPO | null>(null);
  const [items, setItems] = useState<LPOItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>('');
  const [newStockItem, setNewStockItem] = useState<NewStockItem>({
    name: '',
    quantity: 0,
    cost: 0
  });
  const [approvingItemId, setApprovingItemId] = useState<number | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [currentApprovalItem, setCurrentApprovalItem] = useState<LPOItem | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedItemGroup, setSelectedItemGroup] = useState<LPOItem[]>([]);
  const [existingItemNames, setExistingItemNames] = useState<string[]>([]);
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [filteredItemNames, setFilteredItemNames] = useState<string[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);

  // Calculate total amount from items
  const calculateTotalAmount = useCallback((items: LPOItem[]) => {
    return items.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
  }, []);

  // Fetch existing item names
  const fetchExistingItemNames = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('stock_items')
        .select('name')
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      const uniqueNames = Array.from(new Set(data.map(item => item.name)));
      setExistingItemNames(uniqueNames);
      setFilteredItemNames(uniqueNames);
    } catch (err) {
      console.error('Error fetching existing item names:', err);
    }
  }, []);

  // Fetch LPO and its items from stock_items table
  const fetchData = useCallback(async () => {
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
  
      // 3. Fetch items associated with this LPO
      const { data: itemsData, error: itemsError } = await supabase
        .from('stock_items')
        .select(`
          id,
          name,
          quantity,
          cost,
          grn_number,
          lpo_id,
          quantity_received,
          quantity_available,
          receiving_date,
          created_at,
          is_approved,
          approved_by,
          approved_at,
          approval_comment
        `)
        .eq('lpo_id', lpoId);
      
      if (itemsError) throw itemsError;
      
      // Format items with totals
      const formattedItems = itemsData?.map(item => ({
        ...item,
        lpo_id: lpoId,
        total: item.quantity * item.cost,
        quantity_received: item.quantity_received || 0,
        is_approved: item.is_approved || false,
        approval_comment: item.approval_comment || ''
      })) || [];
      
      // Calculate total amount from items
      const calculatedAmount = calculateTotalAmount(formattedItems);
      
      // Format LPO with supplier name and calculated amount
      const formattedLPO = {
        ...lpoData,
        supplier_name: supplierName,
        created_at: lpoData.created_at,
        lpo_number: lpoData.lpo_number || 'Unknown',
        amount: calculatedAmount
      };
      
      setLpo(formattedLPO);
      setItems(formattedItems);
      setTotalAmount(calculatedAmount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      console.error('Error fetching LPO items:', err);
    } finally {
      setLoading(false);
    }
  }, [lpoId, calculateTotalAmount]);

  // Get current user on component mount
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) throw authError;
        
        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('name')
            .eq('id', user.id)
            .single();
          
          if (profileError) {
            console.warn('Profile not found, using email instead:', profileError.message);
            setCurrentUser(user.email || 'System');
          } else {
            setCurrentUser(profile?.name || user.email || 'System');
          }
        } else {
          setCurrentUser('System');
        }
      } catch (err) {
        console.error('Error getting current user:', err);
        setCurrentUser('System');
      }
    };
    
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (isNaN(lpoId)) {
      setError('Invalid LPO ID');
      setLoading(false);
      return;
    }
  }, [lpoId]);

  // Main data fetching effect
  useEffect(() => {
    if (lpoId && !isNaN(lpoId)) {
      fetchData();
      fetchExistingItemNames();
    }
  }, [lpoId, fetchData, fetchExistingItemNames]);

  // Handle item name input changes
  const handleItemNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewStockItem({...newStockItem, name: value});
    
    if (value.length > 0) {
      const filtered = existingItemNames.filter(name => 
        name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredItemNames(filtered);
      setShowItemDropdown(true);
    } else {
      setFilteredItemNames(existingItemNames);
      setShowItemDropdown(false);
    }
  };

  // Select an item from dropdown
  const selectItemName = (name: string) => {
    setNewStockItem({...newStockItem, name});
    setShowItemDropdown(false);
  };

  // Group items by name and calculate totals
  const getSummarizedItems = useCallback(() => {
    const grouped: Record<string, {
      name: string;
      totalQuantity: number;
      totalReceived: number;
      totalAvailable: number;
      totalCost: number;
      items: LPOItem[];
    }> = {};
    
    items.forEach(item => {
      if (!grouped[item.name]) {
        grouped[item.name] = {
          name: item.name,
          totalQuantity: 0,
          totalAvailable: 0,
          totalReceived: 0,
          totalCost: 0,
          items: []
        };
      }
      grouped[item.name].totalQuantity += item.quantity;
      grouped[item.name].totalReceived += item.quantity_received || 0;
      grouped[item.name].totalCost += item.total;
      grouped[item.name].totalAvailable += item.quantity_available || 0;
      grouped[item.name].items.push(item);
    });
    
    return Object.values(grouped);
  }, [items]);

  // Add new stock item
  const addStockItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!lpo || !lpo.supplier_id) {
        throw new Error('LPO or supplier information missing');
      }

      const { error } = await supabase
        .from('stock_items')
        .insert([{
          name: newStockItem.name,
          grn_number: 0,
          lpo_id: lpoId,
          quantity: newStockItem.quantity,
          cost: newStockItem.cost,
          supplier_id: lpo.supplier_id,
          quantity_received: 0,
          is_approved: false,
          approval_comment: ''
        }])
        .select();

      if (error) throw error;

      // Create system log for stock in
      const { data: logData, error: logError } = await supabase
        .from('system_logs')
        .insert([{
          action: 'Stock In',
          details: `Added ${newStockItem.quantity} units of ${newStockItem.name} to inventory (LPO: ${lpo.lpo_number})`,
          created_by: currentUser
        }])
        .select();
      console.log('System log data:', logData);
      if (logError) throw logError;

      // Refresh data
      await fetchData();
      await fetchExistingItemNames();

      // Reset form
      setNewStockItem({
        name: '',
        quantity: 0,
        cost: 0
      });

      setIsAddStockModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add stock item');
      console.error('Error adding stock item:', err);
    }
  };

  // Start approval process
  const startApprovalProcess = (item: LPOItem) => {
    setCurrentApprovalItem(item);
    if (item.quantity !== item.quantity_received) {
      setApprovalComment(`Quantities don't match (Ordered: ${item.quantity}, Received: ${item.quantity_received})`);
    } else {
      setApprovalComment('Quantities match - Item approved');
    }
    setShowApprovalDialog(true);
  };

  // Approve item
  const approveItem = async (itemId: number, comment: string) => {
    try {
      setApprovingItemId(itemId);
      
      const item = items.find(i => i.id === itemId);
      if (!item) throw new Error('Item not found');

      // Only approve if quantities match
      const shouldApprove = item.quantity === item.quantity_received;
      
      const { error } = await supabase
        .from('stock_items')
        .update({
          is_approved: shouldApprove,
          approved_by: shouldApprove ? currentUser : null,
          approved_at: shouldApprove ? new Date().toISOString() : null,
          approval_comment: comment
        })
        .eq('id', itemId);

      if (error) throw error;

      // Create system log
      const { data: logData, error: logError } = await supabase
        .from('system_logs')
        .insert([{
          action: shouldApprove ? 'Item Approval' : 'Item Comment',
          details: shouldApprove 
            ? `Approved ${item.quantity_received || 0} units of ${item.name} (LPO: ${lpo?.lpo_number}). ${comment}`
            : `Added comment to ${item.name} (LPO: ${lpo?.lpo_number}): ${comment}`,
          created_by: currentUser
        }])
        .select();
        console.log('System log data:', logData);
      if (logError) throw logError;

      // Refresh data
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process item');
      console.error('Error processing item:', err);
    } finally {
      setApprovingItemId(null);
      setShowApprovalDialog(false);
      setApprovalComment('');
      setCurrentApprovalItem(null);
    }
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
          <FiPackage className="animate-spin" />
          <span>Loading LPO items...</span>
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
          className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors flex items-center mx-auto"
        >
          <FiRefreshCw className="mr-2" />
          Try Again
        </button>
      </div>
    </div>
  );

  if (!lpo) return (
    <div className="flex-1 ml-16 p-6 flex items-center justify-center">
      <div className="bg-yellow-50 p-6 rounded-lg max-w-md text-center">
        <div className="flex justify-center text-yellow-500 mb-4">
          <FiAlertCircle size={32} />
        </div>
        <h3 className="text-lg font-medium text-yellow-800 mb-2">LPO Not Found</h3>
        <p className="text-yellow-600">The requested purchase order could not be found</p>
        <Link 
          href="/lpos" 
          className="mt-4 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 transition-colors inline-flex items-center"
        >
          <FiArrowLeft className="mr-2" />
          Back to LPOs
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex text-gray-900">
      <Sidebar />
      <div className="flex-1 ml-16 p-6">
        <Navbar />
        
        {/* Back button */}
        <Link 
          href="/lpos"
          className="inline-flex items-center hover:text-blue-800 mb-6 transition-colors text-white mt-10"
        >
          <FiArrowLeft className="mr-2" />
          Back to All LPOs
        </Link>
        
        {/* LPO Header Card */}
        <div className="mb-8 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                <FiFileText className="mr-3 text-blue-500" />
                LPO #{lpo.lpo_number}
              </h1>
            </div>
            {lpo.status === 'Active' && (
              <button
                onClick={() => setIsAddStockModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
              >
                <FiPlus className="mr-2" />
                Add Item
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-blue-50 p-2 rounded-lg mr-3">
                  <FiTruck className="text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Supplier</p>
                  <p className="font-medium text-gray-800">{lpo.supplier_name}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-blue-50 p-2 rounded-lg mr-3">
                  <FiCalendar className="text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Order Date</p>
                  <p className="font-medium text-gray-800">
                    {new Date(lpo.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-blue-50 p-2 rounded-lg mr-3">
                  <FiDollarSign className="text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="font-medium text-gray-800">
                    UGX {totalAmount.toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-blue-50 p-2 rounded-lg mr-3">
                  <FiClipboard className="text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <div>
                    {lpo.status === 'Cancelled' ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                        <FiX className="mr-1" />
                        Cancelled
                      </span>
                    ) : lpo.status === 'Active' ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <FiCheck className="mr-1" />
                        Active
                      </span>
                    ) : lpo.status === 'Used' ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                        <FiCheck className="mr-1" />
                        Used
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                        <FiClock className="mr-1" />
                        Unknown
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <FiPackage className="mr-2 text-gray-500" />
              Order Items
            </h2>
          </div>
          
          {items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center">
                        <FiPackage className="mr-2" />
                        Item Name
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center">
                        <FiPackage className="mr-2" />
                        Available Stock
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getSummarizedItems().map((group) => (
                    <tr key={group.name} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        {group.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {group.totalAvailable} units
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedItemGroup(group.items);
                            setIsDetailsModalOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          <FiEye className="mr-1" />
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FiPackage className="text-gray-400 text-3xl" />
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-1">No items received yet</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Add items received against this purchase order to get started.
              </p>
              {lpo.status === 'Active' && (
                <button
                  onClick={() => setIsAddStockModalOpen(true)}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center mx-auto transition-colors"
                >
                  <FiPlus className="mr-2" />
                  Add First Item
                </button>
              )}
            </div>
          )}
        </div>

        {/* Details Modal */}
        {isDetailsModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                  <FiPackage className="mr-2 text-blue-500" />
                  {selectedItemGroup[0]?.name} - Detailed Records
                </h2>
                <button
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <FiX size={24} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        GRN Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ordered
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Received
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Received On
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Cost
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedItemGroup.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.grn_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(item.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.quantity_received}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.receiving_date ? (
                            new Date(item.receiving_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          UGX {item.cost.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          UGX {item.total.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.is_approved ? (
                            <div className="flex flex-col">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mb-1">
                                <FiCheck className="mr-1" />
                                Approved
                              </span>
                              {item.approval_comment && (
                                <span className="text-xs text-gray-500 flex items-start">
                                  <FiMessageSquare className="mr-1 mt-0.5 flex-shrink-0" />
                                  {item.approval_comment}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <FiClock className="mr-1" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {!item.is_approved ? (
                            <button
                              onClick={() => startApprovalProcess(item)}
                              disabled={approvingItemId === item.id}
                              className={`px-3 py-1 rounded text-sm flex items-center ${
                                approvingItemId === item.id
                                  ? 'bg-gray-100 text-gray-600'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              {approvingItemId === item.id ? (
                                <>
                                  <FiLoader className="animate-spin mr-1" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <FiEdit2 className="mr-1" />
                                  Review
                                </>
                              )}
                            </button>
                          ) : (
                            <div className="text-xs text-gray-500">
                              <div className="flex items-center">
                                <FiUser className="mr-1" />
                                {item.approved_by}
                              </div>
                              <div className="flex items-center mt-1">
                                <FiCalendar className="mr-1" />
                                {item.approved_at && new Date(item.approved_at).toLocaleString()}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Approval Dialog */}
        {showApprovalDialog && currentApprovalItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  {currentApprovalItem.quantity === currentApprovalItem.quantity_received 
                    ? 'Confirm Approval' 
                    : 'Add Comment'}
                </h2>
                <button
                  onClick={() => {
                    setShowApprovalDialog(false);
                    setApprovalComment('');
                    setCurrentApprovalItem(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <FiX size={24} />
                </button>
              </div>
              
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                {currentApprovalItem.quantity === currentApprovalItem.quantity_received ? (
                  <div className="flex items-center text-green-600">
                    <FiCheck className="mr-2 text-xl" />
                    <p className="font-medium">
                      Quantities match (Ordered: {currentApprovalItem.quantity}, Received: {currentApprovalItem.quantity_received})
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center text-red-600">
                    <FiAlertCircle className="mr-2 text-xl" />
                    <p className="font-medium">
                      Quantities don&apos;t match (Ordered: {currentApprovalItem.quantity}, Received: {currentApprovalItem.quantity_received})
                    </p>
                  </div>
                )}
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {currentApprovalItem.quantity === currentApprovalItem.quantity_received 
                    ? 'Approval Comment' 
                    : 'Comment'}
                </label>
                <textarea
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  placeholder={
                    currentApprovalItem.quantity === currentApprovalItem.quantity_received 
                      ? 'Enter approval comment (optional)...' 
                      : 'Enter comment...'
                  }
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowApprovalDialog(false);
                    setApprovalComment('');
                    setCurrentApprovalItem(null);
                  }}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    approveItem(currentApprovalItem.id, approvalComment);
                  }}
                  className={
                    currentApprovalItem.quantity === currentApprovalItem.quantity_received
                      ? 'bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center'
                      : 'bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center'
                  }
                >
                  {currentApprovalItem.quantity === currentApprovalItem.quantity_received
                    ? (
                      <>
                        <FiCheck className="mr-2" />
                        Approve
                      </>
                    )
                    : (
                      <>
                        <FiMessageSquare className="mr-2" />
                        Send Comment
                      </>
                    )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Stock Modal */}
        {isAddStockModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Add New Stock Item</h2>
                <button
                  onClick={() => {
                    setIsAddStockModalOpen(false);
                    setShowItemDropdown(false);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <FiX size={24} />
                </button>
              </div>
              
              <p className="text-sm text-gray-500 mb-6">
                Add items received for LPO: <span className="font-medium">#{lpo.lpo_number}</span>
              </p>
              
              <form onSubmit={addStockItem}>
                <div className="space-y-4">
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Start typing to search or enter new item"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 pr-10"
                        required
                        value={newStockItem.name}
                        onChange={handleItemNameChange}
                        onFocus={() => setShowItemDropdown(true)}
                      />
                      <FiSearch className="absolute right-3 top-3.5 text-gray-400" />
                    </div>
                    {showItemDropdown && filteredItemNames.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                        {filteredItemNames.map((name) => (
                          <div
                            key={name}
                            className="p-3 hover:bg-gray-100 cursor-pointer flex items-center"
                            onClick={() => selectItemName(name)}
                          >
                            <FiPackage className="mr-2 text-gray-500" />
                            {name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity Ordered
                    </label>
                    <input
                      type="number"
                      placeholder="Enter quantity"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      required
                      min="1"
                      value={newStockItem.quantity || ''}
                      onChange={(e) => setNewStockItem({...newStockItem, quantity: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Cost (UGX)
                    </label>
                    <input
                      type="number"
                      placeholder="Enter cost price"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      required
                      min="0"
                      step="0.01"
                      value={newStockItem.cost || ''}
                      onChange={(e) => setNewStockItem({...newStockItem, cost: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddStockModalOpen(false);
                      setShowItemDropdown(false);
                    }}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
                  >
                    <FiPlus className="mr-2" />
                    Add Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LPOItemsPage;