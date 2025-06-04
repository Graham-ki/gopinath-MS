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
    <picture>
      <source type="image/webp" srcSet={`${props.src}.webp`} />
      <source type="image/jpeg" srcSet={props.src} />
      <img
        src={props.src}
        alt={props.alt}
        width={props.width}
        height={props.height}
        className={props.className}
        decoding="async"
      />
    </picture>
  );
}

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

interface ProofEntry {
  id?: string;
  proof_url: string;
  vehicle_entry_id: string;
}

interface VehicleModalProps {
  entry: VehicleEntry | null;
  closeModal: () => void;
  refresh: () => void;
}

interface DetailsModalProps {
  entry: VehicleEntry;
  closeModal: () => void;
  refresh: () => void;
  openFuelUsageModal: () => void;
}

interface FuelUsageModalProps {
  entry: VehicleEntry;
  closeModal: () => void;
  refresh: () => void;
}

type TimeFilter = "All" | "Today" | "This Week" | "This Month" | "Custom Range";
interface DateRange {
  start: Date;
  end: Date;
}

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
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("All");
  const [customRange, setCustomRange] = useState<DateRange>({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showNotice, setShowNotice] = useState<boolean>(true);

  function formatDateSafe(dateString: string | number | Date, fallback = "Enroute") {
    if (!dateString) return fallback;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? fallback : format(date, "MMM dd, yyyy HH:mm");
  }

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

    const isNoticeDismissed = localStorage.getItem("noticeDismissed");
    if (isNoticeDismissed === "true") {
      setShowNotice(false);
    }
  }, [router]);

  async function fetchEntries() {
    const { data, error } = await supabase.from("vehicle_tracking").select("*");
    if (error) {
      console.error("Error fetching vehicle entries:", error.message);
      return;
    }
    setEntries(data || []);
  }

  const applyTimeFilter = (entries: VehicleEntry[], filter: TimeFilter, range?: DateRange) => {
    const now = new Date();
    
    switch (filter) {
      case "Today":
        return entries.filter(entry => {
          const departure = new Date(entry.departure_time);
          return departure >= startOfDay(now) && departure <= endOfDay(now);
        });
        
      case "This Week":
        return entries.filter(entry => {
          const departure = new Date(entry.departure_time);
          return departure >= startOfWeek(now) && departure <= endOfWeek(now);
        });
        
      case "This Month":
        return entries.filter(entry => {
          const departure = new Date(entry.departure_time);
          return departure >= startOfMonth(now) && departure <= endOfMonth(now);
        });
        
      case "Custom Range":
        if (!range) return entries;
        return entries.filter(entry => {
          const departure = new Date(entry.departure_time);
          return departure >= range.start && departure <= range.end;
        });
        
      default:
        return entries;
    }
  };

  useEffect(() => {
    let filtered = entries;
    
    filtered = applyTimeFilter(filtered, timeFilter, customRange);
    
    if (searchQuery) {
      filtered = filtered.filter((entry) =>
        entry.vehicle_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.route.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredEntries(filtered);
  }, [entries, timeFilter, customRange, searchQuery]);

  const totalFuelUsed = filteredEntries.reduce((sum, entry) => sum + (entry.fuel_used || 0), 0);
  const totalMileage = filteredEntries.reduce((sum, entry) => sum + (entry.mileage || 0), 0);

  const dismissNotice = () => {
    setShowNotice(false);
    localStorage.setItem("noticeDismissed", "true");
  };

  const downloadCSV = () => {
    const csvData = filteredEntries.map((entry) => ({
      "Vehicle Number": entry.vehicle_number,
      "Departure Time": format(new Date(entry.departure_time), "MMM dd, yyyy HH:mm"),
      "Destination": entry.destination,
      "Package": entry.item,
      "Route": entry.route,
      "Arrival Time": formatDateSafe(entry.arrival_time),
      "Status": entry.confirmation_status ? "Confirmed" : "Pending",
      "Fuel Used": entry.fuel_used + " Liters",
      "Mileage": entry.mileage + " KM",
    }));
    
    let fileName = "vehicle_entries";
    if (timeFilter !== "All") {
      fileName += `_${timeFilter.toLowerCase().replace(" ", "_")}`;
    }
    if (timeFilter === "Custom Range") {
      fileName += `_${format(customRange.start, "yyyyMMdd")}-${format(customRange.end, "yyyyMMdd")}`;
    }
    
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `${fileName}.csv`);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    
    if (timeFilter !== "All") {
      doc.text(`Filter: ${timeFilter}`, 14, 20);
      if (timeFilter === "Custom Range") {
        doc.text(
          `Date Range: ${format(customRange.start, "MMM dd, yyyy")} - ${format(customRange.end, "MMM dd, yyyy")}`,
          14,
          30
        );
      }
    }
    
    const tableData = filteredEntries.map((entry) => [
      entry.vehicle_number,
      format(new Date(entry.departure_time), "MMM dd, yyyy HH:mm"),
      entry.destination,
      entry.route,
      formatDateSafe(entry.arrival_time),
      entry.confirmation_status ? "Confirmed" : "Pending",
      entry.fuel_used + " L",
    ]);

    doc.autoTable({
      head: [["Vehicle Number", "Departure Time", "Destination", "Route", "Arrival Time", "Status", "Fuel Used"]],
      body: tableData,
      startY: timeFilter === "All" ? 20 : 40,
    });

    let fileName = "vehicle_entries";
    if (timeFilter !== "All") {
      fileName += `_${timeFilter.toLowerCase().replace(" ", "_")}`;
    }
    if (timeFilter === "Custom Range") {
      fileName += `_${format(customRange.start, "yyyyMMdd")}-${format(customRange.end, "yyyyMMdd")}`;
    }
    
    doc.save(`${fileName}.pdf`);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error.message);
    } else {
      router.push("/login_track");
    }
  };

  const openModal = (entry: VehicleEntry | null = null) => {
    setEditEntry(entry);
    setModalOpen(true);
  };

  const openDetailsModal = (entry: VehicleEntry) => {
    setSelectedEntry(entry);
    setDetailsModalOpen(true);
  };

  const openFuelUsageModal = () => {
    setFuelUsageModalOpen(true);
  };

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
      <header className="mb-6 text-center">
        <h1 className="text-4xl font-bold">🚚 Vehicle Tracking Dashboard</h1>
        <p className="text-gray-300">Manage vehicle tracking and delivery status updates.</p>
        <button
          onClick={handleLogout}
          className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition duration-300"
        >
          Exit
        </button>
      </header>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
            className="p-2 border rounded bg-gray-800 text-white"
          >
            <option value="All">All Entries</option>
            <option value="Today">Today</option>
            <option value="This Week">This Week</option>
            <option value="This Month">This Month</option>
            <option value="Custom Range">Custom Range</option>
          </select>

          {timeFilter === "Custom Range" && (
            <div className="flex gap-2">
              <input
                type="date"
                value={format(customRange.start, "yyyy-MM-dd")}
                onChange={(e) => setCustomRange({
                  ...customRange,
                  start: e.target.value ? new Date(e.target.value) : new Date()
                })}
                className="p-2 border rounded bg-gray-800 text-white"
              />
              <span className="flex items-center">to</span>
              <input
                type="date"
                value={format(customRange.end, "yyyy-MM-dd")}
                onChange={(e) => setCustomRange({
                  ...customRange,
                  end: e.target.value ? new Date(e.target.value) : new Date()
                })}
                className="p-2 border rounded bg-gray-800 text-white"
              />
            </div>
          )}
        </div>
        
        <input
          type="text"
          placeholder="Search by vehicle number, destination, or route..."
          className="p-2 border rounded bg-gray-800 text-white w-full md:w-auto"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

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

      <div className="flex justify-end mb-4">
        <button
          onClick={() => openModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Add Vehicle Entry
        </button>
      </div>

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
                  <td className="p-3">
                    {formatDateSafe(entry.arrival_time)}
                  </td>
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
                <td colSpan={10} className="text-center p-5 text-gray-300">No vehicle entries found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <button onClick={downloadCSV} className="bg-blue-500 text-white px-4 py-2 rounded">
          Download CSV
        </button>
        <button onClick={downloadPDF} className="bg-red-500 text-white px-4 py-2 rounded">
          Download PDF
        </button>
      </div>

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
  const [vehicleSuggestions, setVehicleSuggestions] = useState<string[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<string[]>([]);
  const [showVehicleSuggestions, setShowVehicleSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);

  useEffect(() => {
    const fetchSuggestions = async () => {
      const { data: vehicles, error: vehicleError } = await supabase
        .from("vehicle_tracking")
        .select("vehicle_number")
        .order("vehicle_number", { ascending: true });

      const { data: destinations, error: destinationError } = await supabase
        .from("vehicle_tracking")
        .select("destination, route")
        .order("destination", { ascending: true });

      if (!vehicleError && vehicles) {
        const uniqueVehicles = [...new Set(vehicles.map(v => v.vehicle_number))];
        setVehicleSuggestions(uniqueVehicles);
      }

      if (!destinationError && destinations) {
        const uniqueDestinations = [...new Set(destinations.map(d => d.destination))];
        setDestinationSuggestions(uniqueDestinations);
      }
    };

    fetchSuggestions();
  }, []);

  const handleVehicleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, vehicle_number: value });
    setShowVehicleSuggestions(value.length > 0);
  };

  const handleDestinationChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, destination: value });
    setShowDestinationSuggestions(value.length > 0);
  };

  const selectVehicleSuggestion = (vehicle: string) => {
    setFormData({ ...formData, vehicle_number: vehicle });
    setShowVehicleSuggestions(false);
  };

  const selectDestinationSuggestion = async (destination: string) => {
    setFormData({ ...formData, destination });
    setShowDestinationSuggestions(false);
    
    const { data, error } = await supabase
      .from("vehicle_tracking")
      .select("route")
      .eq("destination", destination)
      .order("departure_time", { ascending: false })
      .limit(1);

    if (!error && data && data[0]?.route) {
      setFormData(prev => ({ ...prev, route: data[0].route }));
    }
  };

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
          <div className="relative mb-3">
            <input
              type="text"
              placeholder="Vehicle Number"
              className="w-full p-2 border"
              value={formData.vehicle_number}
              onChange={handleVehicleNumberChange}
              required
            />
            {showVehicleSuggestions && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-auto">
                {vehicleSuggestions
                  .filter(v => v.toLowerCase().includes(formData.vehicle_number.toLowerCase()))
                  .map((vehicle, index) => (
                    <div
                      key={index}
                      className="p-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => selectVehicleSuggestion(vehicle)}
                    >
                      {vehicle}
                    </div>
                  ))}
              </div>
            )}
          </div>
          
          <input
            type="datetime-local"
            className="w-full p-2 mb-3 border"
            value={formData.departure_time.slice(0, 16)}
            onChange={(e) => setFormData({ ...formData, departure_time: e.target.value })}
            required
          />
          
          <div className="relative mb-3">
            <input
              type="text"
              placeholder="Destination (exact point of delivery)"
              className="w-full p-2 border"
              value={formData.destination}
              onChange={handleDestinationChange}
              required
            />
            {showDestinationSuggestions && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-auto">
                {destinationSuggestions
                  .filter(d => d.toLowerCase().includes(formData.destination.toLowerCase()))
                  .map((destination, index) => (
                    <div
                      key={index}
                      className="p-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => selectDestinationSuggestion(destination)}
                    >
                      {destination}
                    </div>
                  ))}
              </div>
            )}
          </div>
          
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

function DetailsModal({ entry, closeModal, refresh, openFuelUsageModal }: DetailsModalProps) {
  const [proof, setProof] = useState<ProofEntry | null>(null);

  useEffect(() => {
    const fetchProof = async () => {
      const { data, error } = await supabase
        .from("proofs")
        .select("*")
        .eq("vehicle", entry.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching proof:", error.message);
      } else if (!data) {
        console.log("No proof found for this entry.");
        console.log(entry.id);
        setProof(null);
      } else {
        console.log("Proof fetched successfully:");
        setProof(data);
      }
    };

    fetchProof();
  }, [entry.id]);

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
      openFuelUsageModal();
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white text-black p-6 rounded-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Travel Details</h2>
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
        <div className="space-y-4">
            <p><strong>Comment:</strong> {entry.comment}</p>
        </div>
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
        <div className="flex justify-end mt-4">
          <button onClick={closeModal} className="bg-gray-400 px-4 py-2 rounded">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function FuelUsageModal({ entry, closeModal, refresh }: FuelUsageModalProps) {
  const [fuelUsed, setFuelUsed] = useState<string>();
  const [fuelingDate, setFuelingDate] = useState<string>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase
      .from("vehicle_tracking")
      .update({ fuel_used: fuelUsed, fuelinng_date: fuelingDate })
      .eq("id", entry.id);

    if (error) {
      console.error("Error updating fuel used:", error.message);
    } else {
      alert("Fuel used updated successfully.");
      refresh();
      closeModal();
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white text-black p-6 rounded-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Enter Fuel Used and date of fueling</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="number"
            placeholder="Fuel Used (Liters)"
            className="w-full p-2 mb-3 border"
            value={fuelUsed}
            onChange={(e) => setFuelUsed(e.target.value)}
            required
          />
          <input
            type="datetime-local"
            className="w-full p-2 mb-3 border"
            placeholder="Fueling Date"
            required
            value={fuelingDate}
            onChange={(e) => setFuelingDate(e.target.value)}
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
