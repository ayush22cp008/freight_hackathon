import CreateTripClient from './CreateTripClient';

export const metadata = {
  title: 'Create Trip | Freight',
};

export default function CreateTripPage() {
  return (
    <main className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Company Trip Management</h1>
      <CreateTripClient />
    </main>
  );
}
