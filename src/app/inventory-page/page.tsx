'use client';
import React, { useState, useEffect } from 'react';
import Navbar from '../inventory/components/navbar';
import Sidebar from '../inventory/components/sidebar';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import {
  FiPackage,
  FiUpload,
  FiDownload,
  FiPlus,
  FiEye,
  FiEdit,
  FiCheck,
  FiX,
  FiAlertTriangle,
  FiArrowRight,
  FiPrinter,
  FiUser,
  FiTruck,
  FiDollarSign,
  FiCalendar,
  FiSearch,
  FiMessageSquare,
  FiBarChart2,
  FiFile,
  FiFileText,
  FiInfo
} from 'react-icons/fi';

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
  quantity_received: number;
  quantity_available: number;
  cost: number;
  supplier_id: number;
  supplier_name: string;
  created_at: string;
  receiving_date?: string;
  lpo_id: number;
  approval_comment?: string;
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
  department: string;
  purpose: string;
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
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [selectedItemGroup, setSelectedItemGroup] = useState<StockItem[]>([]);
  const [receivedQuantity, setReceivedQuantity] = useState(0);

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
          lpo_number: item.purchase_lpo?.lpo_number || '',
          approval_comment: item.approval_comment || ''
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

  // Group items by name and calculate total quantities
  const getSummarizedStockItems = () => {
    const grouped: Record<string, {
      name: string;
      totalQuantity: number;
      totalReceived: number;
      totalAvailable: number;
      totalCost: number;
      items: StockItem[];
    }> = {};
    
    stockItems.forEach(item => {
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
      grouped[item.name].totalReceived += item.quantity_received;
      grouped[item.name].totalAvailable += item.quantity_available;
      grouped[item.name].totalCost += item.cost * item.quantity;
      grouped[item.name].items.push(item);
    });
    
    return Object.values(grouped);
  };

  // Get summarized low stock items (quantity ≤ 5)
  const getSummarizedLowStockItems = () => {
    const grouped: Record<string, {
      name: string;
      totalAvailable: number;
      items: StockItem[];
    }> = {};
    
    stockItems.forEach(item => {
      if (!grouped[item.name]) {
        grouped[item.name] = {
          name: item.name,
          totalAvailable: 0,
          items: []
        };
      }
      grouped[item.name].totalAvailable += item.quantity_available;
      grouped[item.name].items.push(item);
    });
    
    // Filter to only include items where total available is less than 5
    return Object.values(grouped)
      .filter(group => group.totalAvailable <= 5)
      .sort((a, b) => a.totalAvailable - b.totalAvailable)
      .slice(0, 5); // Get top 5 lowest stock items
  };

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
          lpo_number: completeItem.purchase_lpo?.lpo_number || '',
          approval_comment: completeItem.approval_comment || ''
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
      
      if (product.quantity_available < quantity) {
        alert('Stock is insufficient for this item');
        return;
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
          purpose: form.purpose.value,
          department: form.department.value,
          created_at: new Date().toISOString(),
        }])
        .select();
      
      if (error) throw error;
      
      // Update stock quantity
      const { error: updateError } = await supabase
        .from('stock_items')
        .update({ quantity_available: product.quantity_available - quantity })
        .eq('id', productId);
      
      if (updateError) throw updateError;
      
      if (data && data.length > 0) {
        setStockOutRecords([...stockOutRecords, data[0]]);
        
        // Update local stock items state
        setStockItems(stockItems.map(item => 
          item.id === productId 
            ? { ...item, quantity_available: item.quantity_available - quantity } 
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

  // Review modal functions
  
  const closeReviewModal = () => {
    setIsReviewModalOpen(false);
    setSelectedItem(null);
    setReceivedQuantity(0);
  };

  const updateReceivedQuantity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    try {
      // First get the current quantity_available
      const { data: currentItem } = await supabase
        .from('stock_items')
        .select('quantity_available')
        .eq('id', selectedItem.id)
        .single();

      if (!currentItem) throw new Error('Item not found');

      // Calculate new quantity available
      const newQuantityAvailable = (currentItem.quantity_available || 0) + receivedQuantity;

      // Update both quantity_received and quantity_available
      const { error } = await supabase
        .from('stock_items')
        .update({ 
          quantity_received: receivedQuantity,
          quantity_available: newQuantityAvailable,
          grn_number: selectedItem.grn_number,
          receiving_date: new Date().toISOString()
        })
        .eq('id', selectedItem.id);

      if (error) throw error;

      // Refresh data after update
      const { data: updatedData } = await supabase
        .from('stock_items')
        .select(`*, suppliers (name), purchase_lpo (lpo_number)`)
        .eq('id', selectedItem.id)
        .single();

      if (updatedData) {
        setStockItems(stockItems.map(item => 
          item.id === selectedItem.id ? {
            ...item,
            quantity_received: receivedQuantity,
            quantity_available: newQuantityAvailable,
            grn_number: selectedItem.grn_number,
            receiving_date: new Date().toISOString()
          } : item
        ));
      }

      // Create system log
      const { data: logData, error: logError } = await supabase
        .from('system_logs')
        .insert([{
          action: 'Stock Received Update',
          details: `Updated received quantity for ${selectedItem.name} to ${receivedQuantity}. New available quantity: ${newQuantityAvailable}`,
          created_by: currentUser
        }])
        .select();
      
      if (logError) throw logError;

      if (logData && logData.length > 0) {
        setSystemLogs([logData[0], ...systemLogs]);
      }

      closeReviewModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update quantity received');
      console.error('Error updating quantity received:', err);
    }
  };

  // Function to download Stock In data as Excel
  const downloadStockInData = () => {
    const data = stockItems.map(item => ({
      'Name': item.name,
      'LPO Number': item.lpo_number,
      'GRN Number': item.grn_number,
      'Quantity Ordered': item.quantity,
      'Quantity Received': item.quantity_received,
      'Quantity Available': item.quantity_available,
      'Cost': `UGX ${item.cost}`,
      'Supplier': item.supplier_name,
      'Date Added': new Date(item.created_at).toLocaleDateString(),
      'Receiving Date': item.receiving_date ? new Date(item.receiving_date).toLocaleDateString() : 'N/A'
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
      'Department': record.department,
      'Purpose': record.purpose,
      'Issued By': record.issuedby,
      'Date': new Date(record.created_at).toLocaleDateString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'StockOut');
    XLSX.writeFile(workbook, 'Stock_Out_Data.xlsx');
  };

  // Get summarized low stock items
  const lowStockItems = getSummarizedLowStockItems();

  // Only show the alert if there are items with total available <= 5
  const showLowStockAlert = lowStockItems.length > 0;

  if (loading) return <div className="flex-1 ml-16 p-6 flex flex-col items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="flex space-x-2">
            <div className="h-3 w-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="h-3 w-3 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="h-3 w-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <div className="flex items-center space-x-2 text-gray-600">
            <FiPackage className="animate-spin" />
            <span>Loading...</span>
          </div>
        </div>
      </div>;

  if (error) return <div className="flex-1 ml-16 p-6 text-red-500">Error: {error}</div>;

  return (
    <div className="flex text-white mt-10">
      <Sidebar />
      <div className="flex-1 ml-16 p-6">
        <Navbar />
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center mb-2">
            <FiPackage className="text-blue-500 text-4xl mr-3" />
            <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              Inventory Management
            </h1>
          </div>
          <p className="text-gray-500 text-center max-w-md flex items-center">
            <FiBarChart2 className="mr-2" /> Track, manage, and optimize your inventory in real-time
          </p>
          <div className="mt-4 w-16 h-1 bg-blue-500 rounded-full"></div>
        </div>

        {/* Low Stock Alert */}
        {showLowStockAlert && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8 text-black border-l-4 border-red-500">
            <div className="flex items-start">
              <FiAlertTriangle className="text-red-500 text-2xl mr-3 mt-1" />
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  Low Stock Alert <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">Attention Needed</span>
                </h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white">
                    <tbody>
                      {lowStockItems.map((group) => (
                        <tr key={group.name} className="border-b hover:bg-red-50">
                          <td className="py-3 px-4 text-red-500 flex items-center">
                            <FiPackage className="mr-2" /> {group.name}
                          </td>
                          <td className="py-3 px-4 text-red-500 font-semibold animate-bounce">
                            {group.totalAvailable} remaining
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 text-right">
                  <button 
                    className="text-blue-500 hover:text-blue-700 font-medium flex items-center"
                    onClick={() => setActiveTab('stockIn')}
                  >
                    View Full List <FiArrowRight className="ml-1" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toggle Buttons for Stock In and Stock Out */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('stockIn')}
              className={`px-4 py-2 rounded-lg flex items-center ${
                activeTab === 'stockIn'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              <FiDownload className="mr-2" /> Stock In
            </button>
            <button
              onClick={() => setActiveTab('stockOut')}
              className={`px-4 py-2 rounded-lg flex items-center ${
                activeTab === 'stockOut'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              <FiUpload className="mr-2" /> Stock Out
            </button>
          </div>
          <div className="flex space-x-4">
            {activeTab === 'stockIn' && (
              <button
                onClick={downloadStockInData}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center"
              >
                <FiPrinter className="mr-2" /> Export Stock In
              </button>
            )}
            {activeTab === 'stockOut' && (
              <button
                onClick={downloadStockOutData}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center"
              >
                <FiPrinter className="mr-2" /> Export Stock Out
              </button>
            )}
          </div>
        </div>

        {/* Stock In List */}
        {activeTab === 'stockIn' && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8 text-black">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <FiDownload className="mr-2" /> Stock In
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-2 px-4 text-left ">
                      <FiPackage className="mr-2" /> Name
                    </th>
                    <th className="py-3 px-4 text-left flex items-center">
                      <FiBarChart2 className="mr-2" /> Opening Stock
                    </th>
                    <th className="py-3 px-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getSummarizedStockItems().map((group) => (
                    <tr key={group.name} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 flex items-center">
                        <FiPackage className="mr-2 text-blue-500" /> {group.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium">{group.totalAvailable}</span>
                      </td>
                      <td className="py-3 px-4 flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedItemGroup(group.items);
                            setIsDetailsModalOpen(true);
                          }}
                          className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-sm flex items-center"
                        >
                          <FiEye className="mr-1" /> View Details
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
              <h2 className="text-xl font-semibold flex items-center">
                <FiUpload className="mr-2" /> Stock Out
              </h2>
              <button
                onClick={() => setIsAddStockOutModalOpen(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center"
              >
                <FiPlus className="mr-2" /> Add Stock Out
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-3 px-4 text-left  ">
                      <FiPackage className="mr-2" /> Name
                    </th>
                    <th className="py-3 px-4 text-left ">
                      <FiBarChart2 className="mr-2" /> Quantity
                    </th>
                    <th className="py-3 px-4 text-left ">
                      <FiUser className="mr-2" /> Taken By
                    </th>
                    <th className="py-3 px-4 text-left ">
                      <FiFile className="mr-2" /> Department
                    </th>
                    <th className="py-3 px-4 text-left ">
                      <FiFileText className="mr-2" /> Purpose
                    </th>
                    <th className="py-3 px-4 text-left ">
                      <FiUser className="mr-2" /> Issued By
                    </th>
                    <th className="py-3 px-4 text-left flex items-center">
                      <FiCalendar className="mr-2" /> Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stockOutRecords.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{record.name}</td>
                      <td className="py-3 px-4">{record.quantity}</td>
                      <td className="py-3 px-4">{record.takenby}</td>
                      <td className="py-3 px-4">{record.department}</td>
                      <td className="py-3 px-4">{record.purpose}</td>
                      <td className="py-3 px-4">{record.issuedby}</td>
                      <td className="py-3 px-4 flex items-center">
                        <FiCalendar className="mr-2 text-gray-400" /> 
                        {new Date(record.created_at).toLocaleDateString()}
                      </td>
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
              <div className="flex items-center mb-4">
                <FiPlus className="text-blue-500 text-2xl mr-2" />
                <h2 className="text-xl font-semibold">Add New Stock</h2>
              </div>
              <div className="flex items-center text-sm text-gray-500 mb-4">
                <FiAlertTriangle className="mr-2" /> Item once added cannot be removed/changed!
              </div>
              
              {/* Current Stock Summary */}
              <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center mb-2">
                  <FiBarChart2 className="text-blue-500 mr-2" />
                  <h3 className="font-medium text-gray-700">Current Stock Summary</h3>
                </div>
                <div className="space-y-2">
                  {getSummarizedStockItems()
                    .filter(group => group.name.toLowerCase().includes(newStockItem.name.toLowerCase()))
                    .slice(0, 3)
                    .map(group => (
                      <div key={group.name} className="flex justify-between text-sm items-center">
                        <span className="text-gray-600 flex items-center">
                          <FiPackage className="mr-2" /> {group.name}
                        </span>
                        <span className="font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          {group.totalAvailable} available
                        </span>
                      </div>
                    ))}
                </div>
              </div>
              
              <form onSubmit={addStockItem}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <FiPackage className="mr-2" /> Item Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Enter item name"
                        className="w-full p-2 border rounded-lg pl-10"
                        required
                        value={newStockItem.name}
                        onChange={(e) => setNewStockItem({...newStockItem, name: e.target.value})}
                      />
                      <FiSearch className="absolute left-3 top-3 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <FiFileText className="mr-2" /> GRN Number
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Enter GRN number"
                        className="w-full p-2 border rounded-lg pl-10"
                        required
                        value={newStockItem.grn_number}
                        onChange={(e) => setNewStockItem({...newStockItem, grn_number: e.target.value})}
                      />
                      <FiFileText className="absolute left-3 top-3 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <FiFile className="mr-2" /> LPO
                    </label>
                    <div className="relative">
                      <select
                        className="w-full p-2 border rounded-lg pl-10"
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
                      <FiFile className="absolute left-3 top-3 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <FiTruck className="mr-2" /> Supplier
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        className="w-full p-2 border rounded-lg pl-10 bg-gray-100"
                        readOnly
                        value={newStockItem.supplier_name || 'Select LPO to auto-fill supplier'}
                      />
                      <FiTruck className="absolute left-3 top-3 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <FiBarChart2 className="mr-2" /> Quantity
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="Enter quantity"
                        className="w-full p-2 border rounded-lg pl-10"
                        required
                        min="1"
                        value={newStockItem.quantity}
                        onChange={(e) => setNewStockItem({...newStockItem, quantity: parseInt(e.target.value)})}
                      />
                      <FiBarChart2 className="absolute left-3 top-3 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <FiDollarSign className="mr-2" /> Cost Price (UGX)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="Enter cost price"
                        className="w-full p-2 border rounded-lg pl-10"
                        required
                        min="0"
                        step="0.01"
                        value={newStockItem.cost}
                        onChange={(e) => setNewStockItem({...newStockItem, cost: parseFloat(e.target.value)})}
                      />
                      <FiDollarSign className="absolute left-3 top-3 text-gray-400" />
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setIsAddStockModalOpen(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center"
                  >
                    <FiX className="mr-2" /> Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center"
                  >
                    <FiCheck className="mr-2" /> Add Stock
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
              <div className="flex items-center mb-4">
                <FiUpload className="text-blue-500 text-2xl mr-2" />
                <h2 className="text-xl font-semibold">Add Stock Out Record</h2>
              </div>
              <div className="flex items-center text-sm text-gray-500 mb-4">
                <FiAlertTriangle className="mr-2" /> Stock once added cannot be removed/changed!
              </div>
              <form onSubmit={addStockOutRecord}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <FiPackage className="mr-2" /> Item
                    </label>
                    <div className="relative">
                      <select
                        name="productId"
                        className="w-full p-2 border rounded-lg pl-10"
                        required
                      >
                        <option value="">Select Product</option>
                        {getSummarizedStockItems().map(group => (
                          <option key={group.name} value={group.items[0].id}>
                            {group.name} (Stock: {group.totalAvailable})
                          </option>
                        ))}
                      </select>
                      <FiPackage className="absolute left-3 top-3 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <FiBarChart2 className="mr-2" /> Quantity
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        name="quantity"
                        placeholder="Enter quantity"
                        className="w-full p-2 border rounded-lg pl-10"
                        required
                        min="1"
                      />
                      <FiBarChart2 className="absolute left-3 top-3 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <FiUser className="mr-2" /> Taken By
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="takenBy"
                        placeholder="Enter recipient name"
                        className="w-full p-2 border rounded-lg pl-10"
                        required
                      />
                      <FiUser className="absolute left-3 top-3 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <FiFile className="mr-2" /> Department
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="department"
                        placeholder="Enter department name"
                        className="w-full p-2 border rounded-lg pl-10"
                        required
                      />
                      <FiFile className="absolute left-3 top-3 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <FiInfo className="mr-2" /> Purpose
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="purpose"
                        placeholder="Enter purpose"
                        className="w-full p-2 border rounded-lg pl-10"
                        required
                      />
                      <FiInfo className="absolute left-3 top-3 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <div className="relative">
                      <input
                        type="hidden"
                        name="issuedBy"
                        placeholder="Enter issuer name"
                        className="w-full p-2 border rounded-lg pl-10"
                        required
                        value={currentUser}
                        readOnly
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setIsAddStockOutModalOpen(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center"
                  >
                    <FiX className="mr-2" /> Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center"
                  >
                    <FiCheck className="mr-2" /> Record Stock Out
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Stock Details Modal with nested Review Modal */}
        {isDetailsModalOpen && selectedItemGroup.length > 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-4xl text-black">
              <div className="flex items-center mb-4">
                <FiEye className="text-blue-500 text-2xl mr-2" />
                <h2 className="text-xl font-semibold">Stock Details for {selectedItemGroup[0].name}</h2>
              </div>
              
              <div className="mb-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <FiPackage className="text-green-500 mr-2" />
                    <span className="font-bold text-gray-700">Total Available:</span>
                  </div>
                  <span className="font-bold text-green-500 text-xl">
                    {selectedItemGroup.reduce((sum, item) => sum + item.quantity_available, 0)}
                  </span>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="py-3 px-4 text-left">
                        LPO
                      </th>
                      <th className="py-3 px-4 text-left">
                         GRN
                      </th>
                      <th className="py-3 px-4 text-left">
                         Ordered
                      </th>
                      <th className="py-3 px-4 text-left">
                         Order Date
                      </th>
                      <th className="py-3 px-4 text-left">
                         Received
                      </th>
                      <th className="py-3 px-4 text-left">
                         Received On
                      </th>
                      <th className="py-3 px-4 text-left">
                         Unit Cost
                      </th>
                      <th className="py-3 px-4 text-left">
                         Supplier
                      </th>
                      <th className="py-3 px-4 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItemGroup.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{item.lpo_number}</td>
                        <td className="py-3 px-4">{item.grn_number || 'Not specified'}</td>
                        <td className="py-3 px-4">{item.quantity}</td>
                        <td className="py-3 px-4">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3 px-4">{item.quantity_received}</td>
                        <td className="py-3 px-4">
                          {item.receiving_date ? new Date(item.receiving_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3 px-4">UGX {item.cost.toLocaleString()}</td>
                        <td className="py-3 px-4">{item.supplier_name}</td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setReceivedQuantity(item.quantity_received);
                              setIsReviewModalOpen(true);
                            }}
                            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm flex items-center"
                          >
                            <FiEdit className="mr-1" /> Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center"
                >
                  <FiX className="mr-2" /> Close
                </button>
              </div>
            </div>

            {/* Nested Review Modal */}
            
{isReviewModalOpen && selectedItem && (
  <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-lg w-96 text-black">
      <div className="flex items-center mb-4">
        <FiEdit className="text-blue-500 text-2xl mr-2" />
        <h2 className="text-xl font-semibold">Review Stock Item</h2>
        {selectedItem.quantity === selectedItem.quantity_received && (
          <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center">
            <FiCheck className="mr-1" /> Verified
          </span>
        )}
      </div>
      <form onSubmit={updateReceivedQuantity}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <FiPackage className="mr-2" /> Item Name
            </label>
            <div className="p-2 bg-gray-100 rounded flex items-center">
              <FiPackage className="mr-2 text-gray-500" /> {selectedItem.name}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <FiMessageSquare className="mr-2" /> Approval Comment
            </label>
            <div className="p-2 bg-gray-100 rounded min-h-20 flex items-start">
              <FiMessageSquare className="mr-2 text-gray-500 mt-1" />
              <p>{selectedItem.approval_comment || 'No comments available'}</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <FiFileText className="mr-2" /> GRN Number
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Enter GRN number"
                className={`w-full p-2 border rounded-lg pl-10 ${
                  selectedItem.quantity === selectedItem.quantity_received 
                    ? 'bg-gray-100 cursor-not-allowed' 
                    : ''
                }`}
                value={selectedItem.grn_number || ''}
                onChange={(e) => {
                  if (selectedItem.quantity !== selectedItem.quantity_received) {
                    setSelectedItem({
                      ...selectedItem,
                      grn_number: e.target.value
                    });
                  }
                }}
                disabled={selectedItem.quantity === selectedItem.quantity_received}
              />
              <FiFileText className="absolute left-3 top-3 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <FiDownload className="mr-2" /> Quantity Received
            </label>
            <div className="relative">
              <input
                type="number"
                placeholder="Enter received quantity"
                className={`w-full p-2 border rounded-lg pl-10 ${
                  selectedItem.quantity === selectedItem.quantity_received 
                    ? 'bg-gray-100 cursor-not-allowed' 
                    : ''
                }`}
                required
                min="0"
                max={selectedItem.quantity}
                value={receivedQuantity}
                onChange={(e) => {
                  if (selectedItem.quantity !== selectedItem.quantity_received) {
                    setReceivedQuantity(parseInt(e.target.value));
                  }
                }}
                disabled={selectedItem.quantity === selectedItem.quantity_received}
              />
              <FiDownload className="absolute left-3 top-3 text-gray-400" />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Ordered: {selectedItem.quantity}</span>
              <span>Difference: {selectedItem.quantity - receivedQuantity}</span>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => setIsReviewModalOpen(false)}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center"
          >
            <FiX className="mr-2" /> Close
          </button>
          {selectedItem.quantity !== selectedItem.quantity_received && (
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center"
            >
              <FiCheck className="mr-2" /> Update
            </button>
          )}
        </div>
      </form>
    </div>
  </div>
)}
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryModule;