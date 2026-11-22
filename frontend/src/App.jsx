import { useEffect, useRef, useState } from 'react';
const today = new Date().toISOString().slice(0, 10);
const nav = [
  ['Overview', '⌂'], ['Orders', '▤'], ['Customers', '♙'], ['Products', '✳'],
  ['Inventory', '▦'], ['Production', '⚒'], ['Payments', '↗'], ['Expenses', '−'],
  ['Reports', '▥'],
];

const initialState = {
  customers: [],
  products: [
    { id: 'P-01', name: 'Scented candle · 120 ml', type: 'Candle', price: 280, recipe: [{ material: 'Soy wax', quantity: 0.12 }, { material: 'Fragrance oil', quantity: 0.01 }, { material: 'Cotton wick', quantity: 1 }, { material: 'Candle jar', quantity: 1 }] },
    { id: 'P-02', name: 'Scented candle · 200 ml', type: 'Candle', price: 390, recipe: [{ material: 'Soy wax', quantity: 0.2 }, { material: 'Fragrance oil', quantity: 0.018 }, { material: 'Cotton wick', quantity: 1 }, { material: 'Candle jar', quantity: 1 }] },
    { id: 'P-03', name: 'Ref magnet', type: 'Souvenir', price: 45, recipe: [{ material: 'Photo paper', quantity: 1 }, { material: 'Sticker paper', quantity: 1 }] },
    { id: 'P-04', name: 'Acrylic keychain', type: 'Souvenir', price: 85, recipe: [{ material: 'Acrylic blank', quantity: 1 }, { material: 'Sticker paper', quantity: 1 }] },
    { id: 'P-05', name: 'Personalized resin keepsake', type: 'Souvenir', price: 180, recipe: [{ material: 'Resin', quantity: 0.08 }, { material: 'Color pigment', quantity: 0.002 }] },
    { id: 'P-06', name: 'Gypsum pot', type: 'Souvenir', price: 150, recipe: [{ material: 'Gypsum', quantity: 0.2 }, { material: 'Color pigment', quantity: 0.003 }] },
    { id: 'P-07', name: 'Personalized bookmark', type: 'Souvenir', price: 65, recipe: [{ material: 'Photo paper', quantity: 1 }, { material: 'Tab sticker', quantity: 1 }] },
  ],
  materials: [
    { id: 'M-01', name: 'Soy wax', unit: 'kg', stock: 8.5, threshold: 2, price: 360, active: true },
    { id: 'M-02', name: 'Fragrance oil', unit: 'L', stock: 0.7, threshold: 0.5, price: 850, active: true },
    { id: 'M-03', name: 'Cotton wick', unit: 'pc', stock: 42, threshold: 15, price: 3, active: true },
    { id: 'M-04', name: 'Candle jar', unit: 'pc', stock: 18, threshold: 12, price: 32, active: true },
    { id: 'M-05', name: 'Photo paper', unit: 'sheet', stock: 24, threshold: 10, price: 4, active: true },
    { id: 'M-06', name: 'Sticker paper', unit: 'sheet', stock: 6, threshold: 10, price: 5, active: true },
    { id: 'M-07', name: 'Acrylic blank', unit: 'pc', stock: 30, threshold: 10, price: 16, active: true },
    { id: 'M-08', name: 'Resin', unit: 'kg', stock: 2.4, threshold: 0.5, price: 560, active: true },
    { id: 'M-09', name: 'Color pigment', unit: 'kg', stock: 0.16, threshold: 0.1, price: 430, active: true },
    { id: 'M-10', name: 'Gypsum', unit: 'kg', stock: 4.2, threshold: 1, price: 65, active: true },
    { id: 'M-11', name: 'Packaging', unit: 'pc', stock: 22, threshold: 10, price: 12, active: true },
    { id: 'M-12', name: 'Photo top', unit: 'sheet', stock: 12, threshold: 5, price: 6, active: true },
    { id: 'M-13', name: 'Tab sticker', unit: 'sheet', stock: 14, threshold: 5, price: 4, active: true },
    { id: 'M-14', name: 'Wooden stick', unit: 'pc', stock: 25, threshold: 10, price: 2, active: true },
  ],
  orders: [],
  payments: [],
  expenses: [],
  batches: [],
  movements: [],
};

const money = (value) => `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const idFor = (prefix, items) => `${prefix}-${String(items.length + 1).padStart(3, '0')}`;
const dateLabel = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

function productStock(batches, orders, productId) {
  const produced = batches.filter((batch) => batch.productId === productId).reduce((sum, batch) => sum + Number(batch.quantity), 0);
  const reserved = orders.filter((order) => order.stockReserved).flatMap((order) => order.items)
    .filter((item) => item.productId === productId).reduce((sum, item) => sum + Number(item.quantity), 0);
  return Math.max(0, produced - reserved);
}

function orderStockShortage(order, products, batches, orders) {
  if (order.stockReserved) return null;
  const requiredByProduct = new Map();
  for (const item of order.items) requiredByProduct.set(item.productId, (requiredByProduct.get(item.productId) || 0) + Number(item.quantity));
  for (const [productId, required] of requiredByProduct) {
    const available = productStock(batches, orders, productId);
    if (available < required) {
      const product = products.find((entry) => entry.id === productId);
      return { product: product?.name || 'Product', required, available };
    }
  }
  return null;
}

function App() {
  const [access, setAccess] = useState({ loading: true, setupRequired: false, owner: null, error: '' });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    async function checkAccess() {
      try {
        const status = await apiRequest('/api/auth/status');
        if (status.setupRequired) {
          if (active) setAccess({ loading: false, setupRequired: true, owner: null, error: '' });
          return;
        }
        try {
          const result = await apiRequest('/api/auth/me');
          if (active) setAccess({ loading: false, setupRequired: false, owner: result.data, error: '' });
        } catch (error) {
          if (error.status === 401) {
            if (active) setAccess({ loading: false, setupRequired: false, owner: null, error: '' });
          } else {
            throw error;
          }
        }
      } catch (error) {
        if (active) setAccess({ loading: false, setupRequired: false, owner: null, error: error.message });
      }
    }
    checkAccess();
    return () => { active = false; };
  }, [retry]);

  async function signOut() {
    try {
      await apiRequest('/api/auth/signout', { method: 'POST' });
      setAccess((current) => ({ ...current, owner: null }));
    } catch (error) {
      setAccess((current) => ({ ...current, error: error.message }));
    }
  }

  if (access.loading) return <AccessLoading />;
  if (access.error && !access.owner) return <AccessUnavailable message={access.error} onRetry={() => setRetry((value) => value + 1)} />;
  if (!access.owner) return <AccessPage key={access.setupRequired ? 'setup' : 'signin'} setupRequired={access.setupRequired} onAuthenticated={(owner) => setAccess({ loading: false, setupRequired: false, owner, error: '' })} />;
  return <WorkspaceApp owner={access.owner} onSignOut={signOut} />;
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('The studio server returned an unreadable response.');
  }
  if (!response.ok || result.success === false) {
    const error = new Error(result.message || 'The request could not be completed.');
    error.status = response.status;
    throw error;
  }
  return result;
}

function AccessLoading() {
  return <div className="access-screen"><div className="access-card access-loading"><span className="brand-mark">s<span>.</span></span><h1>Opening your studio</h1><p>Connecting to your saved business records…</p></div></div>;
}

function AccessUnavailable({ message, onRetry }) {
  return <div className="access-screen"><div className="access-card"><div className="access-brand"><span className="brand-mark">s<span>.</span></span><span><strong>simula studio</strong><small>OWNER WORKSPACE</small></span></div><div className="access-flower">✿</div><h1>We can’t reach your studio</h1><p>{message || 'Check that the studio server is running and try again.'}</p><button className="button button-primary access-submit" onClick={onRetry}>Try again</button></div></div>;
}

function AccessPage({ setupRequired, onAuthenticated }) {
  const [view, setView] = useState(setupRequired ? 'setup' : 'signin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [owners, setOwners] = useState([
    { displayName: '', email: '', password: '', confirm: '' },
    { displayName: '', email: '', password: '', confirm: '' },
  ]);
  const updateOwner = (index, key, value) => setOwners((current) => current.map((owner, position) => position === index ? { ...owner, [key]: value } : owner));

  async function handleSignIn(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await apiRequest('/api/auth/signin', { method: 'POST', body: JSON.stringify({ email, password }) });
      onAuthenticated(result.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSetup(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    if (owners.some((owner) => owner.password !== owner.confirm)) {
      setError('Each owner password and confirmation must match.');
      setBusy(false);
      return;
    }
    try {
      const result = await apiRequest('/api/auth/setup', {
        method: 'POST',
        body: JSON.stringify({ owners: owners.map(({ displayName, email: ownerEmail, password: ownerPassword }) => ({ displayName, email: ownerEmail, password: ownerPassword })) }),
      });
      onAuthenticated(result.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRecovery(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await apiRequest('/api/auth/recovery', { method: 'POST', body: JSON.stringify({ email }) });
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return <div className="access-screen"><section className={`access-card ${view === 'setup' ? 'setup-card' : ''}`}>
    <div className="access-brand"><span className="brand-mark">s<span>.</span></span><span><strong>simula studio</strong><small>OWNER WORKSPACE</small></span></div>
    <div className="access-flower">✿</div>
    {view === 'setup' ? <>
      <p className="eyebrow">A ONE-TIME START</p><h1>Welcome to your studio.</h1><p className="access-intro">Create the two owner accounts for you and your co-owner. This setup closes as soon as both accounts are saved.</p>
      <form onSubmit={handleSetup}>
        {owners.map((owner, index) => <fieldset className="owner-setup" key={index}><legend>{index === 0 ? 'First owner' : 'Co-owner'}</legend><label className="form-field"><span>Display name</span><input required maxLength="120" value={owner.displayName} onChange={(e) => updateOwner(index, 'displayName', e.target.value)} placeholder={index === 0 ? 'Your name' : 'Co-owner name'} /></label><label className="form-field"><span>Email</span><input required type="email" autoComplete="email" value={owner.email} onChange={(e) => updateOwner(index, 'email', e.target.value)} placeholder="owner@email.com" /></label><div className="form-grid"><label className="form-field"><span>Password · 10+ characters</span><input required minLength="10" type="password" autoComplete="new-password" value={owner.password} onChange={(e) => updateOwner(index, 'password', e.target.value)} /></label><label className="form-field"><span>Confirm password</span><input required minLength="10" type="password" autoComplete="new-password" value={owner.confirm} onChange={(e) => updateOwner(index, 'confirm', e.target.value)} /></label></div></fieldset>)}
        {error && <div className="form-error" role="alert">{error}</div>}<button className="button button-primary access-submit" disabled={busy}>{busy ? 'Setting up your owners…' : 'Create owner accounts'}</button>
      </form>
    </> : view === 'recovery' ? <>
      <p className="eyebrow">OWNER ACCOUNT SUPPORT</p><h1>Forgot your password?</h1><p className="access-intro">Enter an owner email. We’ll confirm a valid request without changing account credentials.</p>
      <form onSubmit={handleRecovery}><label className="form-field access-field"><span>Owner email</span><input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" /></label>{error && <div className="form-error" role="alert">{error}</div>}{message && <div className="recovery-success" role="status">{message}</div>}<button className="button button-primary access-submit" disabled={busy}>{busy ? 'Checking request…' : 'Request recovery instructions'}</button></form>
      <button className="access-link" onClick={() => { setView('signin'); setError(''); setMessage(''); }}>← Back to sign in</button>
    </> : <>
      <p className="eyebrow">A LITTLE STUDIO, ALL IN ONE PLACE</p><h1>Welcome back.</h1><p className="access-intro">Sign in with one of your two owner accounts to open the studio.</p>
      <form onSubmit={handleSignIn}><label className="form-field access-field"><span>Email address</span><input required type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@email.com" /></label><label className="form-field access-field"><span>Password</span><input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>{error && <div className="form-error" role="alert">{error}</div>}<button className="button button-primary access-submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in to your studio'}</button></form>
      <button className="access-link" onClick={() => { setView('recovery'); setError(''); setMessage(''); }}>Forgot your password?</button>
      {setupRequired && <p className="access-setup-note">Owner setup is required before sign in.</p>}
    </>}
    <div className="access-footnote">Private owner access · No public sign-up</div>
  </section></div>;
}

function WorkspaceApp({ owner, onSignOut }) {
  const [data, setData] = useState(initialState);
  const [active, setActive] = useState('Overview');
  const [modal, setModal] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [basis, setBasis] = useState('order');
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const saveQueue = useRef(Promise.resolve());
  const workspaceVersion = useRef(0);
  const ownerName = owner.display_name;

  useEffect(() => {
    let activeRequest = true;
    apiRequest('/api/workspace')
      .then((result) => {
        if (!activeRequest) return;
        workspaceVersion.current = result.version;
        if (result.data) {
          const workspace = { ...initialState, ...result.data };
          workspace.orders = workspace.orders.map((order) => {
            const paid = workspace.payments.filter((payment) => payment.orderId === order.id).reduce((sum, payment) => sum + Number(payment.amount), 0);
            const isPaid = paid >= Number(order.total);
            return {
              ...order,
              paymentStatus: isPaid ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid',
              status: order.status === 'Cancelled' ? 'Cancelled' : isPaid && order.status === 'Delivered' ? 'Delivered' : isPaid ? 'In production' : 'Pending',
            };
          });
          setData(workspace);
        }
        setLoaded(true);
      })
      .catch((error) => {
        if (!activeRequest) return;
        setLoadError(error.message);
      });
    return () => { activeRequest = false; };
  }, []);

  useEffect(() => {
    if (!loaded || loadError) return undefined;
    const timer = setTimeout(() => {
      saveQueue.current = saveQueue.current
        .catch(() => { })
        .then(() => apiRequest('/api/workspace', { method: 'PUT', body: JSON.stringify({ data, version: workspaceVersion.current }) }))
        .then((result) => {
          workspaceVersion.current = result.version;
          setSaveError('');
        })
        .catch((error) => setSaveError(error.message));
    }, 250);
    return () => clearTimeout(timer);
  }, [data, loaded, loadError]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  const lowStock = data.materials.filter((material) => material.active && material.stock <= material.threshold);
  const outstanding = data.orders.filter((order) => order.status !== 'Cancelled').reduce((sum, order) => sum + Math.max(0, order.total - data.payments.filter((payment) => payment.orderId === order.id).reduce((total, payment) => total + Number(payment.amount), 0)), 0);
  const monthOrders = data.orders.filter((order) => order.status !== 'Cancelled' && (basis === 'order' ? order.date : order.dueDate || order.date)?.startsWith(month));
  const monthRevenue = monthOrders.reduce((sum, order) => sum + order.items.reduce((lineSum, item) => lineSum + item.quantity * item.price, 0), 0);
  const monthCandles = monthOrders.reduce((sum, order) => sum + order.items.filter((item) => item.type === 'Candle').reduce((lineSum, item) => lineSum + item.quantity * item.price, 0), 0);
  const monthSouvenirs = monthOrders.reduce((sum, order) => sum + order.items.filter((item) => item.type === 'Souvenir').reduce((lineSum, item) => lineSum + item.quantity * item.price, 0), 0);

  function update(patch) {
    setData((current) => ({ ...current, ...patch }));
  }

  function flash(message) {
    setNotice(message);
  }

  function addCustomer(form) {
    if (!form.name.trim()) return 'Enter the customer’s full name.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Enter a valid email address.';
    if (form.phone && !/^[+()\d\s-]{7,20}$/.test(form.phone)) return 'Enter a valid contact number.';
    update({ customers: [...data.customers, { ...form, id: idFor('C', data.customers), name: form.name.trim(), createdBy: ownerName }] });
    flash('Customer profile saved.');
    return '';
  }

  function updateCustomer(id, form) {
    if (!form.name.trim()) return 'Enter the customer’s full name.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Enter a valid email address.';
    if (form.phone && !/^[+()\d\s-]{7,20}$/.test(form.phone)) return 'Enter a valid contact number.';
    update({
      customers: data.customers.map((customer) => customer.id === id ? { ...customer, ...form, name: form.name.trim() } : customer),
      orders: data.orders.map((order) => order.customerId === id ? { ...order, customer: form.name.trim() } : order),
    });
    flash('Customer profile updated.');
    return '';
  }

  function addProduct(form) {
    const price = Number(form.price);
    if (!form.name.trim() || !Number.isFinite(price) || price <= 0) return 'Add a product name and a price greater than zero.';
    update({ products: [...data.products, { ...form, id: idFor('P', data.products), price, recipe: [] }] });
    flash('Product added to your catalog.');
    return '';
  }

  function saveMaterial(form) {
    const name = form.name.trim();
    const unit = form.unit.trim();
    const price = Number(form.price);
    const threshold = Number(form.threshold);
    if (!name || !unit) return 'Add a material name and unit.';
    if (data.materials.some((material) => material.name.toLowerCase() === name.toLowerCase() && material.id !== selectedMaterial?.id)) return 'A material with this name already exists.';
    if (!Number.isFinite(price) || price < 0 || !Number.isFinite(threshold) || threshold < 0) return 'Unit price and low-stock threshold must be zero or greater.';
    if (selectedMaterial) {
      update({
        materials: data.materials.map((material) => material.id === selectedMaterial.id ? { ...material, name, unit, price, threshold, active: form.active === true } : material),
        products: data.products.map((product) => ({ ...product, recipe: product.recipe.map((use) => use.material === selectedMaterial.name ? { ...use, material: name } : use) })),
      });
      flash(`${name} details updated.`);
    } else {
      const material = { id: idFor('M', data.materials), name, unit, stock: 0, threshold, price, active: form.active === true };
      update({ materials: [...data.materials, material] });
      flash(`${name} added to your materials.`);
    }
    return '';
  }

  function addOrder(form) {
    const customer = data.customers.find((entry) => entry.id === form.customerId);
    if (!customer || !Array.isArray(form.items) || form.items.length === 0) return 'Choose a customer and at least one product.';
    const items = form.items.map((line) => {
      const product = data.products.find((entry) => entry.id === line.productId);
      return { product, quantity: Number(line.quantity), price: Number(line.price || product?.price) };
    });
    if (items.some(({ product, quantity, price }) => !product || !Number.isInteger(quantity) || quantity < 1 || !Number.isFinite(price) || price <= 0)) return 'Each order item needs a product, quantity of at least one, and valid price.';
    if (form.dueDate && form.dueDate < form.date) return 'Due date cannot be earlier than the order date.';
    if (!Number.isFinite(Number(form.shipping)) || Number(form.shipping) < 0) return 'Shipping fee cannot be negative.';
    const orderItems = items.map(({ product, quantity, price }, index) => ({ id: `${idFor('OI', data.orders)}-${index + 1}`, productId: product.id, name: product.name, type: product.type, quantity, price }));
    const total = orderItems.reduce((sum, item) => sum + item.quantity * item.price, 0) + Number(form.shipping || 0);
    const order = { id: idFor('O', data.orders), customerId: customer.id, customer: customer.name, date: form.date, dueDate: form.dueDate, status: 'Pending', items: orderItems, shipping: Number(form.shipping || 0), total, createdBy: ownerName };
    update({ orders: [order, ...data.orders] });
    flash(`${order.id} created successfully.`);
    return '';
  }

  function updateOrderDetails(id, form) {
    const original = data.orders.find((order) => order.id === id);
    const customer = data.customers.find((entry) => entry.id === form.customerId);
    if (!original || !customer || !Array.isArray(form.items) || form.items.length === 0) return 'Choose a customer and at least one product.';
    if (['Cancelled', 'Delivered'].includes(original.status)) return 'Cancelled or delivered orders cannot be edited.';
    const items = form.items.map((line) => {
      const product = data.products.find((entry) => entry.id === line.productId);
      return { product, quantity: Number(line.quantity), price: Number(line.price || product?.price), id: line.id };
    });
    if (items.some(({ product, quantity, price }) => !product || !Number.isInteger(quantity) || quantity < 1 || !Number.isFinite(price) || price <= 0)) return 'Each order item needs a product, quantity of at least one, and valid price.';
    if (form.dueDate && form.dueDate < form.date) return 'Due date cannot be earlier than the order date.';
    const shipping = Number(form.shipping);
    if (!Number.isFinite(shipping) || shipping < 0) return 'Shipping fee cannot be negative.';
    const orderItems = items.map(({ product, quantity, price, id: itemId }, index) => ({ id: itemId || `${id}-item-${index + 1}`, productId: product.id, name: product.name, type: product.type, quantity, price }));
    if (original.stockReserved && (original.items.length !== orderItems.length || original.items.some((item) => {
      const updatedItem = orderItems.find((entry) => entry.id === item.id);
      return !updatedItem || updatedItem.productId !== item.productId || Number(updatedItem.quantity) !== Number(item.quantity);
    }))) return 'This order has reserved finished products. Its products and quantities cannot be changed.';
    for (const previousItem of original.items) {
      const produced = data.batches.filter((batch) => batch.itemId === previousItem.id).reduce((sum, batch) => sum + Number(batch.quantity), 0);
      if (produced > 0) {
        const updatedItem = orderItems.find((item) => item.id === previousItem.id);
        if (!updatedItem || updatedItem.productId !== previousItem.productId || updatedItem.quantity < produced) return 'This order has production recorded. Keep its produced item and quantity intact.';
      }
    }
    const total = orderItems.reduce((sum, item) => sum + item.quantity * item.price, 0) + shipping;
    const paid = data.payments.filter((payment) => payment.orderId === id).reduce((sum, payment) => sum + Number(payment.amount), 0);
    if (total < paid) return `The new order total cannot be less than payments already recorded (${money(paid)}).`;
    const fullyPaid = paid >= total;
    if (fullyPaid && !original.stockReserved) {
      const requirements = new Map();
      for (const item of orderItems) requirements.set(item.productId, (requirements.get(item.productId) || 0) + Number(item.quantity));
      for (const [productId, required] of requirements) {
        const available = productStock(data.batches, data.orders, productId);
        if (available < required) {
          const product = data.products.find((entry) => entry.id === productId);
          return `Not enough ${product?.name || 'finished product'} in inventory. Needed ${required}; available ${available}. Produce the missing items first.`;
        }
      }
    }
    update({ orders: data.orders.map((order) => order.id === id ? {
      ...order,
      customerId: customer.id,
      customer: customer.name,
      date: form.date,
      dueDate: form.dueDate,
      items: orderItems,
      shipping,
      total,
      paymentStatus: fullyPaid ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid',
      status: fullyPaid ? 'In production' : 'Pending',
      stockReserved: order.stockReserved || fullyPaid,
    } : order) });
    flash(`${id} updated successfully.`);
    return '';
  }

  function saveStock(form) {
    const material = data.materials.find((entry) => entry.id === form.materialId);
    const quantity = Number(form.quantity);
    if (!material || !Number.isFinite(quantity) || quantity < 0 || (form.action !== 'Set balance' && quantity === 0)) return 'Choose a material and enter a valid quantity.';
    const change = form.action === 'Restock' ? quantity : form.action === 'Remove' ? -quantity : quantity - material.stock;
    if (material.stock + change < 0) return 'This adjustment would make stock negative.';
    if (change === 0) return 'This material already has that stock balance.';
    update({
      materials: data.materials.map((entry) => entry.id === material.id ? { ...entry, stock: entry.stock + change } : entry),
      movements: [{ id: idFor('MV', data.movements), materialId: material.id, material: material.name, change, movementType: form.action === 'Restock' ? 'restock' : 'adjustment', reason: form.reason.trim() || form.action, createdAt: new Date().toISOString(), createdBy: ownerName }, ...data.movements],
    });
    flash(`${material.name} stock updated.`);
    return '';
  }

  function recordProduction(form) {
    const product = data.products.find((entry) => entry.id === form.productId);
    const quantity = Number(form.quantity);
    if (!product) return 'Choose a valid product to make.';
    if (!Number.isInteger(quantity) || quantity < 1) return 'Enter a whole-number quantity of at least one.';
    if (!product.recipe.length) return 'Set up material usage for this product before recording production.';
    const deductions = product.recipe.map((use) => {
      const material = data.materials.find((entry) => entry.name === use.material && entry.active);
      return { material, quantity: Number(use.quantity) * quantity };
    });
    const missing = deductions.find((entry) => !entry.material || entry.material.stock < entry.quantity);
    if (missing) return missing.material ? `Not enough ${missing.material.name}. Needed ${missing.quantity.toFixed(3)} ${missing.material.unit}; available ${missing.material.stock} ${missing.material.unit}. No stock was changed.` : 'A recipe material is missing or inactive. Update the product recipe first.';
    const batch = { id: idFor('B', data.batches), productId: product.id, product: product.name, quantity, date: new Date().toISOString(), createdBy: ownerName };
    const movements = deductions.map(({ material, quantity: used }, index) => ({ id: `${idFor('MV', data.movements)}-${index + 1}`, materialId: material.id, material: material.name, change: -used, movementType: 'production', reason: `Production ${batch.id} · ${quantity} × ${product.name}`, createdAt: batch.date, createdBy: ownerName }));
    update({
      materials: data.materials.map((material) => {
        const deduction = deductions.find((entry) => entry.material?.id === material.id);
        return deduction ? { ...material, stock: material.stock - deduction.quantity } : material;
      }),
      batches: [batch, ...data.batches],
      movements: [...movements, ...data.movements],
    });
    flash(`Made ${quantity} × ${product.name}. Materials were checked and deducted together.`);
    return '';
  }

  function recordPayment(form) {
    const order = data.orders.find((entry) => entry.id === form.orderId);
    const existing = data.payments.filter((payment) => payment.orderId === form.orderId);
    const alreadyPaid = existing.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const amount = Number(form.amount);
    if (!order) return 'Choose an order before recording payment.';
    if (order.status === 'Cancelled') return 'Cancelled orders cannot receive additional payments.';
    if (existing.length >= 2) return 'This order already has two receipts. The maximum is two payments per order.';
    if (!order.stockReserved) {
      const requirements = new Map();
      for (const item of order.items) requirements.set(item.productId, (requirements.get(item.productId) || 0) + Number(item.quantity));
      for (const [productId, required] of requirements) {
        const product = data.products.find((entry) => entry.id === productId);
        const available = productStock(data.batches, data.orders, productId);
        if (available < required) return `Not enough ${product?.name || 'finished product'} in inventory. Needed ${required}; available ${available}. Produce the missing items before recording payment.`;
      }
    }
    if (!Number.isFinite(amount) || amount <= 0) return 'Payment must be greater than zero.';
    if (amount > order.total - alreadyPaid + 0.001) return `Payment exceeds the remaining balance of ${money(order.total - alreadyPaid)}.`;
    const payment = { ...form, id: idFor('PAY', data.payments), amount, paidAt: new Date().toISOString(), createdBy: ownerName };
    const newPaid = alreadyPaid + amount;
    update({
      payments: [payment, ...data.payments],
      orders: data.orders.map((entry) => entry.id === order.id ? {
        ...entry,
        paymentStatus: newPaid >= entry.total ? 'Paid' : 'Partial',
        status: newPaid >= entry.total ? 'In production' : 'Pending',
        stockReserved: true,
      } : entry),
    });
    flash(`Payment recorded. Remaining balance: ${money(order.total - newPaid)}.`);
    return '';
  }

  function recordExpense(form) {
    const amount = Number(form.amount);
    if (!form.category || !form.description.trim()) return 'Add an expense category and description.';
    if (!Number.isFinite(amount) || amount <= 0) return 'Enter an amount greater than zero.';
    update({ expenses: [{ ...form, id: idFor('EX', data.expenses), amount, createdBy: ownerName }, ...data.expenses] });
    flash('Expense saved.');
    return '';
  }

  function updateOrderStatus(id, status) {
    const order = data.orders.find((entry) => entry.id === id);
    if (!order || ['Cancelled', 'Delivered'].includes(order.status)) return;
    const paid = data.payments.filter((payment) => payment.orderId === id).reduce((sum, payment) => sum + Number(payment.amount), 0);
    if (status === 'Cancelled' && paid < Number(order.total)) {
      update({ orders: data.orders.map((entry) => entry.id === id ? { ...entry, status } : entry) });
      flash(`${id} cancelled. Existing receipts were kept; no more payments can be recorded.`);
    } else if (status === 'Delivered' && order.status === 'In production' && paid >= Number(order.total)) {
      if (!order.stockReserved) {
        const requirements = new Map();
        for (const item of order.items) requirements.set(item.productId, (requirements.get(item.productId) || 0) + Number(item.quantity));
        for (const [productId, required] of requirements) {
          const available = productStock(data.batches, data.orders, productId);
          if (available < required) {
            const product = data.products.find((entry) => entry.id === productId);
            flash(`Not enough ${product?.name || 'finished product'} in inventory to deliver ${id}. Produce the missing items first.`);
            return;
          }
        }
      }
      update({ orders: data.orders.map((entry) => entry.id === id ? { ...entry, status, stockReserved: true } : entry) });
      flash(`${id} marked as delivered.`);
    }
  }

  function updateRecipe(productId, materialName, rawValue) {
    const quantity = Number(rawValue);
    const products = data.products.map((product) => {
      if (product.id !== productId) return product;
      const recipe = product.recipe.filter((entry) => entry.material !== materialName);
      if (Number.isFinite(quantity) && quantity > 0) recipe.push({ material: materialName, quantity });
      return { ...product, recipe };
    });
    update({ products });
  }

  function printRecord() {
    window.print();
  }

  const pageTitle = active === 'Overview' ? 'Good morning, studio owners' : active;
  const filteredCustomers = data.customers.filter((customer) => `${customer.name} ${customer.phone} ${customer.email}`.toLowerCase().includes(search.toLowerCase()));
  const filteredOrders = data.orders.filter((order) => `${order.id} ${order.customer} ${order.status}`.toLowerCase().includes(search.toLowerCase()));

  if (loadError) return <AccessUnavailable message={loadError} onRetry={() => window.location.reload()} />;
  if (!loaded) return <AccessLoading />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" onClick={() => setActive('Overview')}>
          <span className="brand-mark">s<span>.</span></span>
          <span><strong>simula studio</strong><small>OWNER WORKSPACE</small></span>
        </a>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation" onWheel={(event) => {
          const navElement = event.currentTarget;
          if (navElement.scrollWidth > navElement.clientWidth) {
            event.preventDefault();
            navElement.scrollLeft += event.deltaY;
          }
        }}>
          {nav.map(([label, icon]) => (
            <button key={label} type="button" className={`nav-item ${active === label ? 'active' : ''}`} onClick={() => { setActive(label); setSearch(''); }}>
              <span className="nav-icon">{icon}</span><span>{label}</span>
              {label === 'Inventory' && lowStock.length > 0 && <span className="nav-count">{lowStock.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile-row"><span className="avatar">{ownerName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span><span className="profile-name"><strong>{ownerName}</strong><small>Owner account</small></span><button className="profile-signout" onClick={onSignOut}>Sign out</button></div>
          <span className={`local-save ${saveError ? 'save-error' : ''}`}><i /> {saveError ? 'Not saved · check connection' : 'Saved to your studio database'}</span>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark">s<span>.</span></span><strong>simula studio</strong></div>
          <div className="breadcrumb">Studio <span>/</span> <b>{active}</b></div>
          <div className="top-actions">
            <span className="today-label">{dateLabel(today)}</span>
            <button className="icon-button" aria-label="Print current page" onClick={printRecord} title="Print"><Icon name="print" /></button>
            <span className="avatar top-avatar">{ownerName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span>
            <button className="signout-button" onClick={onSignOut}>Sign out</button>
          </div>
        </header>
        <div className="content-wrap">
          <div className="page-heading">
            <div><p className="eyebrow">{active === 'Overview' ? 'YOUR LITTLE BUSINESS, AT A GLANCE' : 'SIMULA STUDIO  /  MANAGEMENT'}</p><h1>{pageTitle}</h1><p className="page-subtitle">{pageSubtitle(active)}</p></div>
            {active === 'Overview' && <button className="button button-primary" onClick={() => setModal('order')}><Icon name="plus" /> New order</button>}
            {active === 'Orders' && <button className="button button-primary" onClick={() => setModal('order')}><Icon name="plus" /> Create order</button>}
            {active === 'Customers' && <button className="button button-primary" onClick={() => setModal('customer')}><Icon name="plus" /> Add customer</button>}
            {active === 'Products' && <button className="button button-primary" onClick={() => setModal('product')}><Icon name="plus" /> Add product</button>}
            {active === 'Inventory' && <button className="button button-primary" onClick={() => setModal('stock')}><Icon name="plus" /> Update stock</button>}
            {active === 'Production' && <button className="button button-primary" onClick={() => setModal('production')}><Icon name="plus" /> Record production</button>}
            {active === 'Payments' && <button className="button button-primary" onClick={() => setModal('payment')}><Icon name="plus" /> Record payment</button>}
            {active === 'Expenses' && <button className="button button-primary" onClick={() => setModal('expense')}><Icon name="plus" /> Add expense</button>}
            {active === 'Reports' && <button className="button button-secondary print-action" onClick={printRecord}><Icon name="print" /> Print report</button>}
          </div>
          {saveError && <div className="toast error-toast" role="alert"><span>!</span>Couldn’t save your changes: {saveError}{saveError.includes('newer studio records') && <button className="conflict-reload" onClick={() => window.location.reload()}>Reload records</button>}<button onClick={() => setSaveError('')} aria-label="Dismiss notification">×</button></div>}
          {notice && <div className="toast" role="status"><span>✓</span>{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notification">×</button></div>}

          {active === 'Overview' && <Dashboard data={data} lowStock={lowStock} outstanding={outstanding} setActive={setActive} setModal={setModal} />}
          {active === 'Customers' && <CustomersPage customers={filteredCustomers} search={search} setSearch={setSearch} onPrint={printRecord} onEdit={(customer) => { setSelectedCustomer(customer); setModal('customer'); }} />}
          {active === 'Orders' && <OrdersPage orders={filteredOrders} data={data} search={search} setSearch={setSearch} onUpdate={updateOrderStatus} onEdit={(order) => { setSelectedOrder(order); setModal('order'); }} onPrint={(order) => { setSelectedOrder(order); setModal('slip'); }} />}
          {active === 'Products' && <ProductsPage products={data.products} materials={data.materials} onRecipe={updateRecipe} />}
          {active === 'Inventory' && <InventoryPage materials={data.materials} movements={data.movements} lowStock={lowStock} products={data.products} batches={data.batches} orders={data.orders} onAdd={() => { setSelectedMaterial(null); setModal('material'); }} onEdit={(material) => { setSelectedMaterial(material); setModal('material'); }} />}
          {active === 'Production' && <ProductionPage batches={data.batches} orders={data.orders} products={data.products} materials={data.materials} onCreate={(product) => { setSelectedProduct(product); setModal('production'); }} />}
          {active === 'Payments' && <PaymentsPage orders={data.orders} payments={data.payments} products={data.products} batches={data.batches} onRecordPayment={(order) => { setSelectedOrder(order); setModal('payment'); }} />}
          {active === 'Expenses' && <ExpensesPage expenses={data.expenses} />}
          {active === 'Reports' && <ReportsPage month={month} setMonth={setMonth} basis={basis} setBasis={setBasis} orders={monthOrders} candles={monthCandles} souvenirs={monthSouvenirs} total={monthRevenue} expenses={data.expenses.filter((expense) => expense.date?.startsWith(month)).reduce((sum, expense) => sum + Number(expense.amount), 0)} />}
          <footer className="app-footer"><span>Simula Studio <span className="footer-dot">·</span> Est. April 2, 2026</span><span>Made for the little things that mean a lot.</span></footer>
        </div>
      </main>
      {modal && <Modal type={modal} data={data} selectedOrder={selectedOrder} selectedCustomer={selectedCustomer} selectedMaterial={selectedMaterial} selectedProduct={selectedProduct} onClose={() => { setModal(''); setSelectedOrder(null); setSelectedCustomer(null); setSelectedMaterial(null); setSelectedProduct(null); }} onSave={(form) => {
        const actions = { customer: selectedCustomer ? (values) => updateCustomer(selectedCustomer.id, values) : addCustomer, product: addProduct, order: selectedOrder ? (values) => updateOrderDetails(selectedOrder.id, values) : addOrder, stock: saveStock, material: saveMaterial, production: recordProduction, payment: recordPayment, expense: recordExpense };
        if (modal === 'slip') { printRecord(); return ''; }
        const error = actions[modal]?.(form);
        if (!error) { setModal(''); setSelectedOrder(null); setSelectedCustomer(null); setSelectedMaterial(null); setSelectedProduct(null); }
        return error;
      }} />}
    </div>
  );
}

function pageSubtitle(active) {
  const subtitles = {
    Overview: 'Here’s what’s happening with your handmade business.',
    Orders: 'Keep every custom order moving, from first message to happy handoff.',
    Customers: 'A little place for all the people who support your small business.',
    Products: 'Your handmade pieces and their material recipes.',
    Inventory: 'Keep an eye on the materials that make it all happen.',
    Production: 'Turn order items into finished pieces, one batch at a time.',
    Payments: 'Track cash and GCash receipts, deposits, and balances.',
    Expenses: 'Keep business spending tidy and easy to find.',
    Reports: 'A clear picture of what your studio earned this month.',
  };
  return subtitles[active] || '';
}

function Dashboard({ data, lowStock, outstanding, setActive, setModal }) {
  const openOrders = data.orders.filter((order) => !['Delivered', 'Cancelled'].includes(order.status));
  const thisMonthOrders = data.orders.filter((order) => order.status !== 'Cancelled' && order.date?.startsWith(today.slice(0, 7)));
  const earned = thisMonthOrders.reduce((sum, order) => sum + order.items.reduce((lineSum, item) => lineSum + item.quantity * item.price, 0), 0);
  const recentOrders = data.orders.slice(0, 5);
  return (
    <>
      <section className="welcome-banner">
        <div className="banner-copy"><span className="banner-kicker">A SMALL BUSINESS WITH A BIG HEART</span><h2>Make room for<br />the lovely things.</h2><p>Your studio is ready. Here’s your day, all in one place.</p><button className="button banner-button" onClick={() => setModal('order')}>Create an order <span>→</span></button></div>
        <div className="banner-art" aria-hidden="true"><div className="sun-disc" /><div className="candle c1"><i /></div><div className="candle c2"><i /></div><div className="flower f1">✿</div><div className="flower f2">✳</div><span className="art-label">hand-poured<br />with love</span></div>
        <span className="banner-ornament">✳</span>
      </section>
      <div className="section-title-row"><div><h2>Your studio today</h2><p>A little snapshot of how things are going.</p></div><span className="live-pill"><i /> ALL CAUGHT UP</span></div>
      <div className="metric-grid">
        <Metric label="This month’s sales" value={money(earned)} note="Product sales · before shipping" icon="trend" tint="peach" />
        <Metric label="Orders in progress" value={openOrders.length} note={`${data.orders.filter((order) => order.status === 'Ready').length} ready for handoff`} icon="box" tint="lavender" />
        <Metric label="To collect" value={money(outstanding)} note={`${data.orders.filter((order) => order.paymentStatus !== 'Paid').length} orders with balance`} icon="wallet" tint="sage" />
        <Metric label="Materials to restock" value={lowStock.length} note={lowStock.length ? `${lowStock.map((item) => item.name).slice(0, 2).join(', ')}${lowStock.length > 2 ? ' +' : ''}` : 'Stock levels look lovely'} icon="spark" tint="yellow" />
      </div>
      <div className="dashboard-grid">
        <section className="panel recent-panel"><div className="panel-heading"><div><h3>Recent orders</h3><p>Your latest little projects.</p></div><button className="text-link" onClick={() => setActive('Orders')}>All orders <span>→</span></button></div>
          {recentOrders.length ? <div className="table-scroll"><table><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>ITEM</th><th>STATUS</th><th>TOTAL</th></tr></thead><tbody>{recentOrders.map((order) => <tr key={order.id}><td className="strong-cell">{order.id}</td><td>{order.customer}</td><td>{order.items[0]?.name}{order.items.length > 1 ? ` +${order.items.length - 1}` : ''}</td><td><Status value={order.status} /></td><td>{money(order.total)}</td></tr>)}</tbody></table></div> : <EmptyState title="Your first order starts here" detail="Add a customer and create an order to see it here." action="Create an order" onClick={() => setModal('order')} />}
        </section>
        <section className="panel side-panel"><div className="panel-heading"><div><h3>A gentle reminder</h3><p>Materials running a little low.</p></div><span className="panel-icon peach-icon">✿</span></div>
          {lowStock.length ? <div className="reminder-list">{lowStock.slice(0, 4).map((material) => <div className="reminder-item" key={material.id}><span className="material-dot" /><span><strong>{material.name}</strong><small>{material.stock} {material.unit} left · threshold {material.threshold}</small></span><span className="low-label">LOW</span></div>)}<button className="text-link full-link" onClick={() => setActive('Inventory')}>Review inventory <span>→</span></button></div> : <div className="quiet-state"><span>✦</span><p>You’re all stocked up.<br />Lovely work keeping track.</p></div>}
        </section>
      </div>
      <section className="quick-actions"><div><h3>Make a little progress</h3><p>Shortcuts for your everyday studio tasks.</p></div><div className="quick-action-list"><QuickAction icon="person" label="Add a customer" onClick={() => setModal('customer')} /><QuickAction icon="flask" label="Update stock" onClick={() => setModal('stock')} /><QuickAction icon="wallet" label="Record payment" onClick={() => setModal('payment')} /></div></section>
    </>
  );
}

function Metric({ label, value, note, icon, tint }) {
  return <article className="metric-card"><div className={`metric-icon ${tint}`}><Icon name={icon} /></div><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong><span className="metric-note">{note}</span></article>;
}

function QuickAction({ icon, label, onClick }) {
  return <button className="quick-action" onClick={onClick}><span className="quick-icon"><Icon name={icon} /></span><span>{label}</span><span className="quick-arrow">↗</span></button>;
}

function CustomersPage({ customers, search, setSearch, onPrint, onEdit }) {
  return <><div className="toolbar"><SearchInput value={search} onChange={setSearch} placeholder="Search name, phone, or email" /><button className="button button-secondary" onClick={onPrint}><Icon name="print" /> Print records</button></div>
    <section className="panel data-panel"><div className="panel-heading"><div><h3>Customer book</h3><p>{customers.length} {customers.length === 1 ? 'customer' : 'customers'} who make it all possible.</p></div></div>
      {customers.length ? <div className="table-scroll"><table><thead><tr><th>NAME</th><th>CONTACT</th><th>EMAIL</th><th>ADDRESS</th><th>NOTES</th><th>ACTION</th></tr></thead><tbody>{customers.map((c) => <tr key={c.id}><td className="strong-cell">{c.name}</td><td>{c.phone || '—'}</td><td>{c.email || '—'}</td><td>{c.address || '—'}</td><td>{c.notes || '—'}</td><td><button className="text-link" onClick={() => onEdit(c)}>Edit</button></td></tr>)}</tbody></table></div> : <EmptyState title={search ? 'No matching customers' : 'Your customer book is waiting'} detail={search ? 'Try another name, phone number, or email.' : 'Add your first customer profile to keep their details close.'} />}</section>
  </>;
}

function OrdersPage({ orders, data, search, setSearch, onUpdate, onEdit, onPrint }) {
  const [filter, setFilter] = useState('All orders');
  const visible = orders.filter((order) => filter === 'All orders' || order.status === filter);
  return <><div className="toolbar"><SearchInput value={search} onChange={setSearch} placeholder="Search order or customer" /><select className="select-control" value={filter} onChange={(e) => setFilter(e.target.value)}><option>All orders</option>{['Pending', 'In production', 'Delivered', 'Cancelled'].map((status) => <option key={status}>{status}</option>)}</select></div>
    <section className="panel data-panel"><div className="panel-heading"><div><h3>Order book</h3><p>{visible.length} orders · shipping is shown separately from item sales.</p></div></div>
      {visible.length ? <div className="table-scroll"><table><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>ORDER DATE</th><th>DUE DATE</th><th>STATUS</th><th>PAYMENT</th><th>TOTAL</th><th>ACTIONS</th></tr></thead><tbody>{visible.map((order) => {
        const shortage = orderStockShortage(order, data.products, data.batches, data.orders);
        return <tr key={order.id}><td className="strong-cell">{order.id}<small className="table-sub">{order.items.map((item) => `${item.quantity} × ${item.name}`).join(', ')}</small></td><td>{order.customer}</td><td>{dateLabel(order.date)}</td><td>{dateLabel(order.dueDate)}</td><td><div className="order-status-cell"><Status value={order.status} />{order.status === 'Pending' && <button className="button button-secondary order-status-action order-cancel-action" onClick={() => onUpdate(order.id, 'Cancelled')}>Cancel</button>}{order.status === 'In production' && <button className="button button-secondary order-status-action" disabled={Boolean(shortage)} title={shortage ? `Produce ${shortage.required - shortage.available} more ${shortage.product} first.` : undefined} onClick={() => onUpdate(order.id, 'Delivered')}>{shortage ? 'Produce first' : 'Delivered'}</button>}</div></td><td><Status value={order.paymentStatus || 'Unpaid'} /></td><td>{money(order.total)}<small className="table-sub">Items {money(order.items.reduce((sum, item) => sum + item.quantity * item.price, 0))} + shipping {money(order.shipping)}</small></td><td><div className="table-actions"><button className="text-link" onClick={() => onEdit(order)}>Edit</button><button className="small-icon-button" aria-label={`Print ${order.id}`} onClick={() => onPrint(order)}><Icon name="print" /></button></div></td></tr>;
      })}</tbody></table></div> : <EmptyState title={search ? 'No matching orders' : 'Your order book is empty'} detail={search ? 'Try another order number or customer name.' : 'Orders, due dates, payments, and printable slips will live here.'} />}</section>
    <p className="helper-note">Payment balance is calculated from recorded GCash and cash receipts. {data.orders.length > 0 && `${data.orders.length} orders in your studio.`}</p>
  </>;
}

function ProductsPage({ products, materials, onRecipe }) {
  return <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} materials={materials} onRecipe={onRecipe} />)}</div>;
}

function ProductCard({ product, materials, onRecipe }) {
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [addingMaterialId, setAddingMaterialId] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const usedMaterialNames = new Set(product.recipe.map((entry) => entry.material));
  const availableMaterials = materials.filter((material) => material.active && !usedMaterialNames.has(material.name));
  const pendingMaterial = materials.find((material) => material.id === addingMaterialId);
  const recipeMaterials = product.recipe.map((usage) => ({
    usage,
    material: materials.find((entry) => entry.name === usage.material),
  }));

  function finishAddingMaterial() {
    const quantity = Number(newQuantity);
    if (pendingMaterial && Number.isFinite(quantity) && quantity > 0) {
      onRecipe(product.id, pendingMaterial.name, newQuantity);
    }
    setIsAddingMaterial(false);
    setAddingMaterialId('');
    setNewQuantity('');
  }

  return <article className="product-card">
    <div className={`product-art ${product.type === 'Candle' ? 'product-candle' : 'product-souvenir'}`}><span>{product.type === 'Candle' ? '✹' : '✿'}</span><small>{product.type}</small></div>
    <div className="product-copy">
      <div className="product-title"><div><span className="product-type">{product.type.toUpperCase()}</span><h3>{product.name}</h3></div><strong>{money(product.price)}</strong></div>
      <div className="recipe-heading"><span>Material usage · per item</span><span>{product.recipe.length} materials</span></div>
      <div className="recipe-list">
        {recipeMaterials.map(({ usage, material }) => <label className="recipe-row" key={usage.material}>
          <span>{usage.material} {material && <small>({material.unit})</small>}</span>
          <input aria-label={`${usage.material} usage per ${product.name}`} type="number" min="0" step="0.001" defaultValue={usage.quantity} onBlur={(event) => onRecipe(product.id, usage.material, event.target.value)} />
          <small>{material?.unit || 'inactive'}</small>
        </label>)}
        {isAddingMaterial && pendingMaterial && <label className="recipe-row">
          <span>{pendingMaterial.name} <small>({pendingMaterial.unit})</small></span>
          <input aria-label={`${pendingMaterial.name} usage per ${product.name}`} type="number" min="0.001" step="0.001" value={newQuantity} onChange={(event) => setNewQuantity(event.target.value)} onBlur={finishAddingMaterial} />
          <small>{pendingMaterial.unit}</small>
        </label>}
      </div>
      {isAddingMaterial && availableMaterials.length > 0 ? <div className="recipe-add">
        {pendingMaterial ? <span>{pendingMaterial.name} selected</span> : <select aria-label={`Choose a material for ${product.name}`} value={addingMaterialId} onChange={(event) => { setAddingMaterialId(event.target.value); setNewQuantity(''); }}>
          <option value="">Choose a material</option>
          {availableMaterials.map((material) => <option key={material.id} value={material.id}>{material.name}</option>)}
        </select>}
        <button className="button button-secondary" type="button" onClick={() => { setIsAddingMaterial(false); setAddingMaterialId(''); setNewQuantity(''); }}>Cancel</button>
      </div> : <button className="button button-secondary recipe-add-button" type="button" disabled={!availableMaterials.length} onClick={() => { setIsAddingMaterial(true); setAddingMaterialId(''); }}>
        + Add materials usage
      </button>}
    </div>
  </article>;
}

function InventoryPage({ materials, movements, lowStock, products, batches, orders, onAdd, onEdit }) {
  return <><div className="inventory-summary"><div className="inventory-summary-icon">✿</div><div><strong>{lowStock.length ? `${lowStock.length} materials need a little restock` : 'Your materials are in good shape'}</strong><span>{lowStock.length ? 'Low-stock items are highlighted below.' : 'You’ll see a heads-up here when anything runs low.'}</span></div><span className="summary-count">{lowStock.length} LOW</span></div>
    <section className="panel data-panel"><div className="panel-heading"><div><h3>Materials cupboard</h3><p>Raw materials are tracked here; finished products are listed below.</p></div><div className="inventory-panel-actions"><span className="soft-chip">{materials.filter((m) => m.active).length} active materials</span><button className="button button-secondary" onClick={onAdd}><Icon name="plus" /> Add material</button></div></div>
      {materials.length ? <div className="table-scroll"><table><thead><tr><th>MATERIAL</th><th>ON HAND</th><th>LOW-STOCK AT</th><th>UNIT COST</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>{materials.map((m) => <tr key={m.id}><td><span className="material-name-dot"><i />{m.name}</span></td><td className="strong-cell">{m.stock} {m.unit}</td><td>{m.threshold} {m.unit}</td><td>{money(m.price)} / {m.unit}</td><td>{!m.active ? <span className="soft-chip">Inactive</span> : m.stock <= m.threshold ? <span className="status-badge status-low">Restock soon</span> : <span className="status-badge status-healthy">In stock</span>}</td><td><button className="text-link" onClick={() => onEdit(m)}>Edit</button></td></tr>)}</tbody></table></div> : <EmptyState title="No materials added yet" detail="Add your wax, jars, paper, and other materials to track stock." />}</section>
    <section className="panel data-panel"><div className="panel-heading"><div><h3>Products cupboard</h3><p>Finished products available after production, minus units reserved for orders.</p></div></div>{products.length ? <div className="table-scroll"><table><thead><tr><th>PRODUCT</th><th>TYPE</th><th>AVAILABLE</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td className="strong-cell">{product.name}</td><td>{product.type}</td><td className="strong-cell">{productStock(batches, orders, product.id)}</td></tr>)}</tbody></table></div> : <EmptyState title="No products yet" detail="Add a product before recording production." />}</section>
    <section className="panel data-panel movement-panel"><div className="panel-heading"><div><h3>Recent stock movements</h3><p>Every restock and production deduction, in one place.</p></div></div>{movements.length ? <div className="movement-list">{movements.slice(0, 8).map((movement) => <div className="movement-row" key={movement.id}><span className={`movement-sign ${movement.change > 0 ? 'positive' : 'negative'}`}>{movement.change > 0 ? '+' : '−'}</span><span><strong>{movement.material}</strong><small>{movement.reason} · {new Date(movement.createdAt).toLocaleDateString('en-PH')}</small></span><b>{movement.change > 0 ? '+' : ''}{Number(movement.change).toFixed(3)}</b></div>)}</div> : <EmptyState title="No stock movements yet" detail="Restocks and production batches will show up here." />}</section>
  </>;
}

function ProductionPage({ batches, orders, products, materials, onCreate }) {
  return <><section className="production-intro"><span className="production-icon">⚒</span><div><strong>Make products before taking payment.</strong><p>Each batch checks raw materials, deducts them, and adds finished items to the Products cupboard.</p></div></section>
    <section className="panel data-panel"><div className="panel-heading"><div><h3>Product collection</h3><p>Choose a product to make and add finished units to inventory.</p></div></div><div className="production-product-grid">{products.map((product) => { const missing = product.recipe.find((use) => { const material = materials.find((entry) => entry.name === use.material && entry.active); return !material || material.stock < Number(use.quantity); }); return <article className="production-product-card" key={product.id}><span className="production-icon">✿</span><div><strong>{product.name}</strong><small>{product.type} · {productStock(batches, orders, product.id)} available</small>{!product.recipe.length ? <small className="production-material-warning">Add material usage in Products first</small> : missing && <small className="production-material-warning">{missing.material} is unavailable or low</small>}</div><button className="button button-primary" type="button" onClick={() => onCreate(product)}>Create product</button></article>; })}</div></section>
    <section className="panel data-panel"><div className="panel-heading"><div><h3>Production batches</h3><p>History of finished goods created from your product recipes.</p></div></div>{batches.length ? <div className="table-scroll"><table><thead><tr><th>BATCH</th><th>SOURCE</th><th>PRODUCT</th><th>QUANTITY</th><th>RECORDED</th></tr></thead><tbody>{batches.map((batch) => <tr key={batch.id}><td className="strong-cell">{batch.id}</td><td>{batch.orderId || 'Product stock'}</td><td>{batch.product}</td><td>{batch.quantity}</td><td>{new Date(batch.date).toLocaleString('en-PH')}</td></tr>)}</tbody></table></div> : <EmptyState title="No production batches yet" detail="Choose a product above to make your first batch." />}</section>
  </>;
}

function PaymentsPage({ orders, payments, products, batches, onRecordPayment }) {
  return <><section className="payment-summary-grid"><SummaryTile label="Payments collected" value={money(payments.reduce((sum, payment) => sum + Number(payment.amount), 0))} note={`${payments.length} receipts recorded`} /><SummaryTile label="Still to collect" value={money(orders.filter((order) => order.status !== 'Cancelled').reduce((sum, order) => sum + Math.max(0, order.total - payments.filter((payment) => payment.orderId === order.id).reduce((paid, payment) => paid + Number(payment.amount), 0)), 0))} note="Across all open balances" /></section>
    <section className="panel data-panel"><div className="panel-heading"><div><h3>Order balances</h3><p>Up to two GCash or cash receipts per order. Produce and reserve all order items before the first payment.</p></div></div>{orders.length ? <div className="table-scroll"><table><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>ORDER TOTAL</th><th>PAID</th><th>BALANCE</th><th>RECEIPTS</th><th>ACTION</th></tr></thead><tbody>{orders.map((order) => { const orderPayments = payments.filter((payment) => payment.orderId === order.id); const paid = orderPayments.reduce((sum, payment) => sum + Number(payment.amount), 0); const isPaid = paid >= order.total; const shortage = orderStockShortage(order, products, batches, orders); return <tr key={order.id}><td className="strong-cell">{order.id}</td><td>{order.customer}</td><td>{money(order.total)}</td><td>{money(paid)}</td><td className={paid < order.total ? 'balance-due' : 'balance-paid'}>{money(Math.max(0, order.total - paid))}</td><td>{orderPayments.length} / 2</td><td>{order.status === 'Cancelled' ? <button className="button payment-row-action payment-cancelled-action" type="button" disabled>Cancelled</button> : isPaid ? <button className="button payment-row-action payment-paid-action" type="button" disabled>Paid</button> : orderPayments.length >= 2 ? <span className="status-badge status-partial">Limit reached</span> : shortage ? <button className="button payment-row-action payment-stock-action" type="button" disabled title={`Need ${shortage.required} ${shortage.product}; ${shortage.available} available`}>Produce first</button> : <button className="button button-primary payment-row-action" type="button" onClick={() => onRecordPayment(order)}>Record payment</button>}</td></tr>; })}</tbody></table></div> : <EmptyState title="No order balances yet" detail="Create an order to start tracking deposits and final payments." />}</section>
    <section className="panel data-panel"><div className="panel-heading"><div><h3>Payment receipts</h3><p>Manual cash and GCash records.</p></div></div>{payments.length ? <div className="table-scroll"><table><thead><tr><th>RECEIPT</th><th>ORDER</th><th>METHOD</th><th>AMOUNT</th><th>REFERENCE</th><th>PAID AT</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id}><td className="strong-cell">{payment.id}</td><td>{payment.orderId}</td><td>{payment.method}</td><td>{money(payment.amount)}</td><td>{payment.reference || '—'}</td><td>{new Date(payment.paidAt).toLocaleString('en-PH')}</td></tr>)}</tbody></table></div> : <EmptyState title="No receipts recorded yet" detail="Customer payments are added here by an owner." />}</section>
  </>;
}

function ExpensesPage({ expenses }) {
  const total = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  return <><section className="payment-summary-grid"><SummaryTile label="Recorded expenses" value={money(total)} note={`${expenses.length} business expenses`} /><SummaryTile label="This month" value={money(expenses.filter((expense) => expense.date?.startsWith(today.slice(0, 7))).reduce((sum, expense) => sum + Number(expense.amount), 0))} note="Spending in the current month" /></section>
    <section className="panel data-panel"><div className="panel-heading"><div><h3>Expense book</h3><p>Materials, packaging, delivery, and all the in-between.</p></div></div>{expenses.length ? <div className="table-scroll"><table><thead><tr><th>DATE</th><th>CATEGORY</th><th>DESCRIPTION</th><th>METHOD</th><th>RECEIPT</th><th>AMOUNT</th></tr></thead><tbody>{expenses.map((expense) => <tr key={expense.id}><td>{dateLabel(expense.date)}</td><td><span className="soft-chip">{expense.category}</span></td><td className="strong-cell">{expense.description}</td><td>{expense.method}</td><td>{expense.receipt ? <a href={expense.receipt} target="_blank" rel="noreferrer">View receipt ↗</a> : '—'}</td><td>{money(expense.amount)}</td></tr>)}</tbody></table></div> : <EmptyState title="No expenses to show" detail="Log a business expense to keep your studio books tidy." />}</section>
  </>;
}

function ReportsPage({ month, setMonth, basis, setBasis, orders, candles, souvenirs, total, expenses }) {
  return <><section className="report-controls panel"><div><label htmlFor="report-month">REPORTING MONTH</label><input id="report-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></div><div><label htmlFor="report-basis">REPORTING BASIS</label><select id="report-basis" value={basis} onChange={(e) => setBasis(e.target.value)}><option value="order">Order date</option><option value="due">Due date</option></select></div><div className="report-basis-note"><span>ⓘ</span><p>Income uses <strong>{basis === 'order' ? 'order date' : 'due date'}</strong>. Shipping is excluded from all product totals.</p></div></section>
    <section className="report-paper"><div className="report-header"><div><div className="report-brand"><span className="brand-mark">s<span>.</span></span><span><strong>simula studio</strong><small>HANDMADE WITH HEART</small></span></div><p className="eyebrow">MONTHLY BUSINESS REPORT</p><h2>{new Date(`${month}-01T00:00:00`).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}</h2><p>Reporting basis: <strong>{basis === 'order' ? 'Order date' : 'Due date'}</strong></p></div><span className="report-stamp">STUDIO<br />RECORDS</span></div>
      <div className="report-rule" /><div className="report-line"><span>Scented candles</span><small>{orders.filter((order) => order.items.some((item) => item.type === 'Candle')).length} orders</small><strong>{money(candles)}</strong></div><div className="report-line"><span>Souvenirs</span><small>{orders.filter((order) => order.items.some((item) => item.type === 'Souvenir')).length} orders</small><strong>{money(souvenirs)}</strong></div><div className="report-line report-total"><span>Total product income</span><strong>{money(total)}</strong></div>
      <div className="report-footnote"><span>✓</span> Shipping fees are excluded. Income is based on order item quantities × selling price.</div>
      <div className="report-expenses"><span>Business expenses recorded this month</span><strong>{money(expenses)}</strong></div>
      <div className="report-footer"><span>Simula Studio · Established April 2, 2026</span><span>Printed {dateLabel(today)}</span></div>
    </section>
  </>;
}

function SummaryTile({ label, value, note }) {
  return <article className="summary-tile"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function SearchInput({ value, onChange, placeholder }) {
  return <label className="search-field"><Icon name="search" /><input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /><span>⌘ K</span></label>;
}

function Status({ value }) {
  const key = value.toLowerCase().replace(/\s+/g, '-');
  return <span className={`status-badge status-${key}`}><i />{value}</span>;
}

function EmptyState({ title, detail, action, onClick }) {
  return <div className="empty-state"><span className="empty-flower">✿</span><h4>{title}</h4><p>{detail}</p>{action && <button className="button button-secondary" onClick={onClick}>{action}</button>}</div>;
}

function Modal({ type, data, selectedOrder, selectedCustomer, selectedMaterial, selectedProduct, onClose, onSave }) {
  const [error, setError] = useState('');
  const [form, setForm] = useState(() => {
    const firstProduct = data.products[0];
    const paymentOrders = data.orders.filter((order) => order.status !== 'Cancelled' && order.total > data.payments.filter((payment) => payment.orderId === order.id).reduce((sum, payment) => sum + Number(payment.amount), 0) && data.payments.filter((payment) => payment.orderId === order.id).length < 2 && !orderStockShortage(order, data.products, data.batches, data.orders));
    const defaults = {
      customer: { name: selectedCustomer?.name || '', phone: selectedCustomer?.phone || '', email: selectedCustomer?.email || '', address: selectedCustomer?.address || '', notes: selectedCustomer?.notes || '' },
      product: { name: '', type: 'Candle', price: '' },
      material: { name: selectedMaterial?.name || '', unit: selectedMaterial?.unit || '', price: selectedMaterial?.price ?? '', threshold: selectedMaterial?.threshold ?? '', active: selectedMaterial?.active ?? true },
      order: { customerId: selectedOrder?.customerId || data.customers[0]?.id || '', items: selectedOrder?.items.map((item, index) => ({ ...item, id: item.id || `${selectedOrder.id}-item-${index + 1}`, quantity: String(item.quantity), price: String(item.price) })) || [{ productId: firstProduct?.id || '', quantity: '1', price: firstProduct?.price || '' }], date: selectedOrder?.date || today, dueDate: selectedOrder?.dueDate || '', shipping: String(selectedOrder?.shipping || 0) },
      stock: { materialId: data.materials[0]?.id || '', action: 'Restock', quantity: '', reason: '' },
      production: { productId: selectedProduct?.id || firstProduct?.id || '', quantity: '1' },
      payment: { orderId: selectedOrder?.id || paymentOrders[0]?.id || '', method: 'GCash', amount: '', reference: '' },
      expense: { category: 'Materials', description: '', amount: '', date: today, method: 'Cash', receipt: '' },
    };
    return defaults[type] || {};
  });
  const set = (key, value) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'productId') {
        const product = data.products.find((entry) => entry.id === value);
        next.price = product?.price || '';
      }
      return next;
    });
  };
  const setLine = (index, key, value) => {
    setForm((current) => ({
      ...current, items: current.items.map((line, position) => {
        if (position !== index) return line;
        if (key === 'productId') return { ...line, productId: value, price: data.products.find((product) => product.id === value)?.price || '' };
        return { ...line, [key]: value };
      })
    }));
  };
  const addLine = () => setForm((current) => ({ ...current, items: [...current.items, { productId: data.products[0]?.id || '', quantity: '1', price: data.products[0]?.price || '' }] }));
  const removeLine = (index) => setForm((current) => ({ ...current, items: current.items.filter((_, position) => position !== index) }));
  const payOrder = data.orders.find((order) => order.id === form.orderId);
  const paymentTotal = data.payments.filter((payment) => payment.orderId === form.orderId).reduce((sum, payment) => sum + Number(payment.amount), 0);
  const paymentOrders = data.orders.filter((order) => order.status !== 'Cancelled' && order.total > data.payments.filter((payment) => payment.orderId === order.id).reduce((sum, payment) => sum + Number(payment.amount), 0) && data.payments.filter((payment) => payment.orderId === order.id).length < 2 && !orderStockShortage(order, data.products, data.batches, data.orders));
  const selectedProductionProduct = data.products.find((product) => product.id === form.productId);
  const productionQuantity = Number(form.quantity);
  const productionDeductions = selectedProductionProduct?.recipe.map((use) => {
    const material = data.materials.find((entry) => entry.name === use.material && entry.active);
    return { material, needed: Number(use.quantity) * productionQuantity };
  }) || [];
  const productionShortage = productionDeductions.find(({ material, needed }) => !material || material.stock < needed);
  const orderItemTotal = (form.items || []).reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0), 0);
  const title = { customer: selectedCustomer ? 'Update customer profile' : 'Add a customer', product: 'Add a product', material: selectedMaterial ? 'Edit material' : 'Add a material', order: selectedOrder ? 'Update order' : 'Create an order', stock: 'Update material stock', production: 'Create finished products', payment: 'Record a payment', expense: 'Add an expense', slip: 'Order slip' }[type];
  if (type === 'slip' && selectedOrder) return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section className="modal-card slip-card"><button className="modal-close" onClick={onClose} aria-label="Close">×</button><div className="slip-brand"><span className="brand-mark">s<span>.</span></span><span><strong>simula studio</strong><small>HANDMADE WITH HEART</small></span></div><p className="eyebrow">ORDER SLIP · {selectedOrder.id}</p><h2>{selectedOrder.customer}</h2><p>Order date {dateLabel(selectedOrder.date)} · Due {dateLabel(selectedOrder.dueDate)}</p><div className="slip-items">{selectedOrder.items.map((item) => <div key={item.productId}><span>{item.quantity} × {item.name}</span><strong>{money(item.quantity * item.price)}</strong></div>)}</div><div className="slip-items"><div><span>Shipping</span><strong>{money(selectedOrder.shipping)}</strong></div></div><div className="slip-total"><span>Total due</span><strong>{money(selectedOrder.total)}</strong></div><p className="slip-thanks">Thank you for supporting our little studio ✿</p><button className="button button-primary modal-submit" onClick={() => onSave({})}><Icon name="print" /> Print order slip</button></section></div>;
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-header"><div><p className="eyebrow">SIMULA STUDIO</p><h2 id="modal-title">{title}</h2></div><button className="modal-close" onClick={onClose} aria-label="Close">×</button></div>
    {error && <div className="form-error" role="alert">{error}</div>}
    {type === 'customer' && <div className="form-grid"><Field label="Full name" required><input autoFocus value={form.name} maxLength="150" onChange={(e) => set('name', e.target.value)} placeholder="e.g. Alex Santos" /></Field><Field label="Contact number"><input value={form.phone} maxLength="20" onChange={(e) => set('phone', e.target.value)} placeholder="+63 912 345 6789" /></Field><Field label="Email address"><input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="alex@email.com" /></Field><Field label="Address"><input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="City or delivery address" /></Field><Field label="Notes" wide><textarea rows="3" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Preferences, reminders, or little details..." /></Field></div>}
    {type === 'product' && <div className="form-grid"><Field label="Product name" required><input autoFocus value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Lavender candle · 150 ml" /></Field><Field label="Product type"><select value={form.type} onChange={(e) => set('type', e.target.value)}><option>Candle</option><option>Souvenir</option></select></Field><Field label="Selling price (₱)" required><input type="number" min="0.01" step="0.01" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="0.00" /></Field><p className="form-hint wide">You can set up its adjustable material recipe on the Products page after saving.</p></div>}
    {type === 'material' && <div className="form-grid"><Field label="Material name" required><input autoFocus maxLength="150" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Candle jar" /></Field><Field label="Unit" required><input maxLength="30" value={form.unit} onChange={(e) => set('unit', e.target.value)} placeholder="kg, pc, sheet…" /></Field><Field label="Unit price (₱)" required><input type="number" min="0" step="0.01" value={form.price} onChange={(e) => set('price', e.target.value)} /></Field><Field label="Low-stock threshold" required><input type="number" min="0" step="0.001" value={form.threshold} onChange={(e) => set('threshold', e.target.value)} /></Field><label className="material-active wide"><input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} /><span>Active material · include in recipes and stock alerts</span></label>{!selectedMaterial && <p className="form-hint wide">New materials start at zero on hand. Use “Update stock” to record the first restock.</p>}</div>}
    {type === 'order' && <div className="form-grid">{!data.customers.length && <p className="form-hint wide">Add a customer profile first to create an order.</p>}<Field label="Customer" required><select value={form.customerId} onChange={(e) => set('customerId', e.target.value)}><option value="">Choose customer</option>{data.customers.map((c) => <option value={c.id} key={c.id}>{c.name}</option>)}</select></Field><div className="order-lines wide"><div className="order-lines-header"><span>Order items</span><button type="button" className="text-link" onClick={addLine}>+ Add item</button></div>{form.items.map((item, index) => <div className="order-line" key={item.id || `new-${index}`}><select aria-label="Product variant" value={item.productId} onChange={(e) => setLine(index, 'productId', e.target.value)}>{data.products.map((product) => <option value={product.id} key={product.id}>{product.name} · {product.type}</option>)}</select><input aria-label="Item quantity" type="number" min="1" step="1" value={item.quantity} onChange={(e) => setLine(index, 'quantity', e.target.value)} /><input aria-label="Unit price in pesos" type="number" min="0.01" step="0.01" value={item.price} onChange={(e) => setLine(index, 'price', e.target.value)} /><button type="button" className="remove-line" aria-label="Remove item" onClick={() => removeLine(index)}>×</button></div>)}</div><Field label="Order date"><input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} /></Field><Field label="Due date"><input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} /></Field><Field label="Shipping fee (₱) · excluded from reports"><input type="number" min="0" step="0.01" value={form.shipping} onChange={(e) => set('shipping', e.target.value)} /></Field><div className="order-total-preview"><span>Order total</span><strong>{money(orderItemTotal + Number(form.shipping || 0))}</strong></div></div>}
    {type === 'stock' && <div className="form-grid"><Field label="Material" required><select value={form.materialId} onChange={(e) => set('materialId', e.target.value)}>{data.materials.map((m) => <option value={m.id} key={m.id}>{m.name} · {m.stock} {m.unit} on hand</option>)}</select></Field><Field label="Stock action"><select value={form.action} onChange={(e) => set('action', e.target.value)}><option>Restock</option><option>Remove</option><option>Set balance</option></select></Field><Field label={`Quantity (${data.materials.find((m) => m.id === form.materialId)?.unit || 'units'})`} required><input type="number" min={form.action === 'Set balance' ? '0' : '0.001'} step="0.001" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} /></Field><Field label="Reason"><input value={form.reason} onChange={(e) => set('reason', e.target.value)} placeholder="Supplier delivery, count correction..." /></Field></div>}
    {type === 'production' && <div className="form-grid"><Field label="Product to make" required wide><select value={form.productId} onChange={(e) => set('productId', e.target.value)}>{data.products.map((product) => <option value={product.id} key={product.id}>{product.name} · {product.type}</option>)}</select></Field><Field label="Quantity to make" required><input autoFocus type="number" min="1" step="1" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} /></Field><div className="production-check"><span>✦</span>Required materials are checked together before inventory is changed.</div>{productionShortage && Number.isInteger(productionQuantity) && productionQuantity > 0 && <div className="form-error wide">Not enough {productionShortage.material?.name || 'active material'} for this batch. Needed {productionShortage.needed.toFixed(3)} {productionShortage.material?.unit || ''}; available {productionShortage.material?.stock ?? 0} {productionShortage.material?.unit || ''}. No stock will be changed.</div>}</div>}
    {type === 'payment' && <div className="form-grid">{!paymentOrders.length && <p className="form-hint wide">No order is ready for payment. Produce and reserve all finished products for an order first.</p>}<Field label="Order" required wide><select value={form.orderId} onChange={(e) => set('orderId', e.target.value)}><option value="">Choose an order</option>{paymentOrders.map((order) => { const count = data.payments.filter((p) => p.orderId === order.id).length; const paid = data.payments.filter((p) => p.orderId === order.id).reduce((sum, p) => sum + Number(p.amount), 0); return <option value={order.id} key={order.id}>{order.id} · {order.customer} · {money(order.total - paid)} due · {count}/2 receipts</option>; })}</select></Field><Field label="Amount (₱)" required><input type="number" min="0.01" max={payOrder ? payOrder.total - paymentTotal : ''} step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0.00" /></Field><Field label="Payment method"><select value={form.method} onChange={(e) => set('method', e.target.value)}><option>GCash</option><option>Cash</option></select></Field><Field label="Reference number (optional)" wide><input value={form.reference} onChange={(e) => set('reference', e.target.value)} placeholder="GCash reference or receipt note" /></Field>{payOrder && <div className="payment-preview wide"><span>Order total <strong>{money(payOrder.total)}</strong></span><span>Paid so far <strong>{money(paymentTotal)}</strong></span><span>Remaining <strong>{money(payOrder.total - paymentTotal)}</strong></span><span>Receipts <strong>{data.payments.filter((p) => p.orderId === form.orderId).length} / 2 maximum</strong></span></div>}</div>}
    {type === 'expense' && <div className="form-grid"><Field label="Category"><select value={form.category} onChange={(e) => set('category', e.target.value)}>{['Materials', 'Packaging', 'Delivery', 'Marketing', 'Utilities', 'Equipment', 'Other'].map((category) => <option key={category}>{category}</option>)}</select></Field><Field label="Amount (₱)" required><input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0.00" /></Field><Field label="Description" required wide><input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="What was the expense for?" /></Field><Field label="Expense date"><input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} /></Field><Field label="Payment method"><select value={form.method} onChange={(e) => set('method', e.target.value)}><option>Cash</option><option>GCash</option><option>Bank transfer</option><option>Other</option></select></Field><Field label="Receipt link (optional)" wide><input type="url" value={form.receipt} onChange={(e) => set('receipt', e.target.value)} placeholder="https://..." /></Field></div>}
    <div className="modal-actions"><button className="button button-secondary" onClick={onClose}>Cancel</button><button className="button button-primary" onClick={() => { const validationError = onSave(form); if (validationError) setError(validationError); }}><Icon name="check" /> {type === 'production' ? 'Create products' : `Save ${type === 'customer' ? 'customer' : type === 'order' ? 'order' : type === 'payment' ? 'payment' : type === 'expense' ? 'expense' : type === 'stock' ? 'stock update' : type === 'material' ? 'material' : 'product'}`}</button></div>
  </section></div>;
}

function Field({ label, required, wide, children }) {
  return <label className={`form-field ${wide ? 'wide' : ''}`}><span>{label}{required && <i> *</i>}</span>{children}</label>;
}

function Icon({ name }) {
  const paths = {
    plus: <path d="M12 5v14M5 12h14" />, print: <><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v7H6z" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    trend: <><path d="m3 17 6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
    box: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="M3 8v9l9 5 9-5V8M12 13v9" /></>,
    wallet: <><rect x="3" y="5" width="18" height="15" rx="2" /><path d="M3 9h18M16 14h2" /><path d="M6 5V3h12v2" /></>,
    spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" /></>,
    person: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    flask: <><path d="M9 3h6M10 3v7l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M8 16h8" /></>,
    check: <path d="m5 12 4 4L19 6" />,
  };
  return <svg className="icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.spark}</svg>;
}

export default App;
