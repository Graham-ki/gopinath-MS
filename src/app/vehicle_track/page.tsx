"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { saveAs } from "file-saver";
import Papa from "papaparse";
import jsPDF from "jspdf";
import "jspdf-autotable";


interface ImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className: string;
}

function Image(props: ImageProps) {
  return (
    <Image
      src={props.src}
      alt={props.alt}
      width={props.width}
      height={props.height}
      className={props.className}
    />
  );
}
// Define types for the vehicle tracking entry
interface VehicleEntry {
  id?: string;
  vehicle_number: string;
  arrival_time?: string;
  departure_time: string;
  destination: string;
  route: string;
  confirmation_status: boolean;
  fuel_used?: number;
  mileage?: number;
  comment?: string;
  item?: string;
}

// Define types for the proof entry
interface ProofEntry {
  id?: string;
  proof_url: string;
  vehicle_entry_id: string;
}

// Define types for the VehicleModal props
interface VehicleModalProps {
  entry: VehicleEntry | null;
  closeModal: () => void;
  refresh: () => void;
}

// Define types for the DetailsModal props
interface DetailsModalProps {
  entry: VehicleEntry;
  closeModal: () => void;
  refresh: () => void;
  openFuelUsageModal: () => void;
}

// Define types for the FuelUsageModal props
interface FuelUsageModalProps {
  entry: VehicleEntry;
  closeModal: () => void;
  refresh: () => void;
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL or Anon Key is missing in environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default function VehicleTracking() {
  const router = useRouter();
  const [entries, setEntries] = useState<VehicleEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<VehicleEntry[]>([]);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState<boolean>(false);
  const [fuelUsageModalOpen, setFuelUsageModalOpen] = useState<boolean>(false);
  const [editEntry, setEditEntry] = useState<VehicleEntry | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<VehicleEntry | null>(null);
  const [filter, setFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showNotice, setShowNotice] = useState<boolean>(true);

  // Check if the user is logged in and has the correct role
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        router.push("/login_track");
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (userError || !userData || userData.role !== 2) {
        return;
      }
    };

    checkAuth();
    fetchEntries();

    // Check if the notice has been dismissed
    const isNoticeDismissed = localStorage.getItem("noticeDismissed");
    if (isNoticeDismissed === "true") {
      setShowNotice(false);
    }
  }, [router]);

  // Fetch all vehicle entries from the database
  async function fetchEntries() {
    const { data, error } = await supabase.from("vehicle_tracking").select("*");
    if (error) {
      console.error("Error fetching vehicle entries:", error.message);
      return;
    }
    setEntries(data || []);
    setFilteredEntries(data || []);
  }

  // Apply filter based on the selected time period
  const applyFilter = (entries: VehicleEntry[], filterType: string) => {
    const today = new Date();
    switch (filterType) {
      case "Daily":
        return entries.filter((entry) => {
          const entryDate = new Date(entry.departure_time);
          return entryDate >= startOfDay(today) && entryDate <= endOfDay(today);
        });
      case "Weekly":
        return entries.filter((entry) => {
          const entryDate = new Date(entry.departure_time);
          return entryDate >= startOfWeek(today) && entryDate <= endOfWeek(today);
        });
      case "Monthly":
        return entries.filter((entry) => {
          const entryDate = new Date(entry.departure_time);
          return entryDate >= startOfMonth(today) && entryDate <= endOfMonth(today);
        });
      case "Yearly":
        return entries.filter((entry) => {
          const entryDate = new Date(entry.departure_time);
          return entryDate >= startOfYear(today) && entryDate <= endOfYear(today);
        });
      default:
        return entries; // "All"
    }
  };

  // Handle filter change
  useEffect(() => {
    const filtered = applyFilter(entries, filter);
    setFilteredEntries(filtered);
  }, [filter, entries]);

  // Handle search query change
  useEffect(() => {
    const filtered = entries.filter((entry) =>
      entry.vehicle_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.route.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredEntries(filtered);
  }, [searchQuery, entries]);

  // Calculate total fuel used and mileage
  const totalFuelUsed = filteredEntries.reduce((sum, entry) => sum + (entry.fuel_used || 0), 0);
  const totalMileage = filteredEntries.reduce((sum, entry) => sum + (entry.mileage || 0), 0);

  // Dismiss notice
  const dismissNotice = () => {
    setShowNotice(true);
    localStorage.setItem("noticeDismissed", "true");
  };

  // Download as CSV
  const downloadCSV = () => {
    const csvData = filteredEntries.map((entry) => ({
      "Vehicle Number": entry.vehicle_number,
      "Departure Time": format(new Date(entry.departure_time), "MMM dd, yyyy HH:mm"),
      "Destination": entry.destination,
      "Package": entry.item,
      "Route": entry.route,
      "Arrival Time": entry.arrival_time,
      "Status": entry.confirmation_status ? "Confirmed" : "Pending",
      "Fuel Used": entry.fuel_used + " Liters",
      "Mileage": entry.mileage + " KM",
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `vehicle_entries.csv`);
  };

  // Download as PDF
  const downloadPDF = () => {
    const doc = new jsPDF();
    const tableData = filteredEntries.map((entry) => [
      entry.vehicle_number,
      format(new Date(entry.departure_time), "MMM dd, yyyy HH:mm"),
      entry.destination,
      entry.route,
      entry.confirmation_status ? "Confirmed" : "Pending",
    ]);

    // Use autoTable method
    (doc).autoTable({
      head: [["Vehicle Number", "Departure Time", "Destination", "Route", "Arrival Time","Status","Fuel Used"]],
      body: tableData,
    });

    doc.save(`vehicle_entries.pdf`);
  };

  // Logout handler
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error.message);
    } else {
      router.push("/login_track");
    }
  };

  // Open modal for adding/editing entries
  const openModal = (entry: VehicleEntry | null = null) => {
    setEditEntry(entry);
    setModalOpen(true);
  };

  // Open details modal
  const openDetailsModal = (entry: VehicleEntry) => {
    setSelectedEntry(entry);
    setDetailsModalOpen(true);
  };

  // Open fuel usage modal
  const openFuelUsageModal = () => {
    setFuelUsageModalOpen(true);
  };

  // Handle delete entry
  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("vehicle_tracking").delete().eq("id", id);
    if (error) {
      console.error("Error deleting entry:", error.message);
    } else {
      fetchEntries();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <header className="mb-6 text-center">
        <h1 className="text-4xl font-bold">🚚 Vehicle Tracking Dashboard</h1>
        <p className="text-gray-300">Manage vehicle tracking and delivery status updates.</p>
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition duration-300"
        >
          Exit
        </button>
      </header>

      {/* Filter and Search Bar */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="p-2 border rounded bg-gray-800 text-white"
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
          placeholder="Search by vehicle number, destination, or route..."
          className="p-2 border rounded bg-gray-800 text-white"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-600 p-4 rounded-lg">
          <h2 className="text-xl font-bold">Total Fuel Used</h2>
          <p className="text-2xl">{totalFuelUsed.toFixed(2)} Liters</p>
        </div>
        <div className="bg-green-600 p-4 rounded-lg">
          <h2 className="text-xl font-bold">Total Mileage</h2>
          <p className="text-2xl">{totalMileage.toFixed(2)} KM</p>
        </div>
      </div>

      {/* Dismissible Notice */}
      {showNotice && (
        <div className="bg-yellow-600 p-4 rounded-lg mb-6 flex justify-between items-center">
          <p>
            Mileage and fuel for return journey is not included. To get the total, for return journey inclusive, just double the figures.
          </p>
          <button onClick={dismissNotice} className="text-white hover:text-gray-200">
            &times;
          </button>
        </div>
      )}

      {/* Add Entry Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => openModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Add Vehicle Entry
        </button>
      </div>

      {/* Vehicle Entries Table */}
      <div className="overflow-x-auto">
        <table className="w-full bg-gray-800 shadow-md rounded-lg">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="p-3">Vehicle Number</th>
              <th className="p-3">Departure Time</th>
              <th className="p-3">Destination</th>
              <th className="p-3">Package</th>
              <th className="p-3">Route</th>
              <th className="p-3">Arrival Time</th>
              <th className="p-3">Status</th>
              <th className="p-3">Fuel Used</th>
              <th className="p-3">Mileage</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.length > 0 ? (
              filteredEntries.map((entry) => (
                <tr key={entry.id} className="border-b border-gray-700 text-center">
                  <td className="p-3">{entry.vehicle_number}</td>
                  <td className="p-3">{format(new Date(entry.departure_time), "MMM dd, yyyy HH:mm")}</td>
                  <td className="p-3">{entry.destination}</td>
                  <td className="p-3">{entry.item}</td>
                  <td className="p-3">{entry.route}</td>
                  <td className="p-3">{entry.arrival_time}</td>
                  <td className="p-3">{entry.confirmation_status ? "Confirmed" : "Pending"}</td>
                  <td className="p-3">{entry.fuel_used} Liters</td>
                  <td className="p-3">{entry.mileage} KM</td>
                  <td className="p-3 flex justify-center gap-2">
                    <button onClick={() => openDetailsModal(entry)} className="bg-blue-500 text-white px-3 py-1 rounded">
                      More Details
                    </button>
                    <button onClick={() => openModal(entry)} className="bg-yellow-500 text-white px-3 py-1 rounded">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(entry.id!)} className="bg-red-500 text-white px-3 py-1 rounded">
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="text-center p-5 text-gray-300">No vehicle entries found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Download Buttons */}
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={downloadCSV} className="bg-blue-500 text-white px-4 py-2 rounded">
          Download CSV
        </button>
        <button onClick={downloadPDF} className="bg-red-500 text-white px-4 py-2 rounded">
          Download PDF
        </button>
      </div>

      {/* Modals */}
      {modalOpen && <VehicleModal entry={editEntry} closeModal={() => setModalOpen(false)} refresh={fetchEntries} />}
      {detailsModalOpen && selectedEntry && (
        <DetailsModal
          entry={selectedEntry}
          closeModal={() => setDetailsModalOpen(false)}
          refresh={fetchEntries}
          openFuelUsageModal={openFuelUsageModal}
        />
      )}
      {fuelUsageModalOpen && selectedEntry && (
        <FuelUsageModal entry={selectedEntry} closeModal={() => setFuelUsageModalOpen(false)} refresh={fetchEntries} />
      )}
    </div>
  );
}

// **Vehicle Add/Edit Modal**
function VehicleModal({ entry, closeModal, refresh }: VehicleModalProps) {
  const [formData, setFormData] = useState<VehicleEntry>(
    entry || {
      vehicle_number: "",
      departure_time: "",
      destination: "",
      route: "",
      confirmation_status: false,
      arrival_time: "Enroute",
      comment: "No Comment Provided yet",
      item: "",
      fuel_used: 0,
      mileage: 0,
    }
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const updatedFormData = {
      ...formData
    };

    if (entry) {
      await supabase.from("vehicle_tracking").update(updatedFormData).eq("id", entry.id);
    } else {
      await supabase.from("vehicle_tracking").insert([updatedFormData]);
    }
    closeModal();
    refresh();
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white text-black p-6 rounded-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">{entry ? "Edit Vehicle Entry" : "Add Vehicle Entry"}</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Vehicle Number"
            className="w-full p-2 mb-3 border"
            value={formData.vehicle_number}
            onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
            required
          />
          <input
            type="datetime-local"
            className="w-full p-2 mb-3 border"
            value={formData.departure_time.slice(0, 16)}
            onChange={(e) => setFormData({ ...formData, departure_time: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Destination (exact point of delivery)"
            className="w-full p-2 mb-3 border"
            value={formData.destination}
            onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Package/items"
            className="w-full p-2 mb-3 border"
            value={formData.item}
            onChange={(e) => setFormData({ ...formData, item: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Route"
            className="w-full p-2 mb-3 border"
            value={formData.route}
            onChange={(e) => setFormData({ ...formData, route: e.target.value })}
            required
          />
          <div className="flex justify-between">
            <button type="button" onClick={closeModal} className="bg-gray-400 px-4 py-2 rounded">
              Cancel
            </button>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
              {entry ? "Update" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// **Details Modal**
function DetailsModal({ entry, closeModal, refresh, openFuelUsageModal }: DetailsModalProps) {
  const [proof, setProof] = useState<ProofEntry | null>(null);

  // Fetch proof for the selected entry
  useEffect(() => {
    const fetchProof = async () => {
      const { data, error } = await supabase
        .from("proofs")
        .select("*")
        .eq("vehicle", entry.id)
        .maybeSingle(); // Use maybeSingle() to handle zero or one row

      if (error) {
        console.error("Error fetching proof:", error.message);
      } else if (!data) {
        console.log("No proof found for this entry.");
        console.log(entry.id);
        setProof(null); // Set proof to null if no data is found
      } else {
        console.log("Proof fetched successfully:");
        setProof(data); // Set proof if data is found
      }
    };

    fetchProof();
  }, [entry.id]);

  // Handle confirmation
  const handleConfirm = async () => {
    const { error } = await supabase
      .from("vehicle_tracking")
      .update({ confirmation_status: true })
      .eq("id", entry.id);

    if (error) {
      console.error("Error confirming entry:", error.message);
    } else {
      refresh();
      closeModal();
      openFuelUsageModal(); // Open the fuel usage modal after confirmation
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white text-black p-6 rounded-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Travel Details</h2>
        {/* Proof Image */}
        {proof && (
          <div className="mb-4">
            <Image
              src={proof.proof_url}
              alt="Travel Proof"
              width={200}
              height={150}
              className="mt-2 w-full rounded-lg"
            />
          </div>
        )}
        {/* Details Table */}
        <div className="space-y-4">
            <p><strong>Comment:</strong> {entry.comment}</p>
        </div>
        {/* Confirm Button */}
        <div className="flex justify-end mt-4">
          <button
            onClick={handleConfirm}
            disabled={entry.confirmation_status}
            className={`bg-green-600 text-white px-4 py-2 rounded ${
              entry.confirmation_status ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {entry.confirmation_status ? "Confirmed" : "Confirm"}
          </button>
        </div>
        {/* Close Button */}
        <div className="flex justify-end mt-4">
          <button onClick={closeModal} className="bg-gray-400 px-4 py-2 rounded">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// **Fuel Usage Modal**
function FuelUsageModal({ entry, closeModal, refresh }: FuelUsageModalProps) {
  const [fuelUsed, setFuelUsed] = useState<string>();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Update fuel used in the database
    const { error } = await supabase
      .from("vehicle_tracking")
      .update({ fuel_used: fuelUsed })
      .eq("id", entry.id);

    if (error) {
      console.error("Error updating fuel used:", error.message);
    } else {
      refresh();
      closeModal();
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white text-black p-6 rounded-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Enter Fuel Used </h2>
        <form onSubmit={handleSubmit}>
          <input
            type="number"
            placeholder="Fuel Used (Liters)"
            className="w-full p-2 mb-3 border"
            value={fuelUsed}
            onChange={(e) => setFuelUsed(e.target.value)}
            required
          />
          <div className="flex justify-between">
            <button type="button" onClick={closeModal} className="bg-gray-400 px-4 py-2 rounded">
              Cancel
            </button>
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}