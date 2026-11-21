
import { useState } from 'react';

const initialForm = {
  full_name: '',
  contact_number: '',
  email: '',
  address: '',
  notes: '',
};

function CustomerForm({ onSubmit, onCancel, saving }) {
  const [formData, setFormData] = useState(initialForm);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await onSubmit(formData);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-700 bg-slate-900 p-6"
    >
      <h2 className="mb-5 text-xl font-semibold text-white">
        Add New Customer
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="full_name"
            className="mb-2 block text-sm text-slate-300"
          >
            Full Name *
          </label>

          <input
            id="full_name"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            required
            maxLength={150}
            disabled={saving}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-white"
          />
        </div>

        <div>
          <label
            htmlFor="contact_number"
            className="mb-2 block text-sm text-slate-300"
          >
            Contact Number
          </label>

          <input
            id="contact_number"
            name="contact_number"
            value={formData.contact_number}
            onChange={handleChange}
            maxLength={20}
            disabled={saving}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-white"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm text-slate-300"
          >
            Email
          </label>

          <input
            id="email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            maxLength={150}
            disabled={saving}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-white"
          />
        </div>

        <div>
          <label
            htmlFor="address"
            className="mb-2 block text-sm text-slate-300"
          >
            Address
          </label>

          <input
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            disabled={saving}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-white"
          />
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="notes"
            className="mb-2 block text-sm text-slate-300"
          >
            Notes
          </label>

          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            disabled={saving}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-white"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg bg-slate-700 px-5 py-2 text-white hover:bg-slate-600 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-5 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Customer'}
        </button>
      </div>
    </form>
  );
}

export default CustomerForm;
