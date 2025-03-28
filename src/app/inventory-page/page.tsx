'use client';
import React, { useState, useEffect } from 'react';
import Navbar from '../inventory/components/navbar';
import Sidebar from '../inventory/components/sidebar';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';


// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface StockItem {
  id: number;
  name: string;
  lpo_number: string;
  grn_number: string;
  quantity: number;
  cost: number;
  supplier_id: number;
  supplier_name: string;
  created_at: string;
  lpo_id: number;
  purchase_lpo?: {
    lpo_number: string;
  };
  suppliers?: {
    name: string;
  };
}

interface StockOutRecord {
  id: number;
  stock_id: number;
  name: string;
  quantity: number;
  takenby: string;
  issuedby: string;
  created_at: string;
}

interface Supplier {
  id: number;
  name: string;
  contact: string;
}

interface LPO {
  id: number;
  lpo_number: string;
  status: string;
  supplier_id: number;
  suppliers: {
    name: string;
  } | null | undefined | Array<{ name: string }>;
}

interface SystemLog {
  id: number;
  action: string;
  details: string;
  created_by: string;
  created_at: string;
}

const InventoryModule = () => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stockOutRecords, setStockOutRecords] = useState<StockOutRecord[]>([]);
  const [, setSuppliers] = useState<Supplier[]>([]);
  const [activeLPOs, setActiveLPOs] = useState<LPO[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string>('');

  // Modal states
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [isAddStockOutModalOpen, setIsAddStockOutModalOpen] = useState(false);

  // Form state for new stock item
  const [newStockItem, setNewStockItem] = useState<{
    name: string;
    grn_number: string;
    lpo_id: number;
    quantity: number;
    cost: number;
    supplier_id: number;
    supplier_name: string;
  }>({
    name: '',
    grn_number: '',
    lpo_id: 0,
    quantity: 0,
    cost: 0,
    supplier_id: 0,
    supplier_name: ''
  });

  // Toggle between Stock In and Stock Out
  const [activeTab, setActiveTab] = useState<'stockIn' | 'stockOut'>('stockIn');

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

  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch stock items with supplier and LPO info
        const { data: stockData, error: stockError } = await supabase
          .from('stock_items')
          .select(`*, suppliers (name), purchase_lpo (lpo_number)`);
        
        if (stockError) throw stockError;
        
        const formattedStockItems = stockData.map(item => ({
          ...item,
          supplier_name: item.suppliers?.name || 'Unknown',
          lpo_number: item.purchase_lpo?.lpo_number || ''
        }));
        setStockItems(formattedStockItems);

        // Fetch stock out records
        const { data: stockOutData, error: stockOutError } = await supabase
          .from('stock_out')
          .select('*');
        
        if (stockOutError) throw stockOutError;
        setStockOutRecords(stockOutData);

        // Fetch suppliers
        const { data: supplierData, error: supplierError } = await supabase
          .from('suppliers')
          .select('*');
        
        if (supplierError) throw supplierError;
        setSuppliers(supplierData);

        // Fetch active LPOs with supplier info
        const { data: lpoData, error: lpoError } = await supabase
          .from('purchase_lpo')
          .select(`
            id, 
            lpo_number, 
            status,
            supplier_id,
            suppliers (name)
          `)
          .eq('status', 'Active');

        if (lpoError) throw lpoError;

        const formattedLPOs = lpoData.map(lpo => ({
          id: lpo.id,
          lpo_number: lpo.lpo_number,
          status: lpo.status,
          supplier_id: lpo.supplier_id,
          supplier_name: Array.isArray(lpo.suppliers) ? lpo.suppliers[0]?.name || 'Unknown' : (lpo.suppliers as { name: string } | null)?.name ?? 'Unknown',
          suppliers: Array.isArray(lpo.suppliers) ? lpo.suppliers[0] || null : lpo.suppliers || null
        }));

        setActiveLPOs(formattedLPOs);

        // Fetch system logs
        const { data: logsData, error: logsError } = await supabase
          .from('system_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (logsError) throw logsError;
        setSystemLogs(logsData || []);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle LPO selection change
  const handleLPOChange = (lpoId: number) => {
    const selectedLPO = activeLPOs.find(lpo => lpo.id === lpoId);
    if (selectedLPO) {
      setNewStockItem({
        ...newStockItem,
        lpo_id: selectedLPO.id,
        supplier_id: selectedLPO.supplier_id,
        supplier_name: Array.isArray(selectedLPO.suppliers) 
          ? selectedLPO.suppliers[0]?.name || 'Unknown' 
          : selectedLPO.suppliers?.name || 'Unknown'
      });
    } else {
      setNewStockItem({
        ...newStockItem,
        lpo_id: 0,
        supplier_id: 0,
        supplier_name: ''
      });
    }
  };

  // Add new stock item
  const addStockItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('stock_items')
        .insert([{
          name: newStockItem.name,
          grn_number: newStockItem.grn_number,
          lpo_id: newStockItem.lpo_id,
          quantity: newStockItem.quantity,
          cost: newStockItem.cost,
          supplier_id: newStockItem.supplier_id
        }])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        const { data: completeItem, error: fetchError } = await supabase
          .from('stock_items')
          .select(`
            *,
            suppliers (name),
            purchase_lpo (lpo_number)
          `)
          .eq('id', data[0].id)
          .single();

        if (fetchError) throw fetchError;

        const addedItem = {
          ...completeItem,
          supplier_name: completeItem.suppliers?.name || 'Unknown',
          lpo_number: completeItem.purchase_lpo?.lpo_number || ''
        };
        setStockItems([...stockItems, addedItem]);
      }

      setNewStockItem({
        name: '',
        grn_number: '',
        lpo_id: 0,
        quantity: 0,
        cost: 0,
        supplier_id: 0,
        supplier_name: ''
      });
       // Create system log for stock out
       const { data: logData, error: logError } = await supabase
       .from('system_logs')
       .insert([{
         action: 'Stock In',
         details: `Added ${newStockItem.quantity} units of ${newStockItem.name} to inventory`,
         created_by: currentUser
       }])
       .select();
     
     if (logError) throw logError;

     if (logData && logData.length > 0) {
       setSystemLogs([logData[0], ...systemLogs]);
     }
      setIsAddStockModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add stock item');
      console.error('Error adding stock item:', err);
    }
  };

  // Add stock out record
  const addStockOutRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const productId = parseInt(form.productId.value);
    const quantity = parseInt(form.quantity.value);
    
    try {
      // Get the product being issued out
      const product = stockItems.find(item => item.id === productId);
      if (!product) throw new Error('Product not found');
      
      if (product.quantity < quantity) {
        alert('Stock is insufficient for this item');
      }
      
      // Add stock out record
      const { data, error } = await supabase
        .from('stock_out')
        .insert([{
          stock_id: productId,
          name: product.name,
          quantity: quantity,
          takenby: form.takenBy.value,
          issuedby: form.issuedBy.value,
          created_at: new Date().toISOString(),
        }])
        .select();
      
      if (error) throw error;
      
      // Update stock quantity
      const { error: updateError } = await supabase
        .from('stock_items')
        .update({ quantity: product.quantity - quantity })
        .eq('id', productId);
      
      if (updateError) throw updateError;
      
      if (data && data.length > 0) {
        setStockOutRecords([...stockOutRecords, data[0]]);
        
        // Update local stock items state
        setStockItems(stockItems.map(item => 
          item.id === productId 
            ? { ...item, quantity: item.quantity - quantity } 
            : item
        ));

        // Create system log for stock out
        const { data: logData, error: logError } = await supabase
          .from('system_logs')
          .insert([{
            action: 'Stock Out',
            details: `Issued ${quantity} units of ${product.name} to ${form.takenBy.value}`,
            created_by: currentUser
          }])
          .select();
        
        if (logError) throw logError;

        if (logData && logData.length > 0) {
          setSystemLogs([logData[0], ...systemLogs]);
        }
        
        setIsAddStockOutModalOpen(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add stock out record');
      console.error('Error adding stock out record:', err);
    }
  };

  // Function to download Stock In data as Excel
  const downloadStockInData = () => {
    const data = stockItems.map(item => ({
      'Name': item.name,
      'LPO Number': item.lpo_number,
      'GRN Number': item.grn_number,
      'Quantity': item.quantity,
      'Cost': `UGX ${item.cost}`,
      'Supplier': item.supplier_name,
      'Date Added': new Date(item.created_at).toLocaleDateString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'StockIn');
    XLSX.writeFile(workbook, 'Stock_In_Data.xlsx');
  };

  // Function to download Stock Out data as Excel
  const downloadStockOutData = () => {
    const data = stockOutRecords.map(record => ({
      'Product Name': record.name,
      'Quantity': record.quantity,
      'Taken By': record.takenby,
      'Issued By': record.issuedby,
      'Date': new Date(record.created_at).toLocaleDateString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'StockOut');
    XLSX.writeFile(workbook, 'Stock_Out_Data.xlsx');
  };

  // Get low stock items (quantity ≤ 5)
  const lowStockItems = stockItems.filter(item => item.quantity <= 5).slice(0, 5);

  if (loading) return <div className="flex-1 ml-16 p-6 flex items-center justify-center">
    <div className="animate-pulse flex space-x-2 items-center mt-50">
      <div className="h-2 w-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
      <div className="h-2 w-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
      <div className="h-2 w-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      <span className="ml-2 text-green-500 font-medium">Loading...</span>
    </div>
  </div>;

  if (error) return <div className="flex-1 ml-16 p-6 text-red-500">Error: {error}</div>;

  return (
    <div className="flex text-white mt-10">
      <Sidebar />
      <div className="flex-1 ml-16 p-6">
        <Navbar />
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
            Inventory Management
          </h1>
          <p className="text-gray-500 text-center max-w-md">
            Track, manage, and optimize your inventory in real-time
          </p>
          <div className="mt-4 w-16 h-1 bg-blue-500 rounded-full"></div>
        </div>

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8 text-black">
            <h2 className="text-xl font-semibold mb-4">Low Stock Alert</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-3 px-4 text-left">Name</th>
                    <th className="py-3 px-4 text-left">LPO</th>
                    <th className="py-3 px-4 text-left">Stock remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-3 px-4 text-red-500">{item.name}</td>
                      <td className="py-3 px-4 text-red-500">{item.lpo_number}</td>
                      <td className="py-3 px-4 text-red-500">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-right">
              <button 
                className="text-blue-500 hover:text-blue-700 font-medium"
                onClick={() => setActiveTab('stockIn')}
              >
                View Full List →
              </button>
            </div>
          </div>
        )}

        {/* Toggle Buttons for Stock In and Stock Out */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('stockIn')}
              className={`px-4 py-2 rounded-lg ${
                activeTab === 'stockIn'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Stock In
            </button>
            <button
              onClick={() => setActiveTab('stockOut')}
              className={`px-4 py-2 rounded-lg ${
                activeTab === 'stockOut'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Stock Out
            </button>
          </div>
          <div className="flex space-x-4">
            {activeTab === 'stockIn' && (
              <button
                onClick={downloadStockInData}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Export Stock In
              </button>
            )}
            {activeTab === 'stockOut' && (
              <button
                onClick={downloadStockOutData}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Export Stock Out
              </button>
            )}
          </div>
        </div>

        {/* Stock In List */}
        {activeTab === 'stockIn' && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8 text-black">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Stock In</h2>
              <button
                onClick={() => setIsAddStockModalOpen(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
              >
                Add Stock
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-3 px-4 text-left">Name</th>
                    <th className="py-3 px-4 text-left">LPO</th>
                    <th className="py-3 px-4 text-left">GRN</th>
                    <th className="py-3 px-4 text-left">Quantity</th>
                    <th className="py-3 px-4 text-left">Cost</th>
                    <th className="py-3 px-4 text-left">Supplier</th>
                    <th className="py-3 px-4 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stockItems.map((item) => (
                    <tr 
                      key={item.id} 
                      className={`border-b ${item.quantity <= 5 ? 'bg-red-50' : ''}`}
                    >
                      <td className="py-3 px-4">{item.name}</td>
                      <td className="py-3 px-4">{item.lpo_number}</td>
                      <td className="py-3 px-4">{item.grn_number}</td>
                      <td className={`py-3 px-4 ${item.quantity <= 5 ? 'text-red-500 font-bold' : ''}`}>
                        {item.quantity}
                      </td>
                      <td className="py-3 px-4">UGX {item.cost.toLocaleString()}</td>
                      <td className="py-3 px-4">{item.supplier_name}</td>
                      <td className="py-3 px-4">{new Date(item.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Stock Out List */}
        {activeTab === 'stockOut' && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8 text-black">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Stock Out</h2>
              <button
                onClick={() => setIsAddStockOutModalOpen(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
              >
                Add Stock Out
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-3 px-4 text-left">Name</th>
                    <th className="py-3 px-4 text-left">Quantity</th>
                    <th className="py-3 px-4 text-left">Taken By</th>
                    <th className="py-3 px-4 text-left">Issued By</th>
                    <th className="py-3 px-4 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stockOutRecords.map((record) => (
                    <tr key={record.id} className="border-b">
                      <td className="py-3 px-4">{record.name}</td>
                      <td className="py-3 px-4">{record.quantity}</td>
                      <td className="py-3 px-4">{record.takenby}</td>
                      <td className="py-3 px-4">{record.issuedby}</td>
                      <td className="py-3 px-4">{new Date(record.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* Add Stock Modal */}
        {isAddStockModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto text-black">
              <h2 className="text-xl font-semibold mb-4">Add New Stock</h2>
              <h6 className="text-sm text-gray-500 mb-4">Item once added cannot be removed/changed!</h6>
              <form onSubmit={addStockItem}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                    <input
                      type="text"
                      placeholder="Enter item name"
                      className="w-full p-2 border rounded-lg"
                      required
                      value={newStockItem.name}
                      onChange={(e) => setNewStockItem({...newStockItem, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">GRN Number</label>
                    <input
                      type="text"
                      placeholder="Enter GRN number"
                      className="w-full p-2 border rounded-lg"
                      required
                      value={newStockItem.grn_number}
                      onChange={(e) => setNewStockItem({...newStockItem, grn_number: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">LPO</label>
                    <select
                      className="w-full p-2 border rounded-lg"
                      required
                      value={newStockItem.lpo_id}
                      onChange={(e) => handleLPOChange(parseInt(e.target.value))}
                    >
                      <option value="">Select LPO</option>
                      {activeLPOs.map(lpo => (
                        <option key={lpo.id} value={lpo.id}>
                          {lpo.lpo_number}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg bg-gray-100"
                      readOnly
                      value={newStockItem.supplier_name || 'Select LPO to auto-fill supplier'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      placeholder="Enter quantity"
                      className="w-full p-2 border rounded-lg"
                      required
                      min="1"
                      value={newStockItem.quantity}
                      onChange={(e) => setNewStockItem({...newStockItem, quantity: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (UGX)</label>
                    <input
                      type="number"
                      placeholder="Enter cost price"
                      className="w-full p-2 border rounded-lg"
                      required
                      min="0"
                      step="0.01"
                      value={newStockItem.cost}
                      onChange={(e) => setNewStockItem({...newStockItem, cost: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setIsAddStockModalOpen(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                  >
                    Add Stock
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Stock Out Modal */}
        {isAddStockOutModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-96 text-black">
              <h2 className="text-xl font-semibold mb-4">Add Stock Out Record</h2>
              <h6 className="text-sm text-gray-500 mb-4">Stock once added cannot be removed/changed!</h6>
              <form onSubmit={addStockOutRecord}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                    <select
                      name="productId"
                      className="w-full p-2 border rounded-lg"
                      required
                    >
                      <option value="">Select Product</option>
                      {stockItems.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} (Stock: {item.quantity})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      name="quantity"
                      placeholder="Enter quantity"
                      className="w-full p-2 border rounded-lg"
                      required
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Taken By</label>
                    <input
                      type="text"
                      name="takenBy"
                      placeholder="Enter recipient name"
                      className="w-full p-2 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Issued By</label>
                    <input
                      type="text"
                      name="issuedBy"
                      placeholder="Enter issuer name"
                      className="w-full p-2 border rounded-lg"
                      required
                      value={currentUser}
                      readOnly
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setIsAddStockOutModalOpen(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                  >
                    Record Stock Out
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

export default InventoryModule; 