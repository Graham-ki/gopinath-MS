'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/supabase/supabaseClient'
import { FiChevronDown, FiX, FiSearch } from 'react-icons/fi'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js'
import { Pie, Bar } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

interface VehicleOffence {
  id: number
  vehicle_number: string
  offence: string
  charge: string
  date: string
  status: 'Cleared' | 'Pending'
  driver?: string
  location?: string
  ticket_number?: string
  prn_number?: string
}

interface GroupedOffences {
  [vehicle: string]: VehicleOffence[]
}

export default function Reports() {
  const [offences, setOffences] = useState<VehicleOffence[]>([])
  const [filteredOffences, setFilteredOffences] = useState<VehicleOffence[]>([])
  const [timeFilter, setTimeFilter] = useState<string>('all')
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [searchTerm, setSearchTerm] = useState<string>('')

  useEffect(() => {
    fetchOffences()
  }, [])

  useEffect(() => {
    filterOffencesByTime()
  }, [offences, timeFilter, searchTerm])

  const fetchOffences = async () => {
    const { data, error } = await supabase
      .from('vehicle_offences')
      .select('*')
      .order('date', { ascending: false })
    if (error) console.error('Error fetching offences:', error)
    else setOffences(data)
  }

  const filterOffencesByTime = () => {
    const now = new Date()
    let filtered = [...offences]

    // Apply search filter if search term exists
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(offence => 
        offence.vehicle_number.toLowerCase().includes(term) || 
        (offence.driver && offence.driver.toLowerCase().includes(term))
      )
    }

    // Apply time filter
    switch (timeFilter) {
      case 'today':
        filtered = filtered.filter(offence => {
          const offenceDate = new Date(offence.date)
          return (
            offenceDate.getDate() === now.getDate() &&
            offenceDate.getMonth() === now.getMonth() &&
            offenceDate.getFullYear() === now.getFullYear()
          )
        })
        break
      case 'week':
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay())
        startOfWeek.setHours(0, 0, 0, 0)
        
        filtered = filtered.filter(offence => {
          const offenceDate = new Date(offence.date)
          return offenceDate >= startOfWeek
        })
        break
      case 'month':
        filtered = filtered.filter(offence => {
          const offenceDate = new Date(offence.date)
          return (
            offenceDate.getMonth() === now.getMonth() &&
            offenceDate.getFullYear() === now.getFullYear()
          )
        })
        break
      case 'year':
        filtered = filtered.filter(offence => {
          const offenceDate = new Date(offence.date)
          return offenceDate.getFullYear() === now.getFullYear()
        })
        break
      default:
        // 'all' - no filtering needed
        break
    }

    setFilteredOffences(filtered)
  }

  const groupedOffences = filteredOffences.reduce<GroupedOffences>((acc, offence) => {
    if (!acc[offence.vehicle_number]) {
      acc[offence.vehicle_number] = []
    }
    acc[offence.vehicle_number].push(offence)
    return acc
  }, {})

  const topVehicles = Object.entries(groupedOffences)
    .map(([vehicle, offences]) => ({
      vehicle,
      count: offences.length,
      totalCharge: offences.reduce((sum, o) => sum + parseFloat(o.charge), 0),
      clearedCount: offences.filter(o => o.status === 'Cleared').length,
      pendingCount: offences.filter(o => o.status === 'Pending').length
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const offenceTypes = filteredOffences.reduce<Record<string, number>>((acc, offence) => {
    acc[offence.offence] = (acc[offence.offence] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Status distribution data for pie chart
  const statusData = filteredOffences.reduce((acc, offence) => {
    acc[offence.status] = (acc[offence.status] || 0) + 1
    return acc
  }, { Cleared: 0, Pending: 0 })

  const statusPieData = {
    labels: ['Cleared', 'Pending'],
    datasets: [
      {
        data: [statusData.Cleared, statusData.Pending],
        backgroundColor: [
          'rgba(75, 192, 192, 0.7)',
          'rgba(255, 99, 132, 0.7)',
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 1,
      },
    ],
  }

  const offencePieData = {
    labels: Object.keys(offenceTypes),
    datasets: [
      {
        data: Object.values(offenceTypes),
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(153, 102, 255, 0.7)',
          'rgba(75, 192, 192, 0.7)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(75, 192, 192, 1)',
        ],
        borderWidth: 1,
      },
    ],
  }

  const barData = {
    labels: topVehicles.map(v => v.vehicle),
    datasets: [
      {
        label: 'Number of Offences',
        data: topVehicles.map(v => v.count),
        backgroundColor: 'rgba(54, 162, 235, 0.7)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
      {
        label: 'Total Charges (UGX)',
        data: topVehicles.map(v => v.totalCharge),
        backgroundColor: 'rgba(255, 99, 132, 0.7)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
    ],
  }

  const openDetailsModal = (vehicle: string) => {
    setSelectedVehicle(vehicle)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedVehicle(null)
  }

  const StatusBadge = ({ status }: { status: 'Cleared' | 'Pending' }) => {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        status === 'Cleared' 
          ? 'bg-green-100 text-green-800' 
          : 'bg-yellow-100 text-yellow-800'
      }`}>
        {status}
      </span>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">EPS Vehicle Offence Reports</h1>
      
      {/* Search and Time Filter Controls */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Search Input */}
          <div className="relative w-full md:w-1/3">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by vehicle number or driver..."
              className="text-black block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Time Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTimeFilter('all')}
              className={`px-4 py-2 rounded-md ${timeFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              All Time
            </button>
            <button
              onClick={() => setTimeFilter('today')}
              className={`px-4 py-2 rounded-md ${timeFilter === 'today' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeFilter('week')}
              className={`px-4 py-2 rounded-md ${timeFilter === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              This Week
            </button>
            <button
              onClick={() => setTimeFilter('month')}
              className={`px-4 py-2 rounded-md ${timeFilter === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              This Month
            </button>
            <button
              onClick={() => setTimeFilter('year')}
              className={`px-4 py-2 rounded-md ${timeFilter === 'year' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              This Year
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-black">Offence Status</h2>
          <div className="h-64">
            <Pie data={statusPieData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-black">Offence Types</h2>
          <div className="h-64">
            <Pie data={offencePieData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-black">Top Offending Vehicles</h2>
          <div className="h-64">
            <Bar data={barData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-black">Vehicle Offence Summary</h2>
        <p className="text-gray-600 mb-4">Showing {filteredOffences.length} offences ({timeFilter === 'all' ? 'all time' : `this ${timeFilter}`})</p>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Offences</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cleared</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pending</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Charges</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(groupedOffences).map(([vehicle, vehicleOffences]) => {
                const totalCharge = vehicleOffences.reduce((sum, o) => sum + parseFloat(o.charge), 0)
                const clearedCount = vehicleOffences.filter(o => o.status === 'Cleared').length
                const pendingCount = vehicleOffences.filter(o => o.status === 'Pending').length
                
                return (
                  <tr key={vehicle} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-600">{vehicle}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{vehicleOffences.length}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{clearedCount}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{pendingCount}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">UGX {totalCharge.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => openDetailsModal(vehicle)}
                        className="text-blue-600 hover:text-blue-900 flex items-center"
                      >
                        <FiChevronDown className="mr-1" /> View
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {isModalOpen && selectedVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-black">
                  Offence Details for {selectedVehicle}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FiX size={24} />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Offence</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Charge</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Driver</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Ticket Number</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">PRN Number</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {groupedOffences[selectedVehicle]?.map((offence) => (
                      <tr key={offence.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {new Date(offence.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {offence.offence}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          UGX {offence.charge}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {offence.driver || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {offence.location || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {offence.ticket_number || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {offence.prn_number || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={offence.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}