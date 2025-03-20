"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { saveAs } from "file-saver";
import Papa from "papaparse";
import jsPDF from "jspdf";
import "jspdf-autotable";

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
  comment?: string;
}

// Define types for the proof entry


// Define types for the CommentModal props
interface CommentModalProps {
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
  const [commentModalOpen, setCommentModalOpen] = useState<boolean>(false);
  const [selectedEntry, setSelectedEntry] = useState<VehicleEntry | null>(null);
  const [filter, setFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Check if the user is logged in and has the correct role
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        router.push("/login_tracker"); // Redirect to login page if not logged in
        return;
      }

      // Fetch user role from the database
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (userError || !userData || userData.role !== 3) {
        //router.push("/unauthorized"); // Redirect to unauthorized page
        return;
      }
    };

    checkAuth();
    fetchEntries();
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

  // Download as CSV
  const downloadCSV = () => {
    const csvData = filteredEntries.map((entry) => ({
      "Vehicle Number": entry.vehicle_number,
      "Departure Time": format(new Date(entry.departure_time), "MMM dd, yyyy HH:mm"),
      "Destination": entry.destination,
      "Route": entry.route,
      "Arrival Time": entry.arrival_time,
      "Status": entry.confirmation_status ? "Confirmed" : "Pending",
      "Fuel Used": entry.fuel_used + " Liters"
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
    (doc ).autoTable({
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
      router.push("/login_tracker");
    }
  };

  // Open comment modal
  const openCommentModal = (entry: VehicleEntry) => {
    setSelectedEntry(entry);
    setCommentModalOpen(true);
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

      {/* Vehicle Entries Table */}
      <div className="overflow-x-auto">
        <table className="w-full bg-gray-800 shadow-md rounded-lg">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="p-3">Vehicle Number</th>
              <th className="p-3">Departure Time</th>
              <th className="p-3">Destination</th>
              <th className="p-3">Route</th>
              <th className="p-3">Arrival Time</th>
              <th className="p-3"> Status</th>
              <th className="p-3">Fuel Used</th>
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
                  <td className="p-3">{entry.route}</td>
                  <td className="p-3">{entry.arrival_time}</td>
                  <td className="p-3">{entry.confirmation_status ? "Confirmed" : "Pending"}</td>
                  <td className="p-3">{entry.fuel_used} Liters</td>
                  <td className="p-3 flex justify-center gap-2">
                    <button onClick={() => openCommentModal(entry)} className="bg-blue-500 text-white px-3 py-1 rounded">
                      Comment
                    </button>
                    <button onClick={() => handleDelete(entry.id!)} className="bg-red-500 text-white px-3 py-1 rounded">
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center p-5 text-gray-300">No vehicle entries found.</td>
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

      {/* Comment Modal */}
      {commentModalOpen && selectedEntry && (
        <CommentModal entry={selectedEntry} closeModal={() => setCommentModalOpen(false)} refresh={fetchEntries} />
      )}
    </div>
  );
}

// **Comment Modal**
function CommentModal({ entry, closeModal, refresh }: CommentModalProps) {
  const [comment, setComment] = useState<string>("");
  const [arrivalTime, setArrivalTime] = useState<string>("");
  const [mileage, setMileage] = useState<string>("");
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    // Check if the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("User is not authenticated:", authError?.message);
      alert("You must be logged in to add a comment.");
      return;
    }
  
    console.log("Authenticated user:", user);
  
    // Upload image to Supabase Storage
    /* let imageUrl = "";
    if (image) {
      console.log("Uploading image...");
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("app-images")
        .upload(`images/${image.name}`, image);
  
      if (uploadError) {
        console.error("Error uploading image:", uploadError.message);
        alert("Failed to upload image. Please try again.");
        return;
      }
  
      imageUrl = uploadData?.path || "";
      console.log("Image uploaded successfully:", imageUrl);
    }
    
    // Insert comment into the comments table
    console.log("Inserting comment...");
    const { error: commentError } = await supabase
      .from("travel_comments")
      .insert([
        {
          vehicle_id: entry.id,
          comment,
           // Associate the comment with the authenticated user
        },
      ]);
  
    if (commentError) {
      console.error("Error inserting comment:", commentError.message);
      alert("Failed to add comment. Please check your permissions.");
      return;
    }
  
    console.log("Comment inserted successfully.");*/
  
    // Update arrival time in the vehicle_tracking table
    console.log("Updating arrival time...");
    const { error: vehicleError } = await supabase
      .from("vehicle_tracking")
      .update({ arrival_time: arrivalTime,mileage:mileage,comment:comment })
      .eq("id", entry.id);
  
    if (vehicleError) {
      console.error("Error updating arrival time:", vehicleError.message);
      alert("Failed to update arrival time. Please try again.");
      return;
    }
  
    console.log("Arrival time updated successfully.");
    alert("Comment added successfully.");
    closeModal();
    refresh();
  };
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white text-black p-6 rounded-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Add Comment</h2>
        <form onSubmit={handleSubmit}>
          <textarea
            placeholder="Comment"
            className="w-full p-2 mb-3 border"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
          />
          <input
            type="datetime-local"
            className="w-full p-2 mb-3 border"
            value={arrivalTime}
            onChange={(e) => setArrivalTime(e.target.value)}
            required
          />
          <input
            type="text"
            value={mileage}
            className="w-full p-2 mb-3 border"
            onChange={(e) => setMileage(e.target.value)}
            required
            placeholder="Mileage"
          />
          <div className="flex justify-between">
            <button type="button" onClick={closeModal} className="bg-gray-400 px-4 py-2 rounded">
              Cancel
            </button>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}