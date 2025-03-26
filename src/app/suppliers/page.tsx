'use client';
import React, { useState, useEffect } from 'react';
import Navbar from '../inventory/components/navbar';
import Sidebar from '../inventory/components/sidebar';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import * as XLSX from 'xlsx';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface Supplier {
  id: number;
  name: string;
  contact: string;
  email?: string;
  address?: string;
  created_at: string;
}

const SuppliersPage = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState<Supplier | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<number | null>(null);

  // Fetch suppliers from Supabase
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('suppliers')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setSuppliers(data || []);
        setFilteredSuppliers(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch suppliers');
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
    if (!currentSupplier?.name) {
      setError('Supplier name is required');
      return;
    }

    try {
      setLoading(true);
      if (currentSupplier.id) {
        // Update existing supplier
        const { data, error } = await supabase
          .from('suppliers')
          .update(currentSupplier)
          .eq('id', currentSupplier.id)
          .select()
          .single();

        if (error) throw error;
        setSuppliers(suppliers.map(s => s.id === data.id ? data : s));
      } else {
        // Create new supplier
        const { data, error } = await supabase
          .from('suppliers')
          .insert([currentSupplier])
          .select()
          .single();

        if (error) throw error;
        setSuppliers([data, ...suppliers]);
      }
      setIsModalOpen(false);
      setCurrentSupplier(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save supplier');
    } finally {
      setLoading(false);
    }
  };

  // Delete supplier
  const deleteSupplier = async () => {
    if (!supplierToDelete) return;

    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  // Handle Excel download
  const handleDownload = () => {
    const data = filteredSuppliers.map(supplier => ({
      'Name': supplier.name,
      'Contact': supplier.contact,
      'Email': supplier.email || '-',
      'Address': supplier.address || '-',
      'Date Added': new Date(supplier.created_at).toLocaleDateString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Suppliers');
    XLSX.writeFile(workbook, 'Suppliers_List.xlsx');
  };

  // Open modal for editing
  const openEditModal = (supplier: Supplier) => {
    setCurrentSupplier(supplier);
    setIsModalOpen(true);
  };

  // Open modal for creating new
  const openCreateModal = () => {
    setCurrentSupplier({
      id: 0,
      name: '',
      contact: '',
      email: '',
      address: '',
      created_at: new Date().toISOString()
    });
    setIsModalOpen(true);
  };

  if (loading && suppliers.length === 0) return <div className="flex-1 ml-16 p-6 flex items-center justify-center">
  <div className="animate-pulse flex space-x-2 items-center mt-50">
    <div className="h-2 w-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
    <div className="h-2 w-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
    <div className="h-2 w-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
    <span className="ml-2 text-green-500 font-large">Suppliers Loading...</span>
  </div>
</div>;
  if (error) return <div className="flex-1 ml-16 p-6 text-red-500">Error: {error}</div>;

  return (
    <div className="flex text-black mt-10">
      <Sidebar />
      <div className="flex-1 ml-16 p-6">
        <Navbar />
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8 mt-2">
          <div>
            <h1 className="text-3xl text-white font-bold">Suppliers</h1>
            <p className="text-gray-300">Manage your suppliers and their information</p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={handleDownload}
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
              Export
            </button>
            <button
              onClick={openCreateModal}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Supplier
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6 text-white">
          <div className="relative max-w-md">
            <input
              type="text"
              placeholder="Search suppliers..."
              className="pl-10 pr-4 py-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Suppliers Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">Date Added</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-black-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSuppliers.length > 0 ? (
                filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{supplier.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{supplier.contact}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{supplier.email || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{supplier.address || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {new Date(supplier.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/supplier-lpos/${supplier.id}`}
                        className="text-green-600 hover:text-green-800 mr-4"
                      >
                        View Supplies
                      </Link>
                      <button
                        onClick={() => openEditModal(supplier)}
                        className="text-blue-500 hover:text-blue-700 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setSupplierToDelete(supplier.id);
                          setIsDeleteConfirmOpen(true);
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    {searchTerm ? 'No matching suppliers found' : 'No suppliers available'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add/Edit Supplier Modal */}
        {isModalOpen && currentSupplier && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4">
                {currentSupplier.id ? 'Edit Supplier' : 'Add New Supplier'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg"
                      value={currentSupplier.name}
                      onChange={(e) => setCurrentSupplier({...currentSupplier, name: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact *</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg"
                      value={currentSupplier.contact}
                      onChange={(e) => setCurrentSupplier({...currentSupplier, contact: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      className="w-full p-2 border rounded-lg"
                      value={currentSupplier.email || ''}
                      onChange={(e) => setCurrentSupplier({...currentSupplier, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <textarea
                      className="w-full p-2 border rounded-lg"
                      value={currentSupplier.address || ''}
                      onChange={(e) => setCurrentSupplier({...currentSupplier, address: e.target.value})}
                      rows={3}
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4">Confirm Delete</h2>
              <p className="mb-6">Are you sure you want to delete this supplier? This action cannot be undone.</p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteSupplier}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                  disabled={loading}
                >
                  {loading ? 'Deleting...' : 'Delete'}
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