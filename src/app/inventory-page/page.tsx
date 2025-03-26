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

const InventoryModule = () => {
  // State for stock items
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stockOutRecords, setStockOutRecords] = useState<StockOutRecord[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected items for details view
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [itemToEdit, setItemToEdit] = useState<StockItem | null>(null);

  // Modal states
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isAddStockOutModalOpen, setIsAddStockOutModalOpen] = useState(false);

  // Form state for new item
  const [newItem, setNewItem] = useState({
    lpo_number: '',
    supplier_id: 0,
    status: 'Active',
    amount: 0,
  });

  // Toggle between Stock In and Stock Out
  const [activeTab, setActiveTab] = useState<'stockIn' | 'stockOut'>('stockIn');

  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch stock items
        const { data: stockData, error: stockError } = await supabase
          .from('stock_items')
          .select(`
            *,
            suppliers (name)
          `);
        
        if (stockError) throw stockError;
        
        // Format stock items with supplier name
        const formattedStockItems = stockData.map(item => ({
          ...item,
          supplier_name: item.suppliers?.name || 'Unknown'
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

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Add new stock item
  const addStockItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('purchase_lpo')
        .insert([newItem])
        .select();
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const addedItem = {
          ...data[0],
          supplier_name: suppliers.find(s => s.id === newItem.supplier_id)?.name || 'Unknown'
        };
        setStockItems([...stockItems, addedItem]);
        setIsAddItemModalOpen(false);
        setNewItem({
          lpo_number: '',
          supplier_id: 0,
          status: 'Active',
          amount: 0,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
      console.error('Error adding item:', err);
    }
  };

  // Edit stock item
  const editStockItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemToEdit) return;
    
    try {
      const { data, error } = await supabase
        .from('stock_items')
        .update(itemToEdit)
        .eq('id', itemToEdit.id)
        .select();
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const updatedItem = {
          ...data[0],
          supplier_name: suppliers.find(s => s.id === itemToEdit.supplier_id)?.name || 'Unknown'
        };
        setStockItems(stockItems.map(item => 
          item.id === updatedItem.id ? updatedItem : item
        ));
        setIsEditItemModalOpen(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item');
      console.error('Error updating item:', err);
    }
  };

  // Delete stock item
  const deleteStockItem = async (id: number) => {
    try {
      const { error } = await supabase
        .from('stock_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setStockItems(stockItems.filter(item => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
      console.error('Error deleting item:', err);
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
        throw new Error('Insufficient stock');
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
          created_at: form.date.value,
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
          {/* View Full List Button */}
          <div className="mt-4 text-right">
            <button 
              className="text-blue-500 hover:text-blue-700 font-medium"
              onClick={() => setActiveTab('stockIn')}
            >
              View Full List →
            </button>
          </div>
        </div>

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
                    <th className="py-3 px-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stockItems.map((item) => (
                    <tr 
                      key={item.id} 
                      className={`border-b ${item.quantity <= 5 ? 'bg-red-500 animate-pulse' : ''}`}
                    >
                      <td className="py-3 px-4">{item.name}</td>
                      <td className="py-3 px-4">{item.lpo_number}</td>
                      <td className="py-3 px-4">{item.grn_number}</td>
                      <td className={`py-3 px-4 relative ${item.quantity <= 5 ? 'text-black-500 font-bold group' : ''}`}>
                      {item.quantity}
                      {item.quantity <= 5 && (
                        <span className="absolute invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-1                     px-2 bottom-full left-1/2 transform -translate-x-1/2 whitespace-nowrap z-10">
                          Stock is running low, please add!
                          <span className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4                     border-r-4 border-b-0 border-t-4 border-gray-800 border-solid"></span>
                        </span>
                      )}
                    </td>
                      <td className="py-3 px-4">UGX {item.cost}</td>
                      <td className="py-3 px-4">{item.supplier_name}</td>
                      <td className="py-3 px-4">{new Date(item.created_at).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => {
                            setItemToEdit(item);
                            setIsEditItemModalOpen(true);
                          }}
                          className="text-blue-500 hover:text-blue-700 mr-2"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteStockItem(item.id)}
                          className="text-red-500 hover:text-red-700 mr-2"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setIsDetailsModalOpen(true);
                          }}
                          className="text-green-500 hover:text-green-700"
                        >
                          Details
                        </button>
                      </td>
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

        {/* Add Item Modal */}
        {isAddItemModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg w-96">
              <h2 className="text-xl font-semibold mb-4">Add New LPO</h2>
              <form onSubmit={addStockItem}>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="LPO Number"
                    className="w-full p-2 border rounded-lg"
                    required
                    value={newItem.lpo_number}
                    onChange={(e) => setNewItem({...newItem, lpo_number: e.target.value})}
                  />
                  <label>LPO Amount</label>
                  <input
                    type="text"
                    placeholder="LPO amount"
                    className="w-full p-2 border rounded-lg"
                    required
                    value={newItem.amount}
                    onChange={(e) => setNewItem({...newItem, amount: parseFloat(e.target.value) || 0})}
                  />
                  <select
                    className="w-full p-2 border rounded-lg"
                    required
                    value={newItem.supplier_id}
                    onChange={(e) => setNewItem({...newItem, supplier_id: parseInt(e.target.value) || 0})}
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-6 flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setIsAddItemModalOpen(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                  >
                    Add
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Item Modal */}
        {isEditItemModalOpen && itemToEdit && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg w-96 text-black">
              <h2 className="text-xl font-semibold mb-4">Edit Stock Item</h2>
              <form onSubmit={editStockItem}>
                <div className="space-y-4">
                  <input
                    type="text"
                    className="w-full p-2 border rounded-lg"
                    required
                    value={itemToEdit.name}
                    onChange={(e) => setItemToEdit({...itemToEdit, name: e.target.value})}
                  />
                  <input
                    type="text"
                    className="w-full p-2 border rounded-lg"
                    required
                    value={itemToEdit.lpo_number}
                    onChange={(e) => setItemToEdit({...itemToEdit, lpo_number: e.target.value})}
                  />
                  <input
                    type="text"
                    className="w-full p-2 border rounded-lg"
                    required
                    value={itemToEdit.grn_number}
                    onChange={(e) => setItemToEdit({...itemToEdit, grn_number: e.target.value})}
                  />
                  <input
                    type="number"
                    className="w-full p-2 border rounded-lg"
                    required
                    min="0"
                    value={itemToEdit.quantity}
                    onChange={(e) => setItemToEdit({...itemToEdit, quantity: parseInt(e.target.value) || 0})}
                  />
                  <input
                    type="number"
                    className="w-full p-2 border rounded-lg"
                    required
                    min="0"
                    step="0.01"
                    value={itemToEdit.cost}
                    onChange={(e) => setItemToEdit({...itemToEdit, cost: parseFloat(e.target.value) || 0})}
                  />
                  <select
                    className="w-full p-2 border rounded-lg"
                    required
                    value={itemToEdit.supplier_id}
                    onChange={(e) => setItemToEdit({...itemToEdit, supplier_id: parseInt(e.target.value) || 0})}
                  >
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-6 flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setIsEditItemModalOpen(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Item Details Modal */}
        {isDetailsModalOpen && selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg w-96 text-black">
              <h2 className="text-xl font-semibold mb-4">Item Details</h2>
              <div className="space-y-4">
                <p>
                  <strong>Product Name:</strong> {selectedItem.name}
                </p>
                <p>
                  <strong>LPO Number:</strong> {selectedItem.lpo_number}
                </p>
                <p>
                  <strong>GRN Number:</strong> {selectedItem.grn_number}
                </p>
                <p>
                  <strong>Stock Quantity:</strong> {selectedItem.quantity}
                </p>
                <p>
                  <strong>Cost:</strong> UGX {selectedItem.cost.toLocaleString()}
                </p>
                <p>
                  <strong>Supplier:</strong> {selectedItem.supplier_name}
                </p>
                <h3 className="text-lg font-semibold mt-4">Stock Movements</h3>
                <p>No stock movements available.</p>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Stock Out Modal */}
        {isAddStockOutModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg w-96 text-black">
              <h2 className="text-xl font-semibold mb-4">Add Stock Out Record</h2>
              <form onSubmit={addStockOutRecord}>
                <div className="space-y-4">
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
                  <input
                    type="number"
                    name="quantity"
                    placeholder="Quantity"
                    className="w-full p-2 border rounded-lg"
                    required
                    min="1"
                  />
                  <input
                    type="text"
                    name="takenBy"
                    placeholder="Taken By"
                    className="w-full p-2 border rounded-lg"
                    required
                  />
                  <input
                    type="text"
                    name="issuedBy"
                    placeholder="Issued By"
                    className="w-full p-2 border rounded-lg"
                    required
                  />
                  <input
                    type="date"
                    name="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full p-2 border rounded-lg"
                    required
                  />
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
                    Add
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