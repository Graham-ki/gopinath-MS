"use client";
import { useRouter } from "next/navigation";

export default function Unauthorized() {
  const router = useRouter();

  const handleGoHome = () => {
    router.push("/"); // Redirect to the home page
  };
  const handleGoBack = () => {
    router.push("/login"); // Redirect to the home page
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="bg-gray-800 p-8 rounded-lg shadow-md text-center">
        <h2 className="text-2xl font-bold mb-4">Unauthorized Access</h2>
        <p className="text-gray-300 mb-6">
          You do not have permission to view this page.
        </p>
        <button
          onClick={handleGoHome}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-300"
        >
          Back to Home
        </button>
        <button
          onClick={handleGoBack}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-300 ml-2"
        >
          Login
        </button>
      </div>
    </div>
  );
}