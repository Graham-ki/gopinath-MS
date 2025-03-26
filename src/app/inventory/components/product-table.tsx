import React from 'react';

const ProductTable = () => {
  const products = [
    { name: 'Product A', sku: 'SKU-001', category: 'Electronics', stock: 200, price: 100 },
    { name: 'Product B', sku: 'SKU-002', category: 'Clothing', stock: 50, price: 30 },
  ];

  return (
    <div className="overflow-x-auto bg-white shadow-lg rounded-lg p-4">
      <table className="min-w-full table-auto">
        <thead>
          <tr>
            <th className="px-4 py-2 text-left text-sm text-gray-600">Product Name</th>
            <th className="px-4 py-2 text-left text-sm text-gray-600">SKU</th>
            <th className="px-4 py-2 text-left text-sm text-gray-600">Category</th>
            <th className="px-4 py-2 text-left text-sm text-gray-600">Stock</th>
            <th className="px-4 py-2 text-left text-sm text-gray-600">Price</th>
            <th className="px-4 py-2 text-left text-sm text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product, index) => (
            <tr
              key={product.sku}
              className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-gray-100' : 'bg-white'}`}
            >
              <td className="px-4 py-2">{product.name}</td>
              <td className="px-4 py-2">{product.sku}</td>
              <td className="px-4 py-2">{product.category}</td>
              <td className="px-4 py-2">{product.stock}</td>
              <td className="px-4 py-2">${product.price}</td>
              <td className="px-4 py-2 space-x-2">
                <button className="text-blue-500 hover:text-blue-700">Edit</button>
                <button className="text-red-500 hover:text-red-700">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductTable;
