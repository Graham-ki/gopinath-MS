"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { 
  format, 
  parseISO, 
  differenceInHours,
  differenceInMinutes,
  startOfDay,
  startOfWeek, 
  startOfMonth, 
  startOfYear 
} from "date-fns";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line 
} from "recharts";

// Destination data with fuel, time, and cost estimates
const DESTINATION_DATA: Record<string, {fuel: number, time: number, cost: number}> = {
  Mbarara: { fuel: 390, time: 12, cost: 100000 },
  Arua: { fuel: 510, time: 24, cost: 100000 },
  Lira: { fuel: 220, time: 6, cost: 70000 },
  Mityana: { fuel: 210, time: 7, cost: 70000 },
  Kampala: { fuel: 170, time: 5, cost: 70000 },
  Soroti: { fuel: 100, time: 3, cost: 70000 },
  Jinja: { fuel: 90, time: 3, cost: 50000 },
  Mukono: { fuel: 160, time: 4, cost: 70000 },
  Mpigi: { fuel: 175, time: 6, cost: 70000 },
  Mbale: { fuel: 15, time: 1, cost: 15000 },
  Gulu: { fuel: 240, time: 7, cost: 100000 },
  Luweero: { fuel: 190, time: 5, cost: 100000 },
  Bweyale: { fuel: 230, time: 6, cost: 100000 }
};

// Emoji Constants
const EMOJI = {
  TRUCK: "🚚",
  CLOCK: "⏱️",
  DOLLAR: "💵",
  TREND_UP: "📈",
  TREND_DOWN: "📉",
  CHART: "📊",
  MAP: "🗺️",
  ALERT: "⚠️",
  CALENDAR: "📅",
  FILTER: "🔍",
  SEARCH: "🔎",
  REFRESH: "🔄",
  SUCCESS: "✅",
  FAILED: "❌",
  WARNING: "⚠️",
  MAINTENANCE: "🛠️",
  ROUTE: "🛣️",
  INFO: "ℹ️",
  ENROUTE: "🛣️➡️"
};

// Types
interface VehicleEntry {
  id: string;
  vehicle_number: string;
  departure_time: string;
  arrival_time: string;
  destination: string;
  route: string;
  mileage: number;
  fuel_used: number;
  comment: string;
  return_comment?: string;
  return_comment_date?: string;
}

interface VehicleStats {
  vehicle: string;
  trips: number;
  onTime: number;
  delayed: number;
  void: number;
  enroute: number;
  totalFuel: number;
  totalMileage: number;
  totalCost: number;
  maintenanceAdvisory: string;
  destinations: Record<string, {
    trips: number;
    fuel: number;
    cost: number;
    onTime: number;
    delayed: number;
  }>;
}

interface RoutePerformance {
  destination: string;
  vehicles: number;
  totalFuel: number;
  totalCost: number;
  tripCount: number;
}

type TripStatus = "onTime" | "delayed" | "void" | "enroute";

const TIME_RANGES = [
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "all", label: "All Time" }
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const LogisticsDashboard = () => {
  const [entries, setEntries] = useState<VehicleEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<VehicleEntry[]>([]);
  const [timeRange, setTimeRange] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<{
    vehicle: string;
    destination: string;
  } | null>(null);
  const [kpiDetails, setKpiDetails] = useState<{
    type: TripStatus | null;
    data: VehicleEntry[];
  }>({ type: null, data: [] });

  // Data cleaning
  const cleanEntry = useCallback((entry: VehicleEntry): VehicleEntry => ({
    ...entry,
    vehicle_number: entry.vehicle_number.trim().replace(/\s+/g, ' '),
    destination: entry.destination.trim(),
    comment: entry.comment?.trim() || "",
    return_comment: entry.return_comment?.trim() || undefined,
    return_comment_date: entry.return_comment_date?.trim() || undefined
  }), []);

  // Filtering
  const applyFilters = useCallback((data: VehicleEntry[], range: string, query: string) => {
    let filtered = [...data];
    
    // Time range filter
    if (range !== "all") {
      const now = new Date();
      switch (range) {
        case "week":
          filtered = filtered.filter(e => new Date(e.departure_time) >= startOfWeek(now));
          break;
        case "month":
          filtered = filtered.filter(e => new Date(e.departure_time) >= startOfMonth(now));
          break;
        case "year":
          filtered = filtered.filter(e => new Date(e.departure_time) >= startOfYear(now));
          break;
      }
    }

    // Search filter
    if (query) {
      filtered = filtered.filter(e => 
        e.vehicle_number.toLowerCase().includes(query.toLowerCase()) ||
        e.destination.toLowerCase().includes(query.toLowerCase())
      );
    }

    setFilteredEntries(filtered);
  }, []);

  // Fetch data only once on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log("Fetching data from Supabase...");
        const { data, error: supabaseError } = await supabase.from("vehicle_tracking").select("*");
        
        if (supabaseError) {
          console.error("Supabase error:", supabaseError);
          setError(`Failed to load data: ${supabaseError.message}`);
          setEntries([]);
        } else if (data) {
          console.log("Data received, entries:", data.length);
          const cleanedData = data.map(cleanEntry);
          setEntries(cleanedData);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("An unexpected error occurred while loading data");
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [cleanEntry]);

  // Apply filters whenever entries, timeRange, or searchQuery changes
  useEffect(() => {
    if (entries.length > 0) {
      console.log("Applying filters to", entries.length, "entries");
      applyFilters(entries, timeRange, searchQuery);
    } else {
      setFilteredEntries([]);
    }
  }, [entries, timeRange, searchQuery, applyFilters]);

  // Calculate trip duration in hours (using only date from departure and full datetime from arrival)
  const calculateTripDuration = (departure: string, arrival: string) => {
    if (!departure || !arrival) return 0;
    try {
      const depDate = startOfDay(parseISO(departure)); // Use only the date part of departure
      const arr = parseISO(arrival); // Use full datetime from arrival
      
      // Ensure arrival is after departure to prevent negative durations
      if (arr < depDate) return 0;
      
      const hours = differenceInHours(arr, depDate);
      const minutes = differenceInMinutes(arr, depDate) % 60;
      return parseFloat((hours + minutes / 60).toFixed(1)); // Round to 1 decimal place
    } catch (e) {
      console.error("Error calculating trip duration:", e);
      return 0;
    }
  };

  // Determine trip status based on comment
  const getTripStatus = (entry: VehicleEntry): TripStatus => {
    const comment = entry.comment?.toLowerCase() || "";
    
    if (comment === "reached") {
      const destination = entry.destination as keyof typeof DESTINATION_DATA;
      const expectedTime = DESTINATION_DATA[destination]?.time || 0;
      if (!expectedTime) return "onTime";
      
      const actualTime = calculateTripDuration(entry.departure_time, entry.arrival_time);
      return actualTime <= expectedTime * 1.1 ? "onTime" : "delayed";
    }
    
    if (comment === "did not go") return "void";
    if (comment === "no comment provided yet" || comment === "") return "enroute";
    
    return "void"; // Any other comment is considered void
  };

  // Key metrics
  const calculateKPIs = () => {
    const statusCounts = filteredEntries.reduce((acc: Record<TripStatus, number>, entry) => {
      const status = getTripStatus(entry);
      acc[status]++;
      return acc;
    }, { onTime: 0, delayed: 0, void: 0, enroute: 0 });

    const successfulTrips = statusCounts.onTime + statusCounts.delayed;
    const completedTrips = successfulTrips + statusCounts.void;
    const totalEntries = filteredEntries.length;
    
    return {
      onTimeRate: successfulTrips > 0 ? (statusCounts.onTime / successfulTrips) * 100 : 0,
      delayRate: successfulTrips > 0 ? (statusCounts.delayed / successfulTrips) * 100 : 0,
      voidRate: completedTrips > 0 ? (statusCounts.void / completedTrips) * 100 : 0,
      enrouteRate: totalEntries > 0 ? (statusCounts.enroute / totalEntries) * 100 : 0,
      totalTrips: completedTrips,
      totalEnroute: statusCounts.enroute,
      statusCounts
    };
  };

  // Get trips by status
  const getTripsByStatus = (status: TripStatus) => {
    return filteredEntries.filter(entry => getTripStatus(entry) === status);
  };

  // Vehicle statistics
  const getVehicleStats = (): VehicleStats[] => {
    const vehicleMap = new Map<string, VehicleStats>();
    
    filteredEntries.forEach(entry => {
      const destination = entry.destination as keyof typeof DESTINATION_DATA;
      const destinationData = DESTINATION_DATA[destination] || { fuel: 0, cost: 0, time: 0 };
      const status = getTripStatus(entry);
      
      if (!vehicleMap.has(entry.vehicle_number)) {
        vehicleMap.set(entry.vehicle_number, {
          vehicle: entry.vehicle_number,
          trips: 0,
          onTime: 0,
          delayed: 0,
          void: 0,
          enroute: 0,
          totalFuel: 0,
          totalMileage: 0,
          totalCost: 0,
          maintenanceAdvisory: "",
          destinations: {}
        });
      }
      
      const vehicle = vehicleMap.get(entry.vehicle_number)!;
      vehicle.trips++;
      vehicle[status]++;
      vehicle.totalMileage += entry.mileage || 0;
      
      // Only count fuel and cost for successful trips
      if (status === "onTime" || status === "delayed") {
        vehicle.totalFuel += destinationData.fuel;
        vehicle.totalCost += destinationData.cost;
      }
      
      // Track destination-specific stats
      if (!vehicle.destinations[entry.destination]) {
        vehicle.destinations[entry.destination] = {
          trips: 0,
          fuel: 0,
          cost: 0,
          onTime: 0,
          delayed: 0
        };
      }
      
      const destStats = vehicle.destinations[entry.destination];
      destStats.trips++;
      if (status === "onTime" || status === "delayed") {
        destStats.fuel += destinationData.fuel;
        destStats.cost += destinationData.cost;
        if (status === "onTime") destStats.onTime++;
        if (status === "delayed") destStats.delayed++;
      }
    });

    // Add maintenance advisory
    vehicleMap.forEach(vehicle => {
      vehicle.maintenanceAdvisory = getMaintenanceAdvisory(vehicle.totalMileage, vehicle.trips);
    });

    return Array.from(vehicleMap.values());
  };

  // Maintenance advisory based on mileage and number of trips
  const getMaintenanceAdvisory = (mileage: number, trips: number) => {
    if (mileage > 100000) return "Engine overhaul needed - immediate";
    if (mileage > 50000) return "Major service due - within 2 weeks";
    if (mileage > 25000) return "Routine maintenance - within 1 month";
    if (trips > 50) return "Inspect brakes and tires - soon";
    return "No immediate maintenance needed";
  };

  // Route performance - most reached destinations
  const getRoutePerformance = (): RoutePerformance[] => {
    const routeMap = new Map<string, RoutePerformance>();
    const vehicleSetMap = new Map<string, Set<string>>();
    
    filteredEntries.forEach(entry => {
      if (getTripStatus(entry) !== "onTime" && getTripStatus(entry) !== "delayed") return;
      
      const destination = entry.destination as keyof typeof DESTINATION_DATA;
      const destinationData = DESTINATION_DATA[destination] || { fuel: 0, cost: 0 };
      
      if (!routeMap.has(entry.destination)) {
        routeMap.set(entry.destination, {
          destination: entry.destination,
          vehicles: 0,
          totalFuel: 0,
          totalCost: 0,
          tripCount: 0
        });
        vehicleSetMap.set(entry.destination, new Set());
      }
      
      const route = routeMap.get(entry.destination)!;
      const vehicles = vehicleSetMap.get(entry.destination)!;
      
      route.tripCount++;
      route.totalFuel += destinationData.fuel;
      route.totalCost += destinationData.cost;
      vehicles.add(entry.vehicle_number);
      route.vehicles = vehicles.size;
    });

    return Array.from(routeMap.values()).sort((a, b) => b.tripCount - a.tripCount);
  };

  // Get top performing vehicles (most trips, highest cost, fuel consumption)
  const getTopVehicles = () => {
    const stats = getVehicleStats();
    return stats
      .sort((a, b) => b.trips - a.trips)
      .slice(0, 5)
      .map(vehicle => ({
        vehicle: vehicle.vehicle,
        trips: vehicle.trips,
        totalCost: vehicle.totalCost,
        totalFuel: vehicle.totalFuel,
        efficiency: vehicle.totalFuel > 0 ? (vehicle.totalMileage / vehicle.totalFuel).toFixed(1) : "0"
      }));
  };

  const { onTimeRate, delayRate, voidRate, enrouteRate, totalEnroute, statusCounts } = calculateKPIs();
  const vehicleStats = getVehicleStats();
  const routePerformance = getRoutePerformance();
  const topVehicles = getTopVehicles();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading fleet analytics data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6 flex items-center justify-center text-black">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">
            {EMOJI.TRUCK} MTS Delivery Analytics Dashboard
          </h1>
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-4">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition mx-auto"
          >
            <span>{EMOJI.REFRESH}</span>
            <span>Try Again</span>
          </button>
          <div className="mt-6 text-left text-sm bg-gray-50 p-3 rounded-lg">
            <p className="font-medium">Debug Information:</p>
            <p>Supabase URL: {supabaseUrl ? "Configured" : "Not configured"}</p>
            <p>Entries in state: {entries.length}</p>
          </div>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6 flex items-center justify-center text-black">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {EMOJI.TRUCK} MTS Delivery Analytics Dashboard
          </h1>
          <p className="text-gray-600 mb-6">No vehicle tracking data available in the database</p>
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition mx-auto"
          >
            <span>{EMOJI.REFRESH}</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>
    );
  }

  if (filteredEntries.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6 text-black">
        <header className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
            {EMOJI.TRUCK} MTS Delivery Analytics Dashboard
          </h1>
          <p className="text-gray-600">Monitor fleet performance and delivery metrics</p>
        </header>

        <div className="bg-yellow-50 p-4 rounded-lg mb-6">
          <h3 className="font-medium flex items-center gap-2">
            {EMOJI.WARNING} No data matches current filters
          </h3>
          <div className="mt-3 space-y-2">
            <p>Total entries in database: {entries.length}</p>
            <p>Current time range: {TIME_RANGES.find(r => r.value === timeRange)?.label}</p>
            <p>Search query: {searchQuery || "None"}</p>
            <p>Last fetched: {new Date().toLocaleString()}</p>
          </div>
          <button 
            onClick={() => {
              setTimeRange("all");
              setSearchQuery("");
            }}
            className="mt-4 flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            {EMOJI.REFRESH} Reset filters
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <header className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
          {EMOJI.TRUCK} MTS Delivery Analytics Dashboard
        </h1>
        <p className="text-gray-600">Monitor fleet performance and delivery metrics</p>
      </header>

      {/* Filters */}
      <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm mb-4 md:mb-6 flex flex-wrap items-center gap-3 text-black">
        <div className="relative flex-1 min-w-[180px]">
          <span className="absolute left-3 top-3 text-gray-400">{EMOJI.SEARCH}</span>
          <input
            type="text"
            placeholder="Search by vehicle or destination..."
            className="pl-9 pr-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
          />
        </div>
        
        <div className="flex items-center gap-2 bg-gray-100 p-1 md:p-2 rounded-lg">
          <span>{EMOJI.FILTER}</span>
          <select
            className="bg-transparent py-1 text-sm md:text-base focus:outline-none"
            value={timeRange}
            onChange={(e) => {
              setTimeRange(e.target.value);
            }}
          >
            {TIME_RANGES.map((range) => (
              <option key={range.value} value={range.value}>{range.label}</option>
            ))}
          </select>
        </div>
        
        <button 
          onClick={() => {
            setLoading(true);
            setTimeout(() => {
              setLoading(false);
            }, 500);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <span className={`${loading ? "animate-spin" : ""}`}>{EMOJI.REFRESH}</span>
          <span className="hidden md:inline">Refresh Data</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6 text-black">
        <KPICard 
          title="On-Time Deliveries" 
          value={`${onTimeRate.toFixed(1)}%`} 
          description={`${statusCounts.onTime} of ${statusCounts.onTime + statusCounts.delayed} successful trips`}
          icon={EMOJI.CLOCK}
          trend={onTimeRate > 75 ? "up" : "down"}
          onClick={() => setKpiDetails({
            type: "onTime",
            data: getTripsByStatus("onTime")
          })}
        />
        <KPICard 
          title="Delayed Deliveries" 
          value={`${delayRate.toFixed(1)}%`} 
          description={`${statusCounts.delayed} of ${statusCounts.onTime + statusCounts.delayed} successful trips`}
          icon={EMOJI.ALERT}
          trend={delayRate < 15 ? "down" : "up"}
          onClick={() => setKpiDetails({
            type: "delayed",
            data: getTripsByStatus("delayed")
          })}
        />
        <KPICard 
          title="Failed Deliveries" 
          value={`${voidRate.toFixed(1)}%`} 
          description={`${statusCounts.void} of ${statusCounts.onTime + statusCounts.delayed + statusCounts.void} completed trips`}
          icon={EMOJI.WARNING}
          trend={voidRate < 10 ? "down" : "up"}
          onClick={() => setKpiDetails({
            type: "void",
            data: getTripsByStatus("void")
          })}
        />
        <KPICard 
          title="Enroute Vehicles" 
          value={totalEnroute.toString()} 
          description={`${enrouteRate.toFixed(1)}% of active trips`}
          icon={EMOJI.ENROUTE}
          onClick={() => setKpiDetails({
            type: "enroute",
            data: getTripsByStatus("enroute")
          })}
        />
      </div>

      {/* KPI Details Modal */}
      {kpiDetails.type && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2 text-black">
                  {kpiDetails.type === "onTime" ? `${EMOJI.SUCCESS} On-Time Deliveries` : 
                   kpiDetails.type === "delayed" ? `${EMOJI.WARNING} Delayed Deliveries` : 
                   kpiDetails.type === "void" ? `${EMOJI.FAILED} Failed Deliveries` :
                   `${EMOJI.ENROUTE} Enroute Vehicles`}
                </h2>
                <button 
                  onClick={() => setKpiDetails({ type: null, data: [] })}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  &times;
                </button>
              </div>
              
              {kpiDetails.data.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Destination</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Departure</th>
                        {kpiDetails.type !== "enroute" && kpiDetails.type !== "void" && (
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Arrival</th>
                        )}
                        {kpiDetails.type === "void" ? (
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Comment</th>
                        ) : kpiDetails.type === "enroute" ? (
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        ) : (
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-black">
                      {kpiDetails.data.map((entry, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2 whitespace-nowrap text-sm">
                            {entry.vehicle_number}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm">
                            {entry.destination}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm">
                            {format(new Date(entry.departure_time), "MMM dd, yyyy")}
                          </td>
                          {kpiDetails.type !== "enroute" && kpiDetails.type !== "void" && (
                            <td className="px-4 py-2 whitespace-nowrap text-sm">
                              {entry.arrival_time ? format(new Date(entry.arrival_time), "MMM dd, yyyy HH:mm") : "N/A"}
                            </td>
                          )}
                          {kpiDetails.type === "void" ? (
                            <td className="px-4 py-2 whitespace-nowrap text-sm">
                              {entry.comment === "Did not go" ? "Trip was cancelled" : entry.comment || "No reason provided"}
                            </td>
                          ) : kpiDetails.type === "enroute" ? (
                            <td className="px-4 py-2 whitespace-nowrap text-sm">
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                {EMOJI.ENROUTE} On the way
                              </span>
                            </td>
                          ) : (
                            <td className="px-4 py-2 whitespace-nowrap text-sm">
                              {calculateTripDuration(entry.departure_time, entry.arrival_time)} hours
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-gray-600">No {kpiDetails.type} deliveries found for current filters</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
        {/* Vehicle Performance */}
        <div className="bg-white p-4 rounded-lg shadow-sm lg:col-span-2">
          <h2 className="text-lg md:text-xl font-semibold mb-3 flex items-center gap-2 text-black">
            {EMOJI.TRUCK} Top Performing Vehicles
          </h2>
          <p className="text-sm text-gray-500 mb-3">Vehicles with the most completed trips, fuel consumption, and drivers allowances</p>
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topVehicles}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="vehicle" />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === "Total Allowance") return [`${Number(value).toLocaleString()} UGX`, name];
                    if (name === "Total Fuel") return [`${value} L`, name];
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar 
                  yAxisId="left"
                  dataKey="totalFuel" 
                  name="Total Fuel (Liters)" 
                  fill="#8884d8" 
                />
                <Bar 
                  yAxisId="right"
                  dataKey="totalCost" 
                  name="Total Allowance (UGX)" 
                  fill="#82ca9d" 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Route Efficiency */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h2 className="text-lg md:text-xl font-semibold mb-3 flex items-center gap-2 text-black">
            {EMOJI.ROUTE} Most Frequent Routes
          </h2>
          <p className="text-sm text-gray-500 mb-3">Top destinations by number of completed trips</p>
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={routePerformance.slice(0, 5)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="tripCount"
                  nameKey="destination"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {routePerformance.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, _name, props) => [
                    `${props.payload.destination}`,
                    `Trips: ${value}`,
                    `Fuel: ${props.payload.totalFuel} L`,
                    `Cost: ${Number(props.payload.totalCost).toLocaleString()} UGX`
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Vehicle List */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-lg md:text-xl font-semibold mb-3 flex items-center gap-2 text-black">
          {EMOJI.TRUCK} Fleet Overview
        </h2>
        <p className="text-sm text-gray-500 mb-3">Performance metrics for all vehicles in the fleet</p>
        <div className="overflow-x-auto text-black">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Trips</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">On-Time</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Delayed</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Failed</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Enroute</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {vehicleStats.map((stat) => (
                <tr key={stat.vehicle} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap font-medium">
                    {stat.vehicle}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {stat.trips}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-green-600">
                    {stat.onTime}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-yellow-600">
                    {stat.delayed}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-red-600">
                    {stat.void}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-blue-600">
                    {stat.enroute}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <button
                      onClick={() => setSelectedVehicle(stat.vehicle)}
                      className="px-4 py-2 bg-blue-600 text-white font-medium text-sm rounded-md hover:bg-blue-700 transition-colors duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
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

      {/* Vehicle Detail Modal */}
      {selectedVehicle && (
        <VehicleDetailModal 
          vehicle={selectedVehicle}
          entries={filteredEntries.filter(e => e.vehicle_number === selectedVehicle)}
          onClose={() => setSelectedVehicle(null)}
          onDestinationSelect={(destination) => setSelectedDestination({
            vehicle: selectedVehicle,
            destination
          })}
        />
      )}

      {/* Destination Detail Modal */}
      {selectedDestination && (
        <DestinationDetailModal
          vehicle={selectedDestination.vehicle}
          destination={selectedDestination.destination}
          entries={filteredEntries.filter(e => 
            e.vehicle_number === selectedDestination.vehicle && 
            e.destination === selectedDestination.destination
          )}
          stats={vehicleStats.find(v => v.vehicle === selectedDestination.vehicle)?.destinations[selectedDestination.destination]}
          onClose={() => setSelectedDestination(null)}
        />
      )}
    </div>
  );
};

// KPI Card Component
const KPICard = ({ 
  title, 
  value, 
  description,
  icon,
  trend,
  onClick
}: { 
  title: string; 
  value: string; 
  description?: string;
  icon: string;
  trend?: "up" | "down";
  onClick?: () => void;
}) => {
  return (
    <div 
      className={`bg-white p-3 md:p-4 rounded-lg shadow-sm border border-gray-100 ${onClick ? "cursor-pointer hover:bg-gray-50" : ""}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs md:text-sm text-gray-500">{title}</p>
          <h3 className="text-xl md:text-2xl font-bold mt-1">{value}</h3>
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
        <div className="text-2xl">
          {icon}
        </div>
      </div>
      {trend && (
        <div className={`mt-2 flex items-center text-xs ${
          trend === "up" ? "text-green-500" : "text-red-500"
        }`}>
          <span className="mr-1">
            {trend === "up" ? EMOJI.TREND_UP : EMOJI.TREND_DOWN}
          </span>
          {trend === "up" ? "Improving" : "Needs attention"} compared to last period
        </div>
      )}
      {onClick && (
        <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
          {EMOJI.INFO} Click for details
        </div>
      )}
    </div>
  );
};

// Vehicle Detail Modal Component
const VehicleDetailModal = ({ 
  vehicle, 
  entries, 
  onClose,
  onDestinationSelect
}: {
  vehicle: string;
  entries: VehicleEntry[];
  onClose: () => void;
  onDestinationSelect: (destination: string) => void;
}) => {
  const successfulEntries = entries.filter(entry => 
    getTripStatus(entry) === "onTime" || getTripStatus(entry) === "delayed"
  );
  
  const tripData = successfulEntries
    .map(entry => ({
      date: format(new Date(entry.departure_time), "MMM dd"),
      duration: calculateTripDuration(entry.departure_time, entry.arrival_time),
      destination: entry.destination,
      status: getTripStatus(entry)
    }));

  const totalMileage = entries.reduce((sum, e) => sum + (e.mileage || 0), 0);
  
  // Calculate totals based on destination data for successful trips only
  const { totalFuel, totalCost } = successfulEntries.reduce((acc, entry) => {
    const destination = entry.destination as keyof typeof DESTINATION_DATA;
    const data = DESTINATION_DATA[destination] || { fuel: 0, cost: 0 };
    return {
      totalFuel: acc.totalFuel + data.fuel,
      totalCost: acc.totalCost + data.cost
    };
  }, { totalFuel: 0, totalCost: 0 });

  // Get unique destinations with counts for successful trips only
  const destinations = successfulEntries.reduce((acc: Record<string, number>, entry) => {
    if (!acc[entry.destination]) {
      acc[entry.destination] = 0;
    }
    acc[entry.destination]++;
    return acc;
  }, {});

  // Get trip status counts
  const statusCounts = entries.reduce((acc: Record<TripStatus, number>, entry) => {
    const status = getTripStatus(entry);
    acc[status]++;
    return acc;
  }, { onTime: 0, delayed: 0, void: 0, enroute: 0 });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 md:p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2 text-black">
              {EMOJI.TRUCK} {vehicle} - Performance Summary
            </h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              &times;
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
            <div className="bg-gray-200 p-3 md:p-4 rounded-lg text-black">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                {EMOJI.CHART} Performance Overview
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Trips Recorded:</span>
                  <span className="font-medium">{entries.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Successful Deliveries:</span>
                  <span className="font-medium text-green-600">
                    {statusCounts.onTime + statusCounts.delayed} (
                    {entries.length > 0 
                      ? Math.round(((statusCounts.onTime + statusCounts.delayed) / entries.length) * 100)
                      : 0}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>On-Time Deliveries:</span>
                  <span className="font-medium text-green-600">
                    {statusCounts.onTime} (
                    {(statusCounts.onTime + statusCounts.delayed) > 0 
                      ? Math.round((statusCounts.onTime / (statusCounts.onTime + statusCounts.delayed)) * 100)
                      : 0}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Delayed Deliveries:</span>
                  <span className="font-medium text-yellow-600">
                    {statusCounts.delayed} (
                    {(statusCounts.onTime + statusCounts.delayed) > 0 
                      ? Math.round((statusCounts.delayed / (statusCounts.onTime + statusCounts.delayed)) * 100)
                      : 0}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Failed Deliveries:</span>
                  <span className="font-medium text-red-600">
                    {statusCounts.void} (
                    {entries.length > 0 
                      ? Math.round((statusCounts.void / entries.length) * 100)
                      : 0}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Enroute journey:</span>
                  <span className="font-medium text-blue-600">
                    {statusCounts.enroute} (
                    {entries.length > 0 
                      ? Math.round((statusCounts.enroute / entries.length) * 100)
                      : 0}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Fuel Consumption:</span>
                  <span className="font-medium">
                    {totalFuel.toLocaleString()} liters
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Distance Traveled:</span>
                  <span className="font-medium">
                    {totalMileage.toLocaleString()} kilometers
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Driver Allowance:</span>
                  <span className="font-medium">
                    {totalCost.toLocaleString()} UGX
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2 flex items-center gap-2 text-black">
                {EMOJI.CLOCK} Trip Duration Trend (Last 10 Successful Trips)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={tripData.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      formatter={(value) => [`${value} hours`, "Trip Duration"]}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="duration" 
                      name="Duration" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          
          <h3 className="font-medium mb-2 flex items-center gap-2 text-black">
            {EMOJI.CALENDAR} Recent Trips (Last 5)
          </h3>
          <div className="overflow-x-auto text-black">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Destination</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Return Info</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {entries.slice(0, 5).map((entry, i) => {
                  const destination = entry.destination as keyof typeof DESTINATION_DATA;
                  const expectedTime = DESTINATION_DATA[destination]?.time || 0;
                  const actualTime = calculateTripDuration(entry.departure_time, entry.arrival_time);
                  const status = getTripStatus(entry);
                  
                  return (
                    <tr key={i}>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        {format(new Date(entry.departure_time), "MMM dd, yyyy")}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">{entry.destination}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        {status === "onTime" || status === "delayed" ? (
                          <div className="flex flex-col">
                            <span>{actualTime.toFixed(1)} hours</span>
                            {expectedTime > 0 && (
                              <span className="text-xs text-gray-500">Expected: {expectedTime} hours</span>
                            )}
                          </div>
                        ) : status === "enroute" ? (
                          <span className="text-blue-600">Still on the way</span>
                        ) : (
                          "N/A"
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          status === "onTime" ? "bg-green-100 text-green-800" :
                          status === "delayed" ? "bg-yellow-100 text-yellow-800" :
                          status === "enroute" ? "bg-blue-100 text-blue-800" :
                          "bg-red-100 text-red-800"
                        }`}>
                          {status === "onTime" ? `${EMOJI.SUCCESS} On Time` : 
                           status === "delayed" ? `${EMOJI.WARNING} Delayed` : 
                           status === "enroute" ? `${EMOJI.ENROUTE} Enroute` :
                           `${EMOJI.FAILED} Failed (${entry.comment === "Did not go" ? "Cancelled" : entry.comment || "No reason"})`}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        {entry.return_comment ? (
                          <div className="flex flex-col">
                            <span>{entry.return_comment}</span>
                            {entry.return_comment_date && (
                              <span className="text-xs text-gray-500">
                                {format(new Date(entry.return_comment_date), "MMM dd, yyyy")}
                              </span>
                            )}
                          </div>
                        ) : (
                          "No return info"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <h3 className="font-medium mt-6 mb-2 flex items-center gap-2 text-black">
            {EMOJI.MAP} Destination Breakdown
          </h3>
          {Object.keys(destinations).length > 0 ? (
            <div className="space-y-2 text-black">
              {Object.entries(destinations).map(([destination, count]) => (
                <div key={destination} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                  <div>
                    <span className="font-medium">{destination}</span>
                    <p className="text-xs text-gray-500">
                      {DESTINATION_DATA[destination as keyof typeof DESTINATION_DATA]?.time || "Unknown"} hours expected duration
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm">{count} successful trips</span>
                    <button 
                      onClick={() => onDestinationSelect(destination)}
                      className="px-4 py-2 bg-blue-600 text-white font-medium text-sm rounded-md hover:bg-blue-700 transition-colors duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                    >
                      Trip Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-gray-600">No successful trips to destinations found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Destination Detail Modal Component
const DestinationDetailModal = ({
  vehicle,
  destination,
  entries,
  stats,
  onClose
}: {
  vehicle: string;
  destination: string;
  entries: VehicleEntry[];
  stats?: {
    trips: number;
    fuel: number;
    cost: number;
    onTime: number;
    delayed: number;
  };
  onClose: () => void;
}) => {
  const destinationData = DESTINATION_DATA[destination as keyof typeof DESTINATION_DATA] || { fuel: 0, time: 0, cost: 0 };
  const successfulEntries = entries.filter(entry => 
    getTripStatus(entry) === "onTime" || getTripStatus(entry) === "delayed"
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl md:text-2xl font-bold text-black">
              {vehicle} - {destination} Trip Details
            </h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              &times;
            </button>
          </div>
          
          {stats ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-600">Total Completed Trips</p>
                  <p className="text-xl font-bold text-black">{stats.trips}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-green-600">On-Time Deliveries</p>
                  <p className="text-xl font-bold text-black">
                    {stats.onTime} ({stats.trips > 0 ? Math.round((stats.onTime / stats.trips) * 100) : 0}%)
                  </p>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-sm text-yellow-600">Delayed Deliveries</p>
                  <p className="text-xl font-bold text-black">
                    {stats.delayed} ({stats.trips > 0 ? Math.round((stats.delayed / stats.trips) * 100) : 0}%)
                  </p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="text-sm text-purple-600">Total Fuel Used</p>
                  <p className="text-xl font-bold text-black">{stats.fuel} liters</p>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-sm text-red-600">Fuel per Trip</p>
                  <p className="text-xl font-bold text-black">{destinationData.fuel} liters</p>
                </div>
                <div className="bg-indigo-50 p-3 rounded-lg">
                  <p className="text-sm text-indigo-600">Total Allowance</p>
                  <p className="text-xl font-bold text-black">{stats.cost.toLocaleString()} UGX</p>
                </div>
              </div>
              
              <div className="bg-gray-300 p-3 rounded-lg text-black">
                <h3 className="font-medium mb-2">Route Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Estimated Travel Time:</span>
                    <span>{destinationData.time} hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Standard Fuel Consumption:</span>
                    <span>{destinationData.fuel} liters</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Standard Driver Allowance:</span>
                    <span>{destinationData.cost.toLocaleString()} UGX</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2 text-gray-600">Trip History</h3>
                {successfulEntries.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Departure</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Arrival</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Return Info</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200 text-black">
                        {successfulEntries.map((entry, i) => {
                          const status = getTripStatus(entry);
                          const duration = calculateTripDuration(entry.departure_time, entry.arrival_time);
                          
                          return (
                            <tr key={i}>
                              <td className="px-4 py-2 whitespace-nowrap text-sm">
                                {format(new Date(entry.departure_time), "MMM dd, yyyy")}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm">
                                {entry.arrival_time ? format(new Date(entry.arrival_time), "MMM dd, yyyy HH:mm") : "N/A"}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm">
                                {duration > 0 ? `${duration} hours` : "N/A"}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  status === "onTime" ? "bg-green-100 text-green-800" :
                                  "bg-yellow-100 text-yellow-800"
                                }`}>
                                  {status === "onTime" ? `${EMOJI.SUCCESS} On Time` : `${EMOJI.WARNING} Delayed`}
                                </span>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm">
                                {entry.return_comment ? (
                                  <div className="flex flex-col">
                                    <span>{entry.return_comment}</span>
                                    {entry.return_comment_date && (
                                      <span className="text-xs text-gray-500">
                                        {format(new Date(entry.return_comment_date), "MMM dd, yyyy")}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  "No return info"
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <p className="text-gray-600">No successful trips found for this destination</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-gray-600">No performance data available for this destination</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function to get trip status
const getTripStatus = (entry: VehicleEntry): TripStatus => {
  const comment = entry.comment?.toLowerCase() || "";
  
  if (comment === "reached") {
    const destination = entry.destination as keyof typeof DESTINATION_DATA;
    const expectedTime = DESTINATION_DATA[destination]?.time || 0;
    if (!expectedTime) return "onTime";
    
    const actualTime = calculateTripDuration(entry.departure_time, entry.arrival_time);
    return actualTime <= expectedTime * 1.1 ? "onTime" : "delayed";
  }
  
  if (comment === "did not go") return "void";
  if (comment === "no comment provided yet" || comment === "") return "enroute";
  
  return "void"; // Any other comment is considered void
};

// Helper function for trip duration calculation (using only date from departure and full datetime from arrival)
const calculateTripDuration = (departure: string, arrival: string) => {
  if (!departure || !arrival) return 0;
  try {
    const depDate = startOfDay(parseISO(departure)); // Use only the date part of departure
    const arr = parseISO(arrival); // Use full datetime from arrival
    
    // Ensure arrival is after departure to prevent negative durations
    if (arr < depDate) return 0;
    
    const hours = differenceInHours(arr, depDate);
    const minutes = differenceInMinutes(arr, depDate) % 60;
    return parseFloat((hours + minutes / 60).toFixed(1)); // Round to 1 decimal place
  } catch (e) {
    console.error("Error calculating trip duration:", e);
    return 0;
  }
};

export default LogisticsDashboard;