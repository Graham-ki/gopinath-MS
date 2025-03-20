"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import { saveAs } from "file-saver";
import Papa from "papaparse";
import jsPDF from "jspdf";
import "jspdf-autotable";

// Define types for the inventory item
interface InventoryItem {
  id?: string;
  name: string;
  category: string;
  quantity: number;
  unit_price: number;
}

// Define types for the sales item
interface SalesItem {
  id?: string;
  item_id: string;
  quantity: number;
  sale_date: string;
  customer_name: string;
}

// Define types for the OverviewCard props
interface OverviewCardProps {
  title: string;
  value: string | number;
  color: string;
}

// Define types for the ItemModal props
interface ItemModalProps {
  item: InventoryItem | null;
  closeModal: () => void;
  refresh: () => void;
}

// Define types for the SalesModal props
interface SalesModalProps {
  item: InventoryItem;
  closeModal: () => void;
}

// Define types for the AddSalesModal props
interface AddSalesModalProps {
  item: InventoryItem;
  closeModal: () => void;
  refreshSales: () => void;
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL or Anon Key is missing in environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default function Inventory() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [lowStock, setLowStock] = useState<number>(0);
  const [totalValue, setTotalValue] = useState<number>(0);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [salesModalOpen, setSalesModalOpen] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Check if the user is logged in and has the correct role
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        router.push("/login"); // Redirect to login page if not logged in
        return;
      }

      // Fetch user role from the database
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("usertype, role")
        .eq("id", user.id)
        .single();
        console.log("User data:", userData)
      if (userError || !userData || userData.usertype != "Inventory" || userData.role != 1) {
        router.push("/unauthorized"); // Redirect to unauthorized page
        console.log("Error occured:", error)
        return;
      }
    };

    checkAuth();
    fetchInventory();
  }, [router]);

  async function fetchInventory() {
    const { data, error } = await supabase.from("inventory").select("*");
    if (error) {
      console.error("Error fetching inventory:", error.message);
      return;
    }
    setItems(data || []);
    setTotalItems(data?.length || 0);
    setLowStock(data?.filter((item) => item.quantity < 5).length || 0);
    setTotalValue(data?.reduce((sum, item) => sum + item.quantity * item.unit_price, 0) || 0);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("inventory").delete().eq("id", id);
    if (error) {
      console.error("Error deleting item:", error.message);
      return;
    }
    fetchInventory();
  }

  function openModal(item: InventoryItem | null = null) {
    setEditItem(item);
    setModalOpen(true);
  }

  function openSalesModal(item: InventoryItem) {
    setSelectedItem(item);
    setSalesModalOpen(true);
  }

  // Logout function
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error.message);
    } else {
      router.push("/login"); // Redirect to login page after logout
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <header className="mb-6 text-center">
        <h1 className="text-4xl font-bold">📦 Inventory Dashboard</h1>
        <p className="text-gray-300">Manage stock, track inventory, and oversee warehouse operations.</p>
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition duration-300"
        >
          Exit
        </button>
      </header>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <OverviewCard title="Total Items" value={totalItems} color="bg-blue-500" />
        <OverviewCard title="Low Stock" value={lowStock} color="bg-yellow-500" />
        <OverviewCard title="Total Value" value={`UGX ${totalValue.toFixed(2)}`} color="bg-green-500" />
      </div>

      {/* Add Item Button */}
      <div className="flex justify-end mb-4">
        <button onClick={() => openModal()} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          + Add Item
        </button>
      </div>

      {/* Inventory Table */}
      <div className="overflow-x-auto">
        <table className="w-full bg-gray-800 shadow-md rounded-lg">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Category</th>
              <th className="p-3">Quantity</th>
              <th className="p-3">Price</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item) => (
                <tr key={item.id} className="border-b border-gray-700 text-center">
                  <td className="p-3">{item.name}</td>
                  <td className="p-3">{item.category}</td>
                  <td className="p-3">{item.quantity}</td>
                  <td className="p-3">UGX {item.unit_price}</td>
                  <td className="p-3 flex justify-center gap-2">
                    <button onClick={() => openSalesModal(item)} className="bg-blue-500 text-white px-3 py-1 rounded">
                      Usage
                    </button>
                    <button onClick={() => openModal(item)} className="bg-yellow-500 text-white px-3 py-1 rounded">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(item.id!)} className="bg-red-500 text-white px-3 py-1 rounded">
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center p-5 text-gray-300">No inventory items found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && <ItemModal item={editItem} closeModal={() => setModalOpen(false)} refresh={fetchInventory} />}
      {salesModalOpen && selectedItem && <SalesModal item={selectedItem} closeModal={() => setSalesModalOpen(false)} />}
    </div>
  );
}

// **Overview Card Component**
function OverviewCard({ title, value, color }: OverviewCardProps) {
  return (
    <div className={`p-6 rounded-lg shadow-md text-white ${color}`}>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

// **Item Add/Edit Modal**
function ItemModal({ item, closeModal, refresh }: ItemModalProps) {
  const [formData, setFormData] = useState<InventoryItem>(item || { name: "", category: "", quantity: 0, unit_price: 0 });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const updatedFormData = {
      ...formData,
      quantity: Number(formData.quantity),
      unit_price: Number(formData.unit_price),
    };

    if (item) {
      await supabase.from("inventory").update(updatedFormData).eq("id", item.id);
    } else {
      await supabase.from("inventory").insert([updatedFormData]);
    }
    closeModal();
    refresh();
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white text-black p-6 rounded-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">{item ? "Edit Item" : "Add Item"}</h2>
        <form onSubmit={handleSubmit}>
          <input type="text" placeholder="Name" className="w-full p-2 mb-3 border" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          <input type="text" placeholder="Category" className="w-full p-2 mb-3 border" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} required />
          <input type="number" placeholder="Quantity" className="w-full p-2 mb-3 border" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })} required />
          <input type="number" placeholder="Unit Price" className="w-full p-2 mb-3 border" value={formData.unit_price} onChange={(e) => setFormData({ ...formData, unit_price: Number(e.target.value) })} required />
          <div className="flex justify-between">
            <button type="button" onClick={closeModal} className="bg-gray-400 px-4 py-2 rounded">Cancel</button>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">{item ? "Update" : "Add"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// **Sales Modal**
function SalesModal({ item, closeModal }: SalesModalProps) {
  const [sales, setSales] = useState<SalesItem[]>([]);
  const [filteredSales, setFilteredSales] = useState<SalesItem[]>([]);
  const [addSalesModalOpen, setAddSalesModalOpen] = useState<boolean>(false);
  const [filter, setFilter] = useState<string>("All"); // Filter state
  const [searchQuery, setSearchQuery] = useState<string>(""); // Search query state

 
  async function fetchSales() {
    const { data, error } = await supabase.from("sales").select("*").eq("item_id", item.id);
    if (error) {
      console.error("Error fetching sales:", error.message);
      return;
    }
    setSales(data || []);
    setFilteredSales(data || []); // Initialize filtered sales
  }

  // Apply filter based on the selected time period
  const applyFilter = (salesData: SalesItem[], filterType: string) => {
    const today = new Date();
    const currentDate = today.toISOString().split("T")[0];

    switch (filterType) {
      case "Daily":
        return salesData.filter((sale) => sale.sale_date === currentDate);
      case "Weekly":
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
        return salesData.filter((sale) => new Date(sale.sale_date) >= startOfWeek);
      case "Monthly":
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return salesData.filter((sale) => new Date(sale.sale_date) >= startOfMonth);
      case "Yearly":
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        return salesData.filter((sale) => new Date(sale.sale_date) >= startOfYear);
      default:
        return salesData; // "All"
    }
  };

  // Handle filter change
  useEffect(() => {
    const filtered = applyFilter(sales, filter);
    setFilteredSales(filtered);
  }, [filter, sales]);

  // Handle search query change
  useEffect(() => {
    const filtered = sales.filter((sale) =>
      sale.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredSales(filtered);
  }, [searchQuery, sales]);

  // Download as CSV
  const downloadCSV = () => {
    const csvData = filteredSales.map((sale) => ({
      Quantity: sale.quantity,
      Date: format(new Date(sale.sale_date), "MMM dd, yyyy"),
      Purpose: sale.customer_name,
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `sales_${item.name}.csv`);
  };

  // Download as PDF
  const downloadPDF = () => {
    const doc = new jsPDF();

    const tableData = filteredSales.map((sale) => [
      sale.quantity,
      format(new Date(sale.sale_date), "MMM dd, yyyy"),
      sale.customer_name,
    ]);

    // Use autoTable method
    (doc).autoTable({
      head: [["Quantity", "Date", "Purpose"]],
      body: tableData,
    });

    doc.save(`sales_${item.name}.pdf`);
  };

  // Edit a sale
  const handleEditSale = (sale: SalesItem) => {
    // Open a modal or form to edit the sale
    console.log("Edit sale:", sale);
  };

  // Delete a sale
  const handleDeleteSale = async (saleId: string) => {
    const { error } = await supabase.from("sales").delete().eq("id", saleId);
    if (error) {
      console.error("Error deleting sale:", error.message);
    } else {
      fetchSales(); // Refresh the sales list
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white text-black p-6 rounded-lg w-full max-w-4xl">
        <h2 className="text-2xl font-bold mb-4">Usage for {item.name}</h2>

        {/* Filter and Search Bar */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="All">All</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
              <option value="Yearly">Yearly</option>
            </select>
          </div>
          <input
            type="text"
            placeholder="Search by purpose..."
            className="p-2 border rounded"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Sales Table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full bg-gray-100 shadow-md rounded-lg">
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className="p-3">Quantity</th>
                <th className="p-3">Date</th>
                <th className="p-3">Purpose</th>
                <th className="p-3">Action</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.length > 0 ? (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="border-b border-gray-300 text-center">
                    <td className="p-3">{sale.quantity}</td>
                    <td className="p-3">{format(new Date(sale.sale_date), "MMM dd, yyyy")}</td>
                    <td className="p-3">{sale.customer_name}</td>
                    <td className="p-3">
                      <button
                        onClick={() => handleEditSale(sale)}
                        className="bg-blue-500 text-white px-3 py-1 rounded"
                      >
                        Edit
                      </button>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleDeleteSale(sale.id!)}
                        className="bg-red-500 text-white px-3 py-1 rounded"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center p-5 text-gray-500">No usage found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Download Buttons */}
        <div className="flex justify-end gap-2 mb-4">
          <button onClick={downloadCSV} className="bg-blue-500 text-white px-4 py-2 rounded">
            Download CSV
          </button>
          <button onClick={downloadPDF} className="bg-red-500 text-white px-4 py-2 rounded">
            Download PDF
          </button>
        </div>

        {/* Add Sales Button */}
        <div className="flex justify-end">
          <button onClick={() => setAddSalesModalOpen(true)} className="bg-green-500 text-white px-4 py-2 rounded">
            + Add 
          </button>
        </div>

        {/* Close Button */}
        <div className="flex justify-end mt-4">
          <button onClick={closeModal} className="bg-red-500 text-white px-4 py-2 rounded">
            Close
          </button>
        </div>

        {/* Add Sales Modal */}
        {addSalesModalOpen && <AddSalesModal item={item} closeModal={() => setAddSalesModalOpen(false)} refreshSales={fetchSales} />}
      </div>
    </div>
  );
}

// **Add Sales Modal**
function AddSalesModal({ item, closeModal, refreshSales }: AddSalesModalProps) {
  const [quantity, setQuantity] = useState<number>(0);
  const [customerName, setCustomerName] = useState<string>("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate quantity
    if (quantity <= 0) {
      alert("Quantity must be greater than 0.");
      return;
    }

    if (quantity > item.quantity) {
      alert("Not enough stock!");
      return;
    }

    // Insert the sale into the sales table
    const { error: saleError } = await supabase.from("sales").insert([
      {
        item_id: item.id,
        quantity,
        sale_date: new Date().toISOString().split("T")[0], // Current date in YYYY-MM-DD format
        customer_name: customerName,
      },
    ]);

    if (saleError) {
      console.error("Error adding sale:", saleError.message);
      return;
    }

    // Update the inventory quantity
    const { error: inventoryError } = await supabase
      .from("inventory")
      .update({ quantity: item.quantity - quantity })
      .eq("id", item.id);

    if (inventoryError) {
      console.error("Error updating inventory:", inventoryError.message);
      return;
    }

    // Close the modal and refresh the sales list
    closeModal();
    refreshSales();
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white text-black p-6 rounded-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Add usage for {item.name}</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="number"
            placeholder="Quantity"
            className="w-full p-2 mb-3 border"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            required
          />
          <input
            type="text"
            placeholder="Purpose"
            className="w-full p-2 mb-3 border"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
          />
          <div className="flex justify-between">
            <button type="button" onClick={closeModal} className="bg-gray-400 px-4 py-2 rounded">
              Cancel
            </button>
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}