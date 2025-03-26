'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabase/supabaseClient';
import { FiSearch, FiX } from 'react-icons/fi';

const DEBOUNCE_DELAY = 300;

type SearchResult = {
  id: number;
  type: 'supplier' | 'stock_item' | 'stock_out' | 'lpo';
  name: string;
  extraInfo?: string;
  route: string;
};

const Navbar = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const searchTables = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return [];
    }

    setIsSearching(true);
    try {
      const searchPromises = [
        supabase.from('suppliers')
          .select('id, name, contact, email')
          .or(`name.ilike.%${query}%,contact.ilike.%${query}%,email.ilike.%${query}%`),
        supabase.from('stock_items')
          .select('id, name, quantity')
          .ilike('name', `%${query}%`),
        supabase.from('stock_out')
          .select('id, name, quantity, takenby')
          .or(`name.ilike.%${query}%,takenby.ilike.%${query}%`),
        supabase.from('purchase_lpo')
          .select('id, lpo_number, supplier_id, status')
          .or(`lpo_number.ilike.%${query}%,status.ilike.%${query}%`)
      ];

      const [
        { data: suppliers, error: sError },
        { data: stockItems, error: siError },
        { data: stockOut, error: soError },
        { data: lpos, error: lError }
      ] = await Promise.all(searchPromises);

      if (sError || siError || soError || lError) {
        throw new Error('Search failed');
      }

      const results: SearchResult[] = [
        ...(suppliers?.map(s => ({
          id: s.id,
          type: 'supplier' as const,
          name: 'name' in s ? s.name : '',
          extraInfo: 'email' in s ? s.email : undefined,
          route: `/suppliers/${s.id}`
        })) || []),
        ...(stockItems?.map(si => ({
          id: si.id,
          type: 'stock_item' as const,
          name: 'name' in si ? si.name : '',
          extraInfo: 'quantity' in si ? `${si.quantity} in stock` : undefined,
          route: `/stock-items/${si.id}`
        })) || []),
        ...(stockOut?.map(so => ({
          id: so.id,
          type: 'stock_out' as const,
          name: 'name' in so ? so.name : '',
          extraInfo: 'takenby' in so ? `Taken by ${so.takenby}` : undefined,
          route: `/stock-out/${so.id}`
        })) || []),
        ...(lpos?.map(l => ({
          id: l.id,
          type: 'lpo' as const,
          name: 'lpo_number' in l ? `LPO #${l.lpo_number}` : '',
          extraInfo: 'status' in l ? l.status : undefined,
          route: `/lpos/${l.id}`
        })) || [])
      ];

      setSearchResults(results);
      return results;
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      return [];
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      if (searchQuery) {
        searchTables(searchQuery);
        setShowResults(true);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, DEBOUNCE_DELAY);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [searchQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowResults(false);
    setSearchResults([]);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gray-600 text-white shadow-lg">
      <div className="flex justify-between items-center p-2">
        {/* Title */}
        <div 
          className="text-xl font-bold cursor-pointer pl-4" 
          onClick={() => router.push('/')}
          role="button"
          tabIndex={0}
          aria-label="Go to home page"
        >
          MTS Management System
        </div>

        {/* Search Bar */}
        <div className="flex-grow mx-4 relative max-w-xl">
          <div className="relative">
            <FiSearch className="absolute left-3 top-3 text-gray-300" />
            <input
              type="text"
              placeholder="Search suppliers, inventory, LPOs..."
              className="w-full pl-10 pr-8 py-2 rounded-lg bg-blue-400 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchQuery && setShowResults(true)}
              aria-label="Search"
              aria-autocomplete="list"
              aria-controls="search-results"
            />
            {searchQuery && (
              <FiX 
                className="absolute right-3 top-3 text-gray-300 cursor-pointer"
                onClick={clearSearch}
                aria-label="Clear search"
              />
            )}
          </div>
          
          {/* Search Results Dropdown */}
          {showResults && searchQuery && (
            <div 
              id="search-results"
              className="absolute top-full left-0 right-0 bg-white text-black rounded-b-lg shadow-lg max-h-96 overflow-y-auto z-50 border border-gray-200"
              role="listbox"
            >
              {isSearching ? (
                <div className="p-4 text-center text-gray-500">Searching...</div>
              ) : searchResults.length > 0 ? (
                <ul>
                  {searchResults.map((result) => (
                    <li 
                      key={`${result.type}-${result.id}-${Math.random().toString(36).slice(2, 9)}`}
                      className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100"
                      onClick={() => {
                        router.push(result.route);
                        clearSearch();
                      }}
                      role="menuitem"
                    >
                      <div className="font-medium">
                        {result.type === 'lpo' ? result.name : `${result.name} (${result.type.replace('_', ' ')})`}
                      </div>
                      {result.extraInfo && (
                        <div className="text-xs text-gray-500 mt-1">
                          {result.extraInfo}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  No results found for {searchQuery}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-2 pr-4">
          <button
            className="px-4 py-2 bg-blue-400 hover:bg-blue-800 rounded-t-lg transition-colors duration-200"
            onClick={() => router.push('/suppliers')}
            aria-label="Navigate to suppliers"
          >
            Suppliers
          </button>
          <button
            className="px-4 py-2 bg-blue-400 hover:bg-blue-800 rounded-t-lg transition-colors duration-200"
            onClick={() => router.push('/lpos')}
            aria-label="Navigate to LPOs"
          >
            LPOs
          </button>
          <button
            className="px-4 py-2 bg-blue-400 hover:bg-blue-800 rounded-t-lg transition-colors duration-200"
            onClick={() => router.push('/inventory')}
            aria-label="Navigate to inventory"
          >
            Inventory
          </button>
          <button
            className="px-4 py-2 bg-red-700 hover:bg-red-500 rounded-t-lg transition-colors duration-200"
            onClick={handleLogout}
            aria-label="Logout"
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navbar;