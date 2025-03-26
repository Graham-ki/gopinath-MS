'use client';
import { useParams } from 'next/navigation';
import { supabase } from '@/supabase/supabaseClient';
import { useEffect, useState } from 'react';

export default function SupplierDetail() {
  const params = useParams();
  const [supplier, setSupplier] = useState<{ name: string; contact: string; email?: string; address?: string; created_at: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSupplier = async () => {
      try {
        const { data, error } = await supabase
          .from('suppliers')
          .select('*')
          .eq('id', params.id)
          .single();

        if (error) throw error;
        setSupplier(data);
      } catch (error) {
        console.error('Error fetching supplier:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSupplier();
  }, [params.id]);

  if (loading) return <div>Loading...</div>;
  if (!supplier) return <div>Supplier not found</div>;

  return (
    <div className="p-6 text-black">
      <h1 className="text-2xl font-bold mb-4 text-white">{supplier.name}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Contact Information</h2>
          <p>Phone: {supplier.contact}</p>
          <p>Email: {supplier.email || 'N/A'}</p>
          <p>Address: {supplier.address || 'N/A'}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Additional Details</h2>
          <p>Created: {new Date(supplier.created_at).toLocaleDateString()}</p>
          {/* Add more supplier details as needed */}
        </div>
      </div>
    </div>
  );
}