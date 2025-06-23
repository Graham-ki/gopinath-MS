'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/supabase/supabaseClient'
import { FiEdit, FiTrash2, FiPlus } from 'react-icons/fi'

type Offence = {
  id: number
  vehicle_number: string
  date: string
  status: string
  offence: string
  charge: number
  driver: string
  location: string
}

type GroupedOffences = {
  [vehicle_number: string]: Offence[]
}

export default function AddOffences() {
  const [offences, setOffences] = useState<Offence[]>([])
  const [formData, setFormData] = useState({
    vehicle_number: '',
    date: '',
    status: 'Pending',
    offence: '',
    charge: '',
    driver: '',
    location: ''
  })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [groupedOffences, setGroupedOffences] = useState<GroupedOffences>({})
  const [suggestions, setSuggestions] = useState({
    vehicleNumbers: [] as string[],
    offences: [] as string[],
    charges: [] as number[]
  })
  const [showSuggestions, setShowSuggestions] = useState({
    vehicleNumber: false,
    offence: false,
    charge: false
  })

  useEffect(() => {
    fetchOffences()
  }, [])

  useEffect(() => {
    const grouped = offences.reduce((acc: GroupedOffences, offence) => {
      if (!acc[offence.vehicle_number]) {
        acc[offence.vehicle_number] = []
      }
      acc[offence.vehicle_number].push(offence)
      return acc
    }, {} as GroupedOffences)
    setGroupedOffences(grouped)

    // Extract unique suggestions from existing data
    const uniqueVehicleNumbers = [...new Set(offences.map(o => o.vehicle_number))]
    const uniqueOffences = [...new Set(offences.map(o => o.offence))]
    const uniqueCharges = [...new Set(offences.map(o => o.charge))]

    setSuggestions({
      vehicleNumbers: uniqueVehicleNumbers,
      offences: uniqueOffences,
      charges: uniqueCharges
    })
  }, [offences])

  const fetchOffences = async () => {
    const { data, error } = await supabase
      .from('vehicle_offences')
      .select('*')
      .order('date', { ascending: false })
    if (error) console.error('Error fetching offences:', error)
    else setOffences(data)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })

    // Show suggestions based on input
    if (name === 'vehicle_number') {
      setShowSuggestions({
        ...showSuggestions,
        vehicleNumber: value.length > 0
      })
    } else if (name === 'offence') {
      setShowSuggestions({
        ...showSuggestions,
        offence: value.length > 0
      })
    } else if (name === 'charge') {
      setShowSuggestions({
        ...showSuggestions,
        charge: value.length > 0
      })
    }
  }

  const handleSuggestionClick = (field: 'vehicle_number' | 'offence' | 'charge', value: string | number) => {
    setFormData({
      ...formData,
      [field]: value.toString()
    })
    setShowSuggestions({
      vehicleNumber: false,
      offence: false,
      charge: false
    })
  }

  const filteredSuggestions = {
    vehicleNumbers: suggestions.vehicleNumbers.filter(vn =>
      vn.toLowerCase().includes(formData.vehicle_number.toLowerCase())
    ),
    offences: suggestions.offences.filter(o =>
      o.toLowerCase().includes(formData.offence.toLowerCase())
    ),
    charges: suggestions.charges.filter(c =>
      c.toString().includes(formData.charge)
    )
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!formData.vehicle_number || !formData.date || !formData.offence || !formData.charge) {
      alert('Please fill all fields')
      return
    }

    if (editingId) {
      const { error } = await supabase
        .from('vehicle_offences')
        .update({
          ...formData,
          charge: Number(formData.charge)
        })
        .eq('id', editingId)
      if (error) {
        console.error('Error updating offence:', error)
      } else {
        setFormData({ vehicle_number: '', date: '', status: 'Pending', offence: '', charge: '', driver: '', location: '' })
        setEditingId(null)
        fetchOffences()
      }
    } else {
      const { error } = await supabase
        .from('vehicle_offences')
        .insert([{
          ...formData,
          charge: Number(formData.charge)
        }])
      if (error) {
        console.error('Error adding offence:', error)
      } else {
        setFormData({ vehicle_number: '', date: '', status: 'Pending', offence: '', charge: '', driver: '', location: '' })
        fetchOffences()
      }
    }
    setShowSuggestions({
      vehicleNumber: false,
      offence: false,
      charge: false
    })
  }
  const handleEdit = (offence: Offence) => {
    setFormData({
      vehicle_number: offence.vehicle_number,
      date: offence.date,
      status: offence.status,
      offence: offence.offence,
      charge: offence.charge.toString(),
      driver: offence.driver || '',
      location: offence.location || ''
    })
    setEditingId(offence.id)
  }

  const handleDelete = async (id: number): Promise<void> => {
    if (confirm('Are you sure you want to delete this offence?')) {
      const { error } = await supabase
        .from('vehicle_offences')
        .delete()
        .eq('id', id)
      if (error) console.error('Error deleting offence:', error)
      else fetchOffences()
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Vehicle Offence Management</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4 text-black">{editingId ? 'Edit Offence' : 'Add New Offence'}</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number</label>
            <input
              type="text"
              name="vehicle_number"
              value={formData.vehicle_number}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md text-black"
              required
              autoComplete="off"
            />
            {showSuggestions.vehicleNumber && filteredSuggestions.vehicleNumbers.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {filteredSuggestions.vehicleNumbers.map((vn, index) => (
                  <div
                    key={index}
                    className="p-2 hover:bg-gray-100 cursor-pointer text-black"
                    onClick={() => handleSuggestionClick('vehicle_number', vn)}
                  >
                    {vn}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md text-black"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md text-black"
              required
            >
              <option value="Pending">Pending</option>
              <option value="Cleared">Cleared</option>
            </select>
          </div>
          
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Offence</label>
            <input
              type="text"
              name="offence"
              value={formData.offence}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md text-black"
              required
              autoComplete="off"
            />
            {showSuggestions.offence && filteredSuggestions.offences.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {filteredSuggestions.offences.map((offence, index) => (
                  <div
                    key={index}
                    className="p-2 hover:bg-gray-100 cursor-pointer text-black"
                    onClick={() => handleSuggestionClick('offence', offence)}
                  >
                    {offence}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Charge/Penalty</label>
            <input
              type="number"
              name="charge"
              value={formData.charge}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md text-black"
              required
              autoComplete="off"
            />
            {showSuggestions.charge && filteredSuggestions.charges.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {filteredSuggestions.charges.map((charge, index) => (
                  <div
                    key={index}
                    className="p-2 hover:bg-gray-100 cursor-pointer text-black"
                    onClick={() => handleSuggestionClick('charge', charge)}
                  >
                    UGX {charge}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Driver</label>
            <input
              type="text"
              name="driver"
              value={formData.driver}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md text-black"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md text-black"
              required
            />
          </div>
          <div className="md:col-span-2 lg:col-span-4 flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
            >
              <FiPlus className="mr-2" />
              {editingId ? 'Update Offence' : 'Add Offence'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-black">Offence Records</h2>
        {Object.keys(groupedOffences).length > 0 ? (
          Object.entries(groupedOffences).map(([vehicle, vehicleOffences]) => (
            <div key={vehicle} className="mb-8">
              <h3 className="text-lg font-medium mb-2 text-gray-600">Vehicle: {vehicle}</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Offence</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Charge</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vehicleOffences.map((offence) => (
                      <tr key={offence.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{new Date(offence.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            offence.status === 'Cleared' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {offence.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{offence.offence}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">UGX {offence.charge}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{offence.driver}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{offence.location}</td>
                        <td className="px-6 py-4 whitespace-nowrap flex space-x-2">
                          <button
                            onClick={() => handleEdit(offence)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <FiEdit />
                          </button>
                          <button
                            onClick={() => handleDelete(offence.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <FiTrash2 />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No offences recorded yet.</p>
        )}
      </div>
    </div>
  )
}