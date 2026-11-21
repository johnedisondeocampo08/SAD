
import { useCallback, useEffect, useState } from 'react';
import {
  getCustomers,
  createCustomer,
} from '../services/customerService';
import CustomerForm from '../components/CustomerForm';

function CustomerPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadCustomers = useCallback(async (signal) => {
    try {
      const data = await getCustomers(signal);

      if (!signal?.aborted) {
        setCustomers(data);
        setError('');
      }
    } catch (err) {
      if (!signal?.aborted) {
        setError(err.message);
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    loadCustomers(controller.signal);

    return () => controller.abort();
  }, [loadCustomers]);

  async function handleCreateCustomer(formData) {
    setSaving(true);
    setFormError('');
    setSuccess('');

    try {
      await createCustomer(formData);

      setShowForm(false);
      setSuccess('Customer added successfully!');

      await loadCustomers();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setShowForm(false);
    setFormError('');
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-white">
          Customer Management
        </h1>

        <button
          type="button"
          onClick={() => {
            setShowForm(true);
            setFormError('');
            setSuccess('');
          }}
          disabled={showForm}
          className="rounded-lg bg-emerald-600 px-5 py-3 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          + Add Customer
        </button>
      </div>

      {success && (
        <p
          role="status"
          className="mb-5 rounded-lg border border-emerald-700 bg-emerald-950 p-4 text-emerald-300"
        >
          {success}
        </p>
      )}

      {showForm && (
        <div className="mb-6">
          {formError && (
            <p
              role="alert"
              className="mb-4 rounded-lg border border-red-700 bg-red-950 p-4 text-red-300"
            >
              {formError}
            </p>
          )}

          <CustomerForm
            onSubmit={handleCreateCustomer}
            onCancel={handleCancel}
            saving={saving}
          />
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-700">
        <div className="border-b border-slate-700 bg-slate-900 p-5">
          <h2 className="text-xl font-semibold text-white">
            Customer Records
          </h2>
        </div>

        {loading ? (
          <p className="p-5 text-slate-300">
            Loading customers...
          </p>
        ) : error ? (
          <p role="alert" className="p-5 text-red-400">
            Error: {error}
          </p>
        ) : customers.length === 0 ? (
          <p className="p-5 text-slate-400">
            No customers found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-white">
              <thead className="bg-slate-800 text-slate-300">
                <tr>
                  <th className="p-4">Customer ID</th>
                  <th className="p-4">Full Name</th>
                  <th className="p-4">Contact Number</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Address</th>
                </tr>
              </thead>

              <tbody>
                {customers.map((customer) => (
                  <tr
                    key={customer.customer_id}
                    className="border-t border-slate-700 hover:bg-slate-900"
                  >
                    <td className="p-4">
                      {customer.customer_id}
                    </td>
                    <td className="p-4">
                      {customer.full_name}
                    </td>
                    <td className="p-4">
                      {customer.contact_number}
                    </td>
                    <td className="p-4">
                      {customer.email}
                    </td>
                    <td className="p-4">
                      {customer.address}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomerPage;