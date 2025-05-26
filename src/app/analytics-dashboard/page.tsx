"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { 
  format, 
  parseISO, 
  differenceInHours,
  differenceInMinutes,
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
  Gulu: { fuel: 240, time: 7, cost: 100000 }
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
  VOID: "❓",
  WARNING: "⚠️",
  EFFICIENCY: "⚡",
  MAINTENANCE: "🛠️",
  ROUTE: "🛣️"
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
  const [timeRange, setTimeRange] = useState("week");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<{
    vehicle: string;
    destination: string;
  } | null>(null);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase.from("vehicle_tracking").select("*");
      
      if (!error && data) {
        const cleanedData = data.map(cleanEntry);
        setEntries(cleanedData);
        applyFilters(cleanedData, timeRange, searchQuery);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  // Data cleaning
  const cleanEntry = (entry: VehicleEntry): VehicleEntry => ({
    ...entry,
    vehicle_number: entry.vehicle_number.trim().replace(/\s+/g, ' '),
    destination: entry.destination.trim(),
    comment: entry.comment?.trim() || ""
  });

  // Filtering
  const applyFilters = (data: VehicleEntry[], range: string, query: string) => {
    let filtered = [...data];
    
    // Time range filter
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

    // Search filter
    if (query) {
      filtered = filtered.filter(e => 
        e.vehicle_number.toLowerCase().includes(query.toLowerCase()) ||
        e.destination.toLowerCase().includes(query.toLowerCase())
      );
    }

    setFilteredEntries(filtered);
  };

  // Calculate trip duration in hours
  const calculateTripDuration = (departure: string, arrival: string) => {
    if (!departure || !arrival) return 0;
    const dep = parseISO(departure);
    const arr = parseISO(arrival);
    return differenceInHours(arr, dep) + (differenceInMinutes(arr, dep) % 60) / 60;
  };

  // Determine if trip was on time, delayed, or void
  const getTripStatus = (entry: VehicleEntry) => {
    if (!entry.comment || entry.comment !== "Reached") return "void";
    
    const destination = entry.destination as keyof typeof DESTINATION_DATA;
    const expectedTime = DESTINATION_DATA[destination]?.time || 0;
    if (!expectedTime) return "void";
    
    const actualTime = calculateTripDuration(entry.departure_time, entry.arrival_time);
    return actualTime <= expectedTime * 1.1 ? "onTime" : "delayed";
  };

  // Key metrics
  const calculateKPIs = () => {
    const statusCounts = filteredEntries.reduce((acc, entry) => {
      const status = getTripStatus(entry);
      acc[status]++;
      return acc;
    }, { onTime: 0, delayed: 0, void: 0 });

    const totalTrips = filteredEntries.filter(e => e.comment === "Reached").length;
    const totalEntries = filteredEntries.length;
    
    return {
      onTimeRate: totalTrips > 0 ? (statusCounts.onTime / totalTrips) * 100 : 0,
      delayRate: totalTrips > 0 ? (statusCounts.delayed / totalTrips) * 100 : 0,
      voidRate: totalEntries > 0 ? ((totalEntries - totalTrips) / totalEntries) * 100 : 0,
      totalTrips
    };
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
      if (entry.comment === "Reached") {
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
      if (entry.comment === "Reached") {
        destStats.fuel += destinationData.fuel;
        destStats.cost += destinationData.cost;
        if (status === "onTime") destStats.onTime++;
        if (status === "delayed") destStats.delayed++;
      }
    });

    // Add maintenance advisory
    Array.from(vehicleMap.values()).forEach(vehicle => {
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
    
    filteredEntries.forEach(entry => {
      if (entry.comment !== "Reached") return;
      
      const destination = entry.destination as keyof typeof DESTINATION_DATA;
      const destinationData = DESTINATION_DATA[destination] || { fuel: 0, cost: 0 };
      
      if (!routeMap.has(entry.destination)) {
        routeMap.set(entry.destination, {
          destination: entry.destination,
          vehicles: new Set().add(entry.vehicle_number).size,
          totalFuel: 0,
          totalCost: 0,
          tripCount: 0
        });
      }
      
      const route = routeMap.get(entry.destination)!;
      route.tripCount++;
      route.totalFuel += destinationData.fuel;
      route.totalCost += destinationData.cost;
      route.vehicles = new Set([...Array.from(route.vehicles as any), entry.vehicle_number]).size;
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

  const { onTimeRate, delayRate, voidRate, totalTrips } = calculateKPIs();
  const vehicleStats = getVehicleStats();
  const routePerformance = getRoutePerformance();
  const topVehicles = getTopVehicles();

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
      <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm mb-4 md:mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <span className="absolute left-3 top-3 text-gray-400">{EMOJI.SEARCH}</span>
          <input
            type="text"
            placeholder="Search vehicles..."
            className="pl-9 pr-3 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              applyFilters(entries, timeRange, e.target.value);
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
              applyFilters(entries, e.target.value, searchQuery);
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
              applyFilters(entries, timeRange, searchQuery);
              setLoading(false);
            }, 500);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <span className={`${loading ? "animate-spin" : ""}`}>{EMOJI.REFRESH}</span>
          <span className="hidden md:inline">Refresh</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
        <KPICard 
          title="On-Time %" 
          value={`${onTimeRate.toFixed(1)}%`} 
          icon={EMOJI.CLOCK}
          trend={onTimeRate > 75 ? "up" : "down"}
        />
        <KPICard 
          title="Delay %" 
          value={`${delayRate.toFixed(1)}%`} 
          icon={EMOJI.ALERT}
          trend={delayRate < 15 ? "down" : "up"}
        />
        <KPICard 
          title="Void %" 
          value={`${voidRate.toFixed(1)}%`} 
          icon={EMOJI.WARNING}
          trend={voidRate < 10 ? "down" : "up"}
        />
        <KPICard 
          title="Total Trips" 
          value={totalTrips.toString()} 
          icon={EMOJI.MAP}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
        {/* Vehicle Performance */}
        <div className="bg-white p-4 rounded-lg shadow-sm lg:col-span-2">
          <h2 className="text-lg md:text-xl font-semibold mb-3 flex items-center gap-2">
            {EMOJI.TRUCK} Top Performing Vehicles
          </h2>
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topVehicles}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="vehicle" />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === "Total Cost") return [`${value.toLocaleString()} UGX`, name];
                    if (name === "Total Fuel") return [`${value} L`, name];
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar 
                  yAxisId="left"
                  dataKey="totalFuel" 
                  name="Total Fuel (L)" 
                  fill="#8884d8" 
                />
                <Bar 
                  yAxisId="right"
                  dataKey="totalCost" 
                  name="Total Cost (UGX)" 
                  fill="#82ca9d" 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Route Efficiency */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h2 className="text-lg md:text-xl font-semibold mb-3 flex items-center gap-2">
            {EMOJI.ROUTE} Route Efficiency
          </h2>
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
                  label={({ name }) => name}
                >
                  {routePerformance.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name, props) => [
                    `${props.payload.destination}`,
                    `Trips: ${value}`,
                    `Fuel: ${props.payload.totalFuel} L`,
                    `Cost: ${props.payload.totalCost.toLocaleString()} UGX`
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Vehicle List */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-lg md:text-xl font-semibold mb-3 flex items-center gap-2">
          {EMOJI.TRUCK} Fleet Overview
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Trips</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fuel (L)</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mileage</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Maintenance</th>
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
                  <td className="px-4 py-2 whitespace-nowrap">
                    {stat.totalFuel.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {stat.totalMileage.toLocaleString()} km
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {Math.round(stat.totalCost).toLocaleString()} UGX
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className="text-xs flex items-center gap-1">
                      {stat.maintenanceAdvisory.includes("overhaul") ? EMOJI.WARNING : 
                       stat.maintenanceAdvisory.includes("Major") ? EMOJI.ALERT : 
                       stat.maintenanceAdvisory.includes("Routine") ? EMOJI.MAINTENANCE : "✅"}
                      {stat.maintenanceAdvisory}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <button 
                      onClick={() => setSelectedVehicle(stat.vehicle)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
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
  icon,
  trend 
}: { 
  title: string; 
  value: string; 
  icon: string;
  trend?: "up" | "down" | "neutral";
}) => {
  return (
    <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm border border-gray-100">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs md:text-sm text-gray-500">{title}</p>
          <h3 className="text-xl md:text-2xl font-bold mt-1">{value}</h3>
        </div>
        <div className="text-2xl">
          {icon}
        </div>
      </div>
      {trend && (
        <div className={`mt-2 flex items-center text-xs ${
          trend === "up" ? "text-green-500" : 
          trend === "down" ? "text-red-500" : "text-gray-500"
        }`}>
          <span className="mr-1">
            {trend === "up" ? EMOJI.TREND_UP : EMOJI.TREND_DOWN}
          </span>
          {trend === "up" ? "Increase" : "Decrease"} from last period
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
  const tripData = entries.map(entry => ({
    date: format(new Date(entry.departure_time), "MMM dd"),
    duration: calculateTripDuration(entry.departure_time, entry.arrival_time),
    destination: entry.destination,
    status: getTripStatus(entry)
  }));

  const totalMileage = entries.reduce((sum, e) => sum + (e.mileage || 0), 0);
  
  // Calculate totals based on destination data for successful trips only
  const { totalFuel, totalCost } = entries.reduce((acc, entry) => {
    if (entry.comment !== "Reached") return acc;
    
    const destination = entry.destination as keyof typeof DESTINATION_DATA;
    const data = DESTINATION_DATA[destination] || { fuel: 0, cost: 0 };
    return {
      totalFuel: acc.totalFuel + data.fuel,
      totalCost: acc.totalCost + data.cost
    };
  }, { totalFuel: 0, totalCost: 0 });

  // Get unique destinations with counts for successful trips only
  const destinations = entries.reduce((acc, entry) => {
    if (entry.comment !== "Reached") return acc;
    
    if (!acc[entry.destination]) {
      acc[entry.destination] = 0;
    }
    acc[entry.destination]++;
    return acc;
  }, {} as Record<string, number>);

  // Get trip status counts
  const statusCounts = entries.reduce((acc, entry) => {
    const status = getTripStatus(entry);
    acc[status]++;
    return acc;
  }, { onTime: 0, delayed: 0, void: 0 });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 md:p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
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
            <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                {EMOJI.CHART} Summary
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Trips:</span>
                  <span className="font-medium">{entries.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Successful Trips:</span>
                  <span className="font-medium text-green-600">
                    {statusCounts.onTime + statusCounts.delayed}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>On-Time Deliveries:</span>
                  <span className="font-medium text-green-600">
                    {statusCounts.onTime} ({
                      (statusCounts.onTime + statusCounts.delayed) > 0 
                        ? Math.round((statusCounts.onTime / (statusCounts.onTime + statusCounts.delayed)) * 100)
                        : 0
                    }%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Delayed Deliveries:</span>
                  <span className="font-medium text-yellow-600">
                    {statusCounts.delayed} ({
                      (statusCounts.onTime + statusCounts.delayed) > 0 
                        ? Math.round((statusCounts.delayed / (statusCounts.onTime + statusCounts.delayed)) * 100)
                        : 0
                    }%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Void Deliveries:</span>
                  <span className="font-medium text-red-600">
                    {statusCounts.void} ({
                      entries.length > 0 
                        ? Math.round((statusCounts.void / entries.length) * 100)
                        : 0
                    }%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Fuel Consumption:</span>
                  <span className="font-medium">
                    {totalFuel.toLocaleString()} L
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Mileage:</span>
                  <span className="font-medium">
                    {totalMileage.toLocaleString()} km
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Cost:</span>
                  <span className="font-medium">
                    {totalCost.toLocaleString()} UGX
                  </span>
                </div>
              </div>

              <h3 className="font-medium mt-4 mb-2 flex items-center gap-2">
                {EMOJI.MAP} Destinations
              </h3>
              <div className="space-y-2">
                {Object.entries(destinations).map(([destination, count]) => (
                  <div key={destination} className="flex justify-between items-center">
                    <span>{destination}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{count} trips</span>
                      <button 
                        onClick={() => onDestinationSelect(destination)}
                        className="text-blue-600 text-xs hover:underline"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tripData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === "duration") return [`${value} hours`, "Duration"];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="duration" 
                    name="Duration (hrs)" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <h3 className="font-medium mb-2 flex items-center gap-2">
            {EMOJI.CALENDAR} Recent Trips
          </h3>
          <div className="overflow-x-auto">
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
                        <div className="flex flex-col">
                          <span>{actualTime.toFixed(1)} hrs</span>
                          {expectedTime > 0 && (
                            <span className="text-xs text-gray-500">Expected: {expectedTime} hrs</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          status === "onTime" ? "bg-green-100 text-green-800" :
                          status === "delayed" ? "bg-yellow-100 text-yellow-800" :
                          "bg-red-100 text-red-800"
                        }`}>
                          {status === "onTime" ? `${EMOJI.SUCCESS} On Time` : 
                           status === "delayed" ? `${EMOJI.WARNING} Delayed` : `${EMOJI.FAILED} Void`}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        {entry.return_comment && (
                          <div className="flex flex-col">
                            <span>{entry.return_comment}</span>
                            <span className="text-xs text-gray-500">
                              {entry.return_comment_date ? format(new Date(entry.return_comment_date), "MMM dd, yyyy") : "No date"}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// Destination Detail Modal Component
const DestinationDetailModal = ({
  vehicle,
  destination,
  stats,
  onClose
}: {
  vehicle: string;
  destination: string;
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold">
              {vehicle} - {destination} Details
            </h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              &times;
            </button>
          </div>
          
          {stats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-600">Total Trips</p>
                  <p className="text-xl font-bold">{stats.trips}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-green-600">On-Time</p>
                  <p className="text-xl font-bold">
                    {stats.onTime} ({stats.trips > 0 ? Math.round((stats.onTime / stats.trips) * 100) : 0}%)
                  </p>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-sm text-yellow-600">Delayed</p>
                  <p className="text-xl font-bold">
                    {stats.delayed} ({stats.trips > 0 ? Math.round((stats.delayed / stats.trips) * 100) : 0}%)
                  </p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="text-sm text-purple-600">Total Fuel</p>
                  <p className="text-xl font-bold">{stats.fuel} L</p>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-sm text-red-600">Per Trip Fuel</p>
                  <p className="text-xl font-bold">{destinationData.fuel} L</p>
                </div>
                <div className="bg-indigo-50 p-3 rounded-lg">
                  <p className="text-sm text-indigo-600">Total Cost</p>
                  <p className="text-xl font-bold">{stats.cost.toLocaleString()} UGX</p>
                </div>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <h3 className="font-medium mb-2">Route Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Estimated Time:</span>
                    <span>{destinationData.time} hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fuel per Trip:</span>
                    <span>{destinationData.fuel} liters</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cost per Trip:</span>
                    <span>{destinationData.cost.toLocaleString()} UGX</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p>No data available for this destination</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function to get trip status
const getTripStatus = (entry: VehicleEntry) => {
  if (!entry.comment || entry.comment !== "Reached") return "void";
  
  const destination = entry.destination as keyof typeof DESTINATION_DATA;
  const expectedTime = DESTINATION_DATA[destination]?.time || 0;
  if (!expectedTime) return "void";
  
  const actualTime = calculateTripDuration(entry.departure_time, entry.arrival_time);
  return actualTime <= expectedTime * 1.1 ? "onTime" : "delayed";
};

// Helper function for trip duration calculation
const calculateTripDuration = (departure: string, arrival: string) => {
  if (!departure || !arrival) return 0;
  const dep = parseISO(departure);
  const arr = parseISO(arrival);
  return differenceInHours(arr, dep) + (differenceInMinutes(arr, dep) % 60) / 60;
};

export default LogisticsDashboard;