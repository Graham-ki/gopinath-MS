import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-900 text-white">
      <h1 className="text-3xl font-bold mb-6">Welcome to the Management System</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Inventory Management" link="/inventory" />
        <Card title="Vehicle Tracking" link="/vehicle_track" />
        <Card title="HR Management" link="/hrm" />
      </div>
    </div>
  );
}

function Card({ title, link }: { title: string; link: string }) {
  return (
    <Link href={link}>
      <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition cursor-pointer text-black text-center">
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
    </Link>
  );
}
