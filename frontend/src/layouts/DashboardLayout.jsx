
import { NavLink, Outlet } from 'react-router-dom';

const navigation = [
  { name: 'Dashboard', path: '/' },
  { name: 'Customers', path: '/customers' },
  { name: 'Orders', path: '/orders' },
  { name: 'Products', path: '/products' },
  { name: 'Inventory', path: '/inventory' },
  { name: 'Production', path: '/production' },
  { name: 'Payments', path: '/payments' },
  { name: 'Expenses', path: '/expenses' },
];

function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <aside className="w-64 shrink-0 bg-slate-900 p-6">
        <h1 className="mb-10 text-2xl font-bold">
          Simula Studio
        </h1>

        <nav className="space-y-2">
          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `block rounded-lg px-4 py-3 transition-colors ${
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              {item.name}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-800 bg-slate-900 px-6 py-7">
          <h2 className="text-xl font-semibold">
            Management System
          </h2>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
