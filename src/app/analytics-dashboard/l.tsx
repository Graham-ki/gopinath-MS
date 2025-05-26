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

// Destination standards with fuel, time, and cost
const DESTINATION_STANDARDS = {
  mbarara: { fuel: 390, hours: 12, cost: 100000 },
  arua: { fuel: 510, hours: 24, cost: 100000 },
  lira: { fuel: 220, hours: 6, cost: 70000 },
  mityana: { fuel: 210, hours: 7, cost: 70000 },
  kampala: { fuel: 170, hours: 5, cost: 70000 },
  soroti: { fuel: 100, hours: 3, cost: 70000 },
  jinja: { fuel: 90, hours: 3, cost: 50000 },
  mukono: { fuel: 160, hours: 4, cost: 70000 },
  mpigi: { fuel: 175, hours: 6, cost: 70000 },
  mbale: { fuel: 15, hours: 1, cost: 15000 },
  gulu: { fuel: 240, hours: 7, cost: 100000 }
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
  totalFuel: number;
  totalCost: number;
  totalMileage: number;
  maintenanceAdvisory: string;
}

interface RoutePerformance {
  destination: string;
  tripCount: number;
  totalFuel: number;
  totalCost: number;
}

interface TripPerformance {
  onTime: number;
  delayed: number;
}

const TIME_RANGES = [
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "all", label: "All Time" }
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Enhanced cleaning functions
const cleanString = (str: string) => str.trim().replace(/\s+/g, ' ').toLowerCase();
const cleanComment = (comment: string) => cleanString(comment) === "reached" ? "Reached" : 
                    cleanString(comment) === "didnotgo" ? "Did not go" : comment.trim();
const cleanDestination = (dest: string) => {
  const cleaned = cleanString(dest);
  // Handle common misspellings or variations
  if (cleaned.includes("mbara")) return "mbarara";
  if (cleaned.includes("aru")) return "arua";
  if (cleaned.includes("kam")) return "kampala";
  return cleaned;
};

const LogisticsDashboard = () => {
  const [entries, setEntries] = useState<VehicleEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<VehicleEntry[]>([]);
  const [timeRange, setTimeRange] = useState("week");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase.from("vehicle_tracking").select("*");
      
      if (!error && data) {
        const cleanedData = data.map(entry => ({
          ...entry,
          vehicle_number: cleanString(entry.vehicle_number),
          destination: cleanDestination(entry.destination),
          comment: cleanComment(entry.comment),
          return_comment: entry.return_comment ? cleanString(entry.return_comment) : undefined
        }));
        setEntries(cleanedData);
        applyFilters(cleanedData, timeRange, searchQuery);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const applyFilters = (data: VehicleEntry[], range: string, query: string) => {
    let filtered = [...data];
    
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

    if (query) {
      const cleanQuery = cleanString(query);
      filtered = filtered.filter(e => 
        cleanString(e.vehicle_number).includes(cleanQuery) ||
        cleanString(e.destination).includes(cleanQuery)
      );
    }

    setFilteredEntries(filtered);
  };

  const calculateTripDuration = (departure: string, arrival: string) => {
    if (!departure || !arrival) return 0;
    const dep = parseISO(departure);
    const arr = parseISO(arrival);
    return differenceInHours(arr, dep) + (differenceInMinutes(arr, dep) % 60) / 60;
  };

  const calculateKPIs = () => {
    const successfulTrips = filteredEntries.filter(e => e.comment === "Reached");
    const failedTrips = filteredEntries.filter(e => e.comment === "Did not go");
    const voidTrips = filteredEntries.filter(e => !["Reached", "Did not go"].includes(e.comment));

    let onTime = 0, delayed = 0;

    successfulTrips.forEach(trip => {
      const standard = DESTINATION_STANDARDS[trip.destination as keyof typeof DESTINATION_STANDARDS];
      if (!standard) return;
      
      const actualDuration = calculateTripDuration(trip.departure_time, trip.arrival_time);
      const expectedDuration = standard.hours;
      
      if (actualDuration <= expectedDuration * 1.2) { // 20% buffer
        onTime++;
      } else {
        delayed++;
      }
    });

    return {
      onTimeRate: successfulTrips.length > 0 ? (onTime / successfulTrips.length) * 100 : 0,
      delayRate: successfulTrips.length > 0 ? (delayed / successfulTrips.length) * 100 : 0,
      voidRate: filteredEntries.length > 0 ? (voidTrips.length / filteredEntries.length) * 100 : 0,
      totalTrips: filteredEntries.length,
      successfulTrips: successfulTrips.length,
      delayedTrips: delayed,
      onTimeTrips: onTime
    };
  };

  const getVehicleStats = (): VehicleStats[] => {
    const vehicleMap = new Map<string, VehicleEntry[]>();
    
    filteredEntries.forEach(entry => {
      const key = cleanString(entry.vehicle_number);
      if (!vehicleMap.has(key)) {
        vehicleMap.set(key, []);
      }
      vehicleMap.get(key)?.push(entry);
    });

    return Array.from(vehicleMap.entries()).map(([vehicle, trips]) => {
      const totalMileage = trips.reduce((sum, trip) => sum + (trip.mileage || 0), 0);
      
      // Calculate total fuel and cost based on destination standards
      let totalFuel = 0;
      let totalCost = 0;
      let successfulTrips = 0;
      
      trips.forEach(trip => {
        const standard = DESTINATION_STANDARDS[trip.destination as keyof typeof DESTINATION_STANDARDS];
        if (standard) {
          totalFuel += standard.fuel;
          totalCost += standard.cost;
        }
        if (trip.comment === "Reached") successfulTrips++;
      });

      return {
        vehicle,
        trips: successfulTrips, // Only count successful trips
        totalFuel,
        totalCost,
        totalMileage,
        maintenanceAdvisory: getMaintenanceAdvisory(totalMileage, successfulTrips)
      };
    }).sort((a, b) => b.trips - a.trips); // Sort by most trips
  };

  const getRoutePerformance = (): RoutePerformance[] => {
    const routeMap = new Map<string, { tripCount: number, totalFuel: number, totalCost: number }>();
    
    filteredEntries.forEach(entry => {
      if (entry.comment !== "Reached") return;
      
      const standard = DESTINATION_STANDARDS[entry.destination as keyof typeof DESTINATION_STANDARDS];
      if (!standard) return;
      
      const destKey = cleanString(entry.destination);
      if (!routeMap.has(destKey)) {
        routeMap.set(destKey, { tripCount: 0, totalFuel: 0, totalCost: 0 });
      }
      
      const routeData = routeMap.get(destKey)!;
      routeData.tripCount++;
      routeData.totalFuel += standard.fuel;
      routeData.totalCost += standard.cost;
    });

    return Array.from(routeMap.entries()).map(([destination, data]) => ({
      destination,
      tripCount: data.tripCount,
      totalFuel: data.totalFuel,
      totalCost: data.totalCost
    })).sort((a, b) => b.tripCount - a.tripCount); // Sort by most trips
  };

  const getMaintenanceAdvisory = (mileage: number, tripCount: number) => {
    if (mileage > 100000 || tripCount > 50) return "Immediate inspection needed";
    if (mileage > 50000 || tripCount > 30) return "Schedule maintenance soon";
    if (mileage > 10000 || tripCount > 10) return "Routine check recommended";
    return "No immediate maintenance needed";
  };

  const getVehicleDestinationStats = (vehicle: string) => {
    const vehicleTrips = filteredEntries.filter(e => 
      cleanString(e.vehicle_number) === cleanString(vehicle) && 
      e.comment === "Reached"
    );
    const destinationMap = new Map<string, TripPerformance & { tripCount: number, totalFuel: number, totalCost: number }>();
    
    vehicleTrips.forEach(trip => {
      const standard = DESTINATION_STANDARDS[trip.destination as keyof typeof DESTINATION_STANDARDS];
      if (!standard) return;
      
      const destKey = cleanString(trip.destination);
      if (!destinationMap.has(destKey)) {
        destinationMap.set(destKey, { tripCount: 0, onTime: 0, delayed: 0, totalFuel: 0, totalCost: 0 });
      }
      
      const destData = destinationMap.get(destKey)!;
      destData.tripCount++;
      destData.totalFuel += standard.fuel;
      destData.totalCost += standard.cost;
      
      const actualDuration = calculateTripDuration(trip.departure_time, trip.arrival_time);
      if (actualDuration <= standard.hours * 1.2) {
        destData.onTime++;
      } else {
        destData.delayed++;
      }
    });

    return Array.from(destinationMap.entries()).map(([destination, data]) => ({
      destination,
      ...data
    }));
  };

  const { onTimeRate, delayRate, voidRate, totalTrips, successfulTrips, delayedTrips, onTimeTrips } = calculateKPIs();
  const vehicleStats = getVehicleStats();
  const routePerformance = getRoutePerformance();

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <header className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
          {EMOJI.TRUCK} Logistics Analytics Dashboard
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
          title="Completed Trips" 
          value={successfulTrips.toString()} 
          icon={EMOJI.MAP}
        />
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
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
        {/* Vehicle Performance */}
        <div className="bg-white p-4 rounded-lg shadow-sm lg:col-span-2">
          <h2 className="text-lg md:text-xl font-semibold mb-3 flex items-center gap-2">
            {EMOJI.TRUCK} Top Vehicles by Completed Trips
          </h2>
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vehicleStats.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="vehicle" />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === "Total Cost") return [`${value} UGX`, name];
                    if (name === "Total Fuel") return [`${value} liters`, name];
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar 
                  yAxisId="left"
                  dataKey="trips" 
                  name="Completed Trips" 
                  fill="#8884d8" 
                />
                <Bar 
                  yAxisId="right"
                  dataKey="totalCost" 
                  name="Total Cost" 
                  fill="#82ca9d" 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Route Efficiency */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h2 className="text-lg md:text-xl font-semibold mb-3 flex items-center gap-2">
            {EMOJI.ROUTE} Top Destinations
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
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {routePerformance.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name, props) => {
                    const payload = props.payload as RoutePerformance;
                    return [
                      `Trips: ${payload.tripCount}`,
                      `Fuel: ${payload.totalFuel} liters`,
                      `Cost: ${payload.totalCost.toLocaleString()} UGX`
                    ];
                  }}
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
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Completed Trips</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Fuel</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mileage</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Maintenance</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {vehicleStats.map((stat) => (
                <tr key={stat.vehicle} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap font-medium">
                    {stat.vehicle}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {stat.trips}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {stat.totalFuel} L
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {stat.totalMileage.toLocaleString()} km
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {stat.totalCost.toLocaleString()} UGX
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className="text-xs flex items-center gap-1">
                      {stat.maintenanceAdvisory.includes("Immediate") ? EMOJI.WARNING : 
                       stat.maintenanceAdvisory.includes("Schedule") ? EMOJI.ALERT : 
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
          entries={filteredEntries.filter(e => cleanString(e.vehicle_number) === cleanString(selectedVehicle))}
          onClose={() => setSelectedVehicle(null)}
          onDestinationSelect={setSelectedDestination}
        />
      )}

      {/* Destination Detail Modal */}
      {selectedDestination && selectedVehicle && (
        <DestinationDetailModal
          vehicle={selectedVehicle}
          destination={selectedDestination}
          stats={getVehicleDestinationStats(selectedVehicle).find(d => 
            cleanString(d.destination) === cleanString(selectedDestination)
          )!}
          onClose={() => setSelectedDestination(null)}
        />
      )}
    </div>
  );
};

// ... [KPICard, VehicleDetailModal, and DestinationDetailModal components remain the same] ...

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
  const successfulTrips = entries.filter(e => e.comment === "Reached");
  const tripData = successfulTrips.map(entry => ({
    date: format(new Date(entry.departure_time), "MMM dd"),
    duration: Math.round(calculateTripDuration(entry.departure_time, entry.arrival_time)),
    destination: entry.destination
  }));

  // Calculate totals
  let totalFuel = 0;
  let totalCost = 0;
  let totalMileage = 0;
  
  successfulTrips.forEach(trip => {
    const standard = DESTINATION_STANDARDS[trip.destination as keyof typeof DESTINATION_STANDARDS];
    if (standard) {
      totalFuel += standard.fuel;
      totalCost += standard.cost;
    }
    totalMileage += trip.mileage || 0;
  });

  const destinationStats = successfulTrips.reduce((acc, trip) => {
    const standard = DESTINATION_STANDARDS[trip.destination as keyof typeof DESTINATION_STANDARDS];
    if (!standard) return acc;
    
    if (!acc[trip.destination]) {
      acc[trip.destination] = {
        tripCount: 0,
        totalFuel: 0,
        totalCost: 0,
        onTime: 0,
        delayed: 0
      };
    }
    
    acc[trip.destination].tripCount++;
    acc[trip.destination].totalFuel += standard.fuel;
    acc[trip.destination].totalCost += standard.cost;
    
    const actualDuration = calculateTripDuration(trip.departure_time, trip.arrival_time);
    if (actualDuration <= standard.hours * 1.2) {
      acc[trip.destination].onTime++;
    } else {
      acc[trip.destination].delayed++;
    }
    
    return acc;
  }, {} as Record<string, { tripCount: number, totalFuel: number, totalCost: number, onTime: number, delayed: number }>);

  const destinationList = Object.entries(destinationStats).map(([destination, stats]) => ({
    destination,
    ...stats
  }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 md:p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              {EMOJI.TRUCK} {vehicle} - Trip History
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
                {EMOJI.CHART} Performance Summary
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Trips:</span>
                  <span className="font-medium">{entries.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Successful Deliveries:</span>
                  <span className="font-medium text-green-600">
                    {successfulTrips.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Fuel Consumption:</span>
                  <span className="font-medium">
                    {totalFuel} liters
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Cost:</span>
                  <span className="font-medium">
                    {totalCost.toLocaleString()} UGX
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Mileage:</span>
                  <span className="font-medium">
                    {totalMileage.toLocaleString()} km
                  </span>
                </div>
                {entries[0]?.return_comment && (
                  <div className="flex justify-between">
                    <span>Return Comment:</span>
                    <span className="font-medium">
                      {entries[0].return_comment}
                    </span>
                  </div>
                )}
                {entries[0]?.return_comment_date && (
                  <div className="flex justify-between">
                    <span>Return Date:</span>
                    <span className="font-medium">
                      {format(new Date(entries[0].return_comment_date), "MMM dd, yyyy")}
                    </span>
                  </div>
                )}
              </div>

              <h3 className="font-medium mt-4 mb-2 flex items-center gap-2">
                {EMOJI.MAP} Destinations Reached
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase">Destination</th>
                      <th className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase">Trips</th>
                      <th className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {destinationList.map((dest, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1 whitespace-nowrap text-sm capitalize">
                          {dest.destination}
                        </td>
                        <td className="px-3 py-1 whitespace-nowrap text-sm">
                          {dest.tripCount}
                        </td>
                        <td className="px-3 py-1 whitespace-nowrap">
                          <button 
                            onClick={() => onDestinationSelect(dest.destination)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="h-64 md:h-80">
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {entries.slice(0, 5).map((entry, i) => {
                  const standard = DESTINATION_STANDARDS[entry.destination as keyof typeof DESTINATION_STANDARDS];
                  const duration = standard ? 
                    Math.round(calculateTripDuration(entry.departure_time, entry.arrival_time)) : 0;
                  
                  return (
                    <tr key={i}>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        {format(new Date(entry.departure_time), "MMM dd, yyyy")}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm capitalize">
                        {entry.destination}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        {duration} hrs
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          entry.comment === "Reached" ? "bg-green-100 text-green-800" :
                          entry.comment === "Did not go" ? "bg-red-100 text-red-800" :
                          "bg-yellow-100 text-yellow-800"
                        }`}>
                          {entry.comment === "Reached" ? `${EMOJI.SUCCESS} Success` : 
                           entry.comment === "Did not go" ? `${EMOJI.FAILED} Failed` : `${EMOJI.VOID} Void`}
                        </span>
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

const DestinationDetailModal = ({
  vehicle,
  destination,
  stats,
  onClose
}: {
  vehicle: string;
  destination: string;
  stats: { tripCount: number, totalFuel: number, totalCost: number, onTime: number, delayed: number };
  onClose: () => void;
}) => {
  const standard = DESTINATION_STANDARDS[destination as keyof typeof DESTINATION_STANDARDS];
  const efficiency = stats.onTime / stats.tripCount * 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-4 md:p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              {EMOJI.MAP} {vehicle} - {destination.charAt(0).toUpperCase() + destination.slice(1)}
            </h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              &times;
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">Total Trips</p>
                <p className="text-xl font-bold">{stats.tripCount}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">Total Fuel</p>
                <p className="text-xl font-bold">{stats.totalFuel} liters</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">Total Cost</p>
                <p className="text-xl font-bold">{stats.totalCost.toLocaleString()} UGX</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">Efficiency</p>
                <p className="text-xl font-bold">{efficiency.toFixed(1)}%</p>
              </div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-lg">
              <h3 className="font-medium mb-2">Performance</h3>
              <div className="flex justify-between mb-1">
                <span>On-Time Deliveries:</span>
                <span className="font-medium text-green-600">
                  {stats.onTime} ({((stats.onTime / stats.tripCount) * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span>Delayed Deliveries:</span>
                <span className="font-medium text-yellow-600">
                  {stats.delayed} ({((stats.delayed / stats.tripCount) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
            
            {standard && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <h3 className="font-medium mb-2">Destination Standards</h3>
                <div className="flex justify-between mb-1">
                  <span>Expected Duration:</span>
                  <span>{standard.hours} hours</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>Fuel Required:</span>
                  <span>{standard.fuel} liters</span>
                </div>
                <div className="flex justify-between">
                  <span>Labor Cost:</span>
                  <span>{standard.cost.toLocaleString()} UGX</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function for trip duration calculation
const calculateTripDuration = (departure: string, arrival: string) => {
  if (!departure || !arrival) return 0;
  const dep = parseISO(departure);
  const arr = parseISO(arrival);
  return differenceInHours(arr, dep) + (differenceInMinutes(arr, dep) % 60) / 60;
};

export default LogisticsDashboard;