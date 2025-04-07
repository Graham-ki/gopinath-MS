'use client';
import React, { useState, useEffect } from 'react';
import Navbar from '../inventory/components/navbar';
import Sidebar from '../inventory/components/sidebar';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { FiDownload, FiPlus, FiSearch, FiEdit2, FiTrash2, FiUser, FiPhone, FiMail, FiMapPin, FiCalendar, FiX, FiCheck, FiLoader, FiTruck, FiShoppingBag, FiPackage } from 'react-icons/fi';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface Supplier {
  id?: number;
  name: string;
  contact: string;
  email?: string;
  address?: string;
  created_at?: string;
}

const SuppliersPage = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState<Supplier | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<number | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check if first visit
  useEffect(() => {
    const firstVisit = localStorage.getItem('suppliersFirstVisit') !== 'false';
    if (firstVisit) {
      setShowOnboarding(true);
      localStorage.setItem('suppliersFirstVisit', 'false');
    }
  }, []);

  // Fetch suppliers from Supabase
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase
          .from('suppliers')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setSuppliers(data || []);
        setFilteredSuppliers(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch suppliers. Please connect to the internet.');
        console.error('Error fetching suppliers:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSuppliers();
  }, []);

  // Filter suppliers based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredSuppliers(suppliers);
    } else {
      const filtered = suppliers.filter(supplier => 
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (supplier.contact && supplier.contact.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (supplier.email && supplier.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (supplier.address && supplier.address.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredSuppliers(filtered);
    }
  }, [searchTerm, suppliers]);

  // Handle form submit (create/update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentSupplier?.name?.trim() || !currentSupplier?.contact?.trim()) {
      setError('Both name and contact are required');
      return;
    }

    try {
      setOperationLoading(true);
      setError(null);

      const cleanData = {
        name: currentSupplier.name.trim(),
        contact: currentSupplier.contact.trim(),
        email: currentSupplier.email?.trim() || null,
        address: currentSupplier.address?.trim() || null
      };

      if (currentSupplier.id) {
        // UPDATE existing supplier
        const { data, error } = await supabase
          .from('suppliers')
          .update(cleanData)
          .eq('id', currentSupplier.id)
          .select()
          .single();

        if (error) throw error;
        
        setSuppliers(suppliers.map(s => 
          s.id === currentSupplier.id ? { ...data, id: currentSupplier.id } : s
        ));
      } else {
        // CREATE new supplier
        const { data, error } = await supabase
          .from('suppliers')
          .insert([cleanData])
          .select()
          .single();

        if (error) throw error;
        
        setSuppliers([data, ...suppliers]);
      }

      setIsModalOpen(false);
      setCurrentSupplier(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save supplier';
      setError(errorMessage);
      console.error('Error saving supplier:', err);
    } finally {
      setOperationLoading(false);
    }
  };

  // Delete supplier
  const deleteSupplier = async () => {
    if (!supplierToDelete) return;

    try {
      setOperationLoading(true);
      setError(null);
      
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplierToDelete);

      if (error) throw error;
      
      setSuppliers(suppliers.filter(s => s.id !== supplierToDelete));
      setIsDeleteConfirmOpen(false);
      setSupplierToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete supplier');
      console.error('Error deleting supplier:', err);
    } finally {
      setOperationLoading(false);
    }
  };

  // Handle Excel download
  const handleDownload = () => {
    const data = filteredSuppliers.map(supplier => ({
      'Name': supplier.name,
      'Contact': supplier.contact,
      'Email': supplier.email || '-',
      'Address': supplier.address || '-',
      'Date Added': supplier.created_at ? new Date(supplier.created_at).toLocaleDateString() : '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Suppliers');
    XLSX.writeFile(workbook, 'Suppliers_List.xlsx');
  };

  // Open modal for editing
  const openEditModal = (supplier: Supplier) => {
    setCurrentSupplier({
      id: supplier.id,
      name: supplier.name,
      contact: supplier.contact,
      email: supplier.email,
      address: supplier.address,
      created_at: supplier.created_at
    });
    setIsModalOpen(true);
  };

  // Open modal for creating new
  const openCreateModal = () => {
    setCurrentSupplier({
      name: '',
      contact: '',
      email: '',
      address: ''
    });
    setIsModalOpen(true);
  };

  if (loading && suppliers.length === 0) return (
    <div className="flex-1 ml-16 p-6 flex flex-col items-center justify-center min-h-screen">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex space-x-2">
              <div className="h-3 w-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="h-3 w-3 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="h-3 w-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <FiPackage className="animate-spin" />
              <span>Loading suppliers...</span>
            </div>
          </div>
        </div>
  );

  if (error) return (
    <div className="flex-1 ml-16 p-6">
      <div className="bg-red-50 border-l-4 border-red-500 p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <FiX className="h-5 w-5 text-red-500" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">Error: {error}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex text-black mt-10">
      <Sidebar />
      <div className="flex-1 ml-16 p-6">
        <Navbar />
        
        {/* Onboarding Tour */}
        {showOnboarding && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-xl p-6 max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Welcome to Suppliers Management</h2>
                <button 
                  onClick={() => setShowOnboarding(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FiX />
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <FiTruck className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">Track Your Suppliers</h3>
                    <p className="text-gray-600 text-sm">Manage all your vendor relationships in one place.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
                    <FiShoppingBag className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">View Supplies</h3>
                    <p className="text-gray-600 text-sm">Click <b>View Supplies</b> to see items provided by each supplier.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                    <FiPlus className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">Add New Suppliers</h3>
                    <p className="text-gray-600 text-sm">Use the <b>Add Supplier</b> button to create new vendor records.</p>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <button
                  onClick={() => setShowOnboarding(false)}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg"
                >
                  Get Started
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center mb-8 mt-2">
          <div>
            <h1 className="text-3xl text-white font-bold flex items-center">
              <FiTruck className="mr-3 text-blue-500" />
              Suppliers
            </h1>
            <p className="text-gray-500 mt-1">Manage your suppliers and their information</p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={handleDownload}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center transition-colors duration-200"
            >
              <FiDownload className="mr-2" />
              Export
            </button>
            <button
              onClick={openCreateModal}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center transition-colors duration-200"
            >
              <FiPlus className="mr-2" />
              Add Supplier
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search suppliers by name, contact, email..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white bg-gray-800"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FiX className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Suppliers Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      <FiUser className="mr-2" />
                      Name
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      <FiPhone className="mr-2" />
                      Contact
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      <FiMail className="mr-2" />
                      Email
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      <FiMapPin className="mr-2" />
                      Address
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      <FiCalendar className="mr-2" />
                      Date Added
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSuppliers.length > 0 ? (
                  filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{supplier.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">{supplier.contact}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {supplier.email || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 max-w-xs truncate">
                        {supplier.address || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {supplier.created_at ? new Date(supplier.created_at).toLocaleDateString() : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                        <Link
                          href={`/supplier-lpos/${supplier.id}`}
                          className="text-green-600 hover:text-green-800 inline-flex items-center"
                        >
                          <FiShoppingBag className="mr-1" />
                          Supplies
                        </Link>
                        <button
                          onClick={() => openEditModal(supplier)}
                          className="text-blue-500 hover:text-blue-700 inline-flex items-center"
                        >
                          <FiEdit2 className="mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setSupplierToDelete(supplier.id || 0);
                            setIsDeleteConfirmOpen(true);
                          }}
                          className="text-red-500 hover:text-red-700 inline-flex items-center"
                        >
                          <FiTrash2 className="mr-1" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center py-8">
                        <FiUser className="h-12 w-12 text-gray-400 mb-2" />
                        <p className="text-lg">
                          {searchTerm ? 'No matching suppliers found' : 'No suppliers available'}
                        </p>
                        {!searchTerm && (
                          <button
                            onClick={openCreateModal}
                            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
                          >
                            <FiPlus className="mr-2" />
                            Add Your First Supplier
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Supplier Modal */}
        {isModalOpen && currentSupplier && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  {currentSupplier.id ? (
                    <span className="flex items-center">
                      <FiEdit2 className="mr-2 text-blue-500" />
                      Edit Supplier
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <FiPlus className="mr-2 text-blue-500" />
                      Add New Supplier
                    </span>
                  )}
                </h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setError(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FiX />
                </button>
              </div>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded">
                  <div className="flex items-center">
                    <FiX className="h-5 w-5 text-red-500 mr-2" />
                    <span className="text-red-700">{error}</span>
                  </div>
                </div>
              )}
              
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <FiUser className="mr-2 text-gray-500" />
                      Name *
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      value={currentSupplier.name}
                      onChange={(e) => setCurrentSupplier({...currentSupplier, name: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <FiPhone className="mr-2 text-gray-500" />
                      Contact *
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      value={currentSupplier.contact}
                      onChange={(e) => setCurrentSupplier({...currentSupplier, contact: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <FiMail className="mr-2 text-gray-500" />
                      Email
                    </label>
                    <input
                      type="email"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      value={currentSupplier.email || ''}
                      onChange={(e) => setCurrentSupplier({...currentSupplier, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <FiMapPin className="mr-2 text-gray-500" />
                      Address
                    </label>
                    <textarea
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      value={currentSupplier.address || ''}
                      onChange={(e) => setCurrentSupplier({...currentSupplier, address: e.target.value})}
                      rows={3}
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setError(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200 flex items-center"
                    disabled={operationLoading}
                  >
                    <FiX className="mr-2" />
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 flex items-center justify-center min-w-20"
                    disabled={operationLoading}
                  >
                    {operationLoading ? (
                      <>
                        <FiLoader className="animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <FiCheck className="mr-2" />
                        Save
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center mb-4">
                <div className="bg-red-100 p-2 rounded-full mr-3">
                  <FiTrash2 className="h-5 w-5 text-red-500" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800">Confirm Delete</h2>
              </div>
              <p className="mb-6 text-gray-600">Are you sure you want to delete this supplier? This action cannot be undone.</p>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded">
                  <div className="flex items-center">
                    <FiX className="h-5 w-5 text-red-500 mr-2" />
                    <span className="text-red-700">{error}</span>
                  </div>
                </div>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setIsDeleteConfirmOpen(false);
                    setError(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200 flex items-center"
                  disabled={operationLoading}
                >
                  <FiX className="mr-2" />
                  Cancel
                </button>
                <button
                  onClick={deleteSupplier}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 flex items-center justify-center min-w-20"
                  disabled={operationLoading}
                >
                  {operationLoading ? (
                    <>
                      <FiLoader className="animate-spin mr-2" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <FiTrash2 className="mr-2" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuppliersPage;