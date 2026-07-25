import { useState, useMemo } from "react";
import {
  Store, ShoppingBag, ShieldCheck, Plus, Trash2, Pencil, X, LogOut,
  Package, ClipboardList, Ban, CheckCircle2, ArrowRight, MapPin, Search
} from "lucide-react";

/* ---------------------------------------------------------------
   TOKENS
   ink        #12241C  nav / chrome
   paper      #FAF8F2  page background
   card       #F1EDE2  card surface
   line       #DDD5C2  hairline rule
   text       #1A2620  primary text
   muted      #5C6B62  secondary text
   shopper    #3E6FA6  denim blue
   vendor     #B8763A  clay amber
   admin      #6E4E96  plum
----------------------------------------------------------------*/

const ROLE_STYLE = {
  shopper: { color: "#3E6FA6", tint: "#EAF1F8", label: "Shopper", icon: ShoppingBag },
  vendor: { color: "#B8763A", tint: "#FAF1E6", label: "Vendor", icon: Store },
  admin: { color: "#6E4E96", tint: "#F1ECF7", label: "Admin", icon: ShieldCheck },
};

const seedUsers = [
  { id: "u-jordan", name: "Jordan Lee", email: "jordan@shopmail.com", role: "shopper", status: "active" },
  { id: "u-sana", name: "Sana Osei", email: "sana@ceramics.co", role: "vendor", status: "active" },
  { id: "u-theo", name: "Theo Marsh", email: "theo@nomadroast.com", role: "vendor", status: "active" },
  { id: "u-priya", name: "Priya Shah", email: "priya@marketplace.io", role: "admin", status: "active" },
];

const seedProducts = [
  { id: "p1", vendorId: "u-sana", name: "Speckled Stoneware Mug", price: 24, stock: 18, category: "Ceramics", emoji: "🍶", description: "Wheel-thrown mug in a warm speckled glaze. Holds 12oz, dishwasher safe." },
  { id: "p2", vendorId: "u-sana", name: "Fluted Serving Bowl", price: 58, stock: 6, category: "Ceramics", emoji: "🥣", description: "Wide fluted bowl for salads or centerpieces. Each piece is one of a kind." },
  { id: "p3", vendorId: "u-sana", name: "Terracotta Planter, Small", price: 19, stock: 25, category: "Ceramics", emoji: "🪴", description: "Unglazed terracotta pot with drainage hole, 4in diameter." },
  { id: "p4", vendorId: "u-theo", name: "Nomad Dark Roast, 12oz", price: 16, stock: 40, category: "Coffee", emoji: "☕", description: "Single-origin Ethiopian beans, roasted weekly in small batches." },
  { id: "p5", vendorId: "u-theo", name: "Pour-Over Starter Kit", price: 45, stock: 9, category: "Coffee", emoji: "🫖", description: "Ceramic dripper, filters, and a bag of medium roast to get started." },
  { id: "p6", vendorId: "u-theo", name: "Cold Brew Concentrate", price: 13, stock: 0, category: "Coffee", emoji: "🧊", description: "Slow-steeped 32oz concentrate, dilute 1:1 over ice." },
];

const seedOrders = [
  {
    id: "o1", shopperId: "u-jordan", date: "2026-07-18",
    items: [{ productId: "p1", name: "Speckled Stoneware Mug", vendorId: "u-sana", qty: 2, price: 24 }],
    total: 48, status: "fulfilled",
  },
];

const seedActivity = [
  "Priya Shah set up the marketplace",
  "Sana Osei listed 3 products",
  "Theo Marsh listed 3 products",
  "Jordan Lee placed order #o1",
];

const uid = (p) => `${p}-${Math.random().toString(36).slice(2, 8)}`;
const money = (n) => `$${n.toFixed(2)}`;

export default function Marketplace() {
  const [role, setRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState(seedUsers);
  const [products, setProducts] = useState(seedProducts);
  const [orders, setOrders] = useState(seedOrders);
  const [cart, setCart] = useState([]); // {productId, qty}
  const [activity, setActivity] = useState(seedActivity);
  const [toast, setToast] = useState(null);

  const log = (text) => setActivity((a) => [text, ...a].slice(0, 30));

  const flash = (text) => {
    setToast(text);
    setTimeout(() => setToast(null), 2200);
  };

  const login = (userId) => {
    const u = users.find((x) => x.id === userId);
    setCurrentUser(u);
    setRole(u.role);
    setCart([]);
  };

  const logout = () => {
    setCurrentUser(null);
    setRole(null);
    setCart([]);
  };

  if (!role) {
    return (
      <LoginScreen users={users} onLogin={login} activity={activity} />
    );
  }

  return (
    <div style={{ background: "#FAF8F2", minHeight: "100vh" }} className="font-[system-ui]">
      <TopBar role={role} user={currentUser} onLogout={logout} />
      <Ticker activity={activity} />
      {toast && <Toast text={toast} />}

      {role === "shopper" && (
        <ShopperView
          user={currentUser}
          products={products}
          vendors={users.filter((u) => u.role === "vendor")}
          cart={cart}
          setCart={setCart}
          setProducts={setProducts}
          setOrders={setOrders}
          log={log}
          flash={flash}
        />
      )}
      {role === "vendor" && (
        <VendorView
          user={currentUser}
          products={products}
          setProducts={setProducts}
          orders={orders}
          log={log}
          flash={flash}
        />
      )}
      {role === "admin" && (
        <AdminView
          users={users}
          setUsers={setUsers}
          products={products}
          setProducts={setProducts}
          orders={orders}
          log={log}
          flash={flash}
        />
      )}
    </div>
  );
}

/* ---------------- LOGIN ---------------- */

function LoginScreen({ users, onLogin, activity }) {
  const [picked, setPicked] = useState("shopper");
  const options = users.filter((u) => u.role === picked);

  return (
    <div style={{ background: "#12241C", minHeight: "100vh" }} className="flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-[#D8CDB0] text-xs tracking-[0.25em] uppercase mb-3">
            <MapPin size={14} /> The Commons Market
          </div>
          <h1 className="text-4xl text-[#FAF8F2]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            One market. Three counters.
          </h1>
          <p className="text-[#9BA89C] mt-2 text-sm">
            Choose a stall to sign in as a demo account. Every counter reads the same ledger.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {Object.entries(ROLE_STYLE).map(([key, s]) => {
            const Icon = s.icon;
            const active = picked === key;
            return (
              <button
                key={key}
                onClick={() => setPicked(key)}
                className="rounded-lg p-4 text-left transition-all border"
                style={{
                  background: active ? s.tint : "#1B3327",
                  borderColor: active ? s.color : "#2C4536",
                  color: active ? "#1A2620" : "#CFE0D3",
                }}
              >
                <Icon size={20} color={active ? s.color : "#CFE0D3"} />
                <div className="mt-2 font-medium">{s.label}</div>
              </button>
            );
          })}
        </div>

        <div className="rounded-lg border border-[#2C4536] bg-[#152A20] p-3">
          {options.map((u) => (
            <button
              key={u.id}
              onClick={() => onLogin(u.id)}
              disabled={u.status === "suspended"}
              className="w-full flex items-center justify-between px-3 py-3 rounded-md hover:bg-[#1E3A2C] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="text-left">
                <div className="text-[#FAF8F2] text-sm font-medium">{u.name}</div>
                <div className="text-[#8FA090] text-xs">{u.email}{u.status === "suspended" ? " · suspended" : ""}</div>
              </div>
              <ArrowRight size={16} color="#8FA090" />
            </button>
          ))}
        </div>

        <p className="text-center text-[#66755F] text-xs mt-6">
          Prototype login — role selection only, no password required.
        </p>
      </div>
    </div>
  );
}

/* ---------------- CHROME ---------------- */

function TopBar({ role, user, onLogout }) {
  const s = ROLE_STYLE[role];
  const Icon = s.icon;
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#DDD5C2" }}>
      <div className="flex items-center gap-2">
        <MapPin size={18} color="#12241C" />
        <span className="text-lg" style={{ fontFamily: "Georgia, serif", color: "#12241C" }}>
          The Commons Market
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
          style={{ background: s.tint, color: s.color }}
        >
          <Icon size={13} /> {s.label} · {user?.name}
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 text-xs text-[#5C6B62] hover:text-[#1A2620] px-3 py-1.5 rounded-full border"
          style={{ borderColor: "#DDD5C2" }}
        >
          <LogOut size={13} /> Switch role
        </button>
      </div>
    </div>
  );
}

function Ticker({ activity }) {
  const items = activity.slice(0, 8);
  return (
    <div
      className="overflow-hidden border-b text-xs"
      style={{ borderColor: "#DDD5C2", background: "#F1EDE2", color: "#5C6B62" }}
    >
      <div className="px-6 py-2 flex items-center gap-2 whitespace-nowrap overflow-x-auto">
        <span className="uppercase tracking-wider text-[10px] text-[#8A9285] shrink-0">Ledger —</span>
        {items.map((a, i) => (
          <span key={i} className="flex items-center gap-2 shrink-0">
            <span className="font-mono">{a}</span>
            {i < items.length - 1 && <span className="text-[#C9BFA5]">·</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

function Toast({ text }) {
  return (
    <div
      className="fixed bottom-5 right-5 px-4 py-2.5 rounded-lg shadow-lg text-sm flex items-center gap-2 z-50"
      style={{ background: "#12241C", color: "#FAF8F2" }}
    >
      <CheckCircle2 size={15} /> {text}
    </div>
  );
}

/* ---------------- SHOPPER ---------------- */

function ShopperView({ user, products, vendors, cart, setCart, setProducts, setOrders, log, flash }) {
  const [query, setQuery] = useState("");
  const [openProduct, setOpenProduct] = useState(null);
  const [showCart, setShowCart] = useState(false);

  const vendorName = (id) => vendors.find((v) => v.id === id)?.name || "Unknown vendor";

  const visible = products.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()) || p.category.toLowerCase().includes(query.toLowerCase())
  );

  const addToCart = (product, qty = 1) => {
    setCart((c) => {
      const existing = c.find((i) => i.productId === product.id);
      if (existing) {
        return c.map((i) => (i.productId === product.id ? { ...i, qty: i.qty + qty } : i));
      }
      return [...c, { productId: product.id, qty }];
    });
    flash(`Added ${product.name} to cart`);
  };

  const cartLines = cart
    .map((i) => {
      const p = products.find((p) => p.id === i.productId);
      return p ? { ...i, product: p } : null;
    })
    .filter(Boolean);
  const cartTotal = cartLines.reduce((sum, l) => sum + l.product.price * l.qty, 0);

  const placeOrder = () => {
    if (cartLines.length === 0) return;
    const order = {
      id: uid("o"),
      shopperId: user.id,
      date: new Date().toISOString().slice(0, 10),
      items: cartLines.map((l) => ({
        productId: l.product.id, name: l.product.name, vendorId: l.product.vendorId, qty: l.qty, price: l.product.price,
      })),
      total: cartTotal,
      status: "placed",
    };
    setOrders((o) => [order, ...o]);
    setProducts((ps) =>
      ps.map((p) => {
        const line = cartLines.find((l) => l.product.id === p.id);
        return line ? { ...p, stock: Math.max(0, p.stock - line.qty) } : p;
      })
    );
    log(`${user.name} placed order #${order.id} (${money(cartTotal)})`);
    flash("Order placed");
    setCart([]);
    setShowCart(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl" style={{ fontFamily: "Georgia, serif", color: "#1A2620" }}>Browse the market</h2>
          <p className="text-sm text-[#5C6B62]">{visible.length} items from {vendors.length} vendors</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-white" style={{ borderColor: "#DDD5C2" }}>
            <Search size={14} color="#8A9285" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products"
              className="text-sm outline-none w-36"
            />
          </div>
          <button
            onClick={() => setShowCart(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: "#3E6FA6" }}
          >
            <ShoppingBag size={15} /> Cart · {cart.reduce((n, i) => n + i.qty, 0)}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {visible.map((p) => (
          <button
            key={p.id}
            onClick={() => setOpenProduct(p)}
            className="text-left rounded-xl border bg-white p-4 hover:shadow-md transition-shadow"
            style={{ borderColor: "#DDD5C2" }}
          >
            <div className="text-3xl mb-2">{p.emoji}</div>
            <div className="font-medium text-sm text-[#1A2620]">{p.name}</div>
            <div className="text-xs text-[#8A9285] mb-2">{vendorName(p.vendorId)}</div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm text-[#1A2620]">{money(p.price)}</span>
              <span className="text-[10px]" style={{ color: p.stock === 0 ? "#B65C4A" : "#5C6B62" }}>
                {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
              </span>
            </div>
          </button>
        ))}
      </div>

      {openProduct && (
        <ProductModal
          product={openProduct}
          vendorName={vendorName(openProduct.vendorId)}
          onClose={() => setOpenProduct(null)}
          onAdd={(qty) => { addToCart(openProduct, qty); setOpenProduct(null); }}
        />
      )}

      {showCart && (
        <CartDrawer
          lines={cartLines}
          total={cartTotal}
          onClose={() => setShowCart(false)}
          onRemove={(id) => setCart((c) => c.filter((i) => i.productId !== id))}
          onCheckout={placeOrder}
        />
      )}
    </div>
  );
}

function ProductModal({ product, vendorName, onClose, onAdd }) {
  const [qty, setQty] = useState(1);
  return (
    <Modal onClose={onClose}>
      <div className="text-5xl mb-3">{product.emoji}</div>
      <h3 className="text-xl font-medium text-[#1A2620]">{product.name}</h3>
      <p className="text-xs text-[#8A9285] mb-3">Sold by {vendorName}</p>
      <p className="text-sm text-[#5C6B62] mb-4">{product.description}</p>
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-lg text-[#1A2620]">{money(product.price)}</span>
        <span className="text-xs text-[#5C6B62]">{product.stock} in stock</span>
      </div>
      {product.stock > 0 ? (
        <div className="flex items-center gap-3">
          <input
            type="number" min={1} max={product.stock} value={qty}
            onChange={(e) => setQty(Math.max(1, Math.min(product.stock, Number(e.target.value))))}
            className="w-16 px-2 py-2 rounded-lg border text-sm text-center" style={{ borderColor: "#DDD5C2" }}
          />
          <button
            onClick={() => onAdd(qty)}
            className="flex-1 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#3E6FA6" }}
          >
            Add to cart
          </button>
        </div>
      ) : (
        <div className="text-sm text-[#B65C4A] text-center py-2">This item is currently out of stock.</div>
      )}
    </Modal>
  );
}

function CartDrawer({ lines, total, onClose, onRemove, onCheckout }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex justify-end z-40" onClick={onClose}>
      <div className="w-full max-w-sm bg-white h-full p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-medium text-[#1A2620]">Your cart</h3>
          <button onClick={onClose}><X size={18} color="#8A9285" /></button>
        </div>
        {lines.length === 0 ? (
          <p className="text-sm text-[#8A9285]">Your cart is empty. Add something from the market.</p>
        ) : (
          <>
            <div className="space-y-3 mb-5">
              {lines.map((l) => (
                <div key={l.productId} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="text-[#1A2620]">{l.product.name}</div>
                    <div className="text-xs text-[#8A9285]">{l.qty} × {money(l.product.price)}</div>
                  </div>
                  <button onClick={() => onRemove(l.productId)}><Trash2 size={14} color="#B65C4A" /></button>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-3 border-t mb-4" style={{ borderColor: "#DDD5C2" }}>
              <span className="text-sm text-[#5C6B62]">Total</span>
              <span className="font-mono font-medium text-[#1A2620]">{money(total)}</span>
            </div>
            <button
              onClick={onCheckout}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-white" style={{ background: "#3E6FA6" }}
            >
              Place order
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- VENDOR ---------------- */

function VendorView({ user, products, setProducts, orders, log, flash }) {
  const [tab, setTab] = useState("listings");
  const [editing, setEditing] = useState(null); // product or "new"

  const mine = products.filter((p) => p.vendorId === user.id);
  const myOrders = orders.filter((o) => o.items.some((i) => i.vendorId === user.id));

  const saveProduct = (data) => {
    if (data.id) {
      setProducts((ps) => ps.map((p) => (p.id === data.id ? { ...p, ...data } : p)));
      log(`${user.name} updated listing "${data.name}"`);
      flash("Listing updated");
    } else {
      const p = { ...data, id: uid("p"), vendorId: user.id };
      setProducts((ps) => [p, ...ps]);
      log(`${user.name} listed "${data.name}" — now live in the Shopper store`);
      flash("Listing published");
    }
    setEditing(null);
  };

  const remove = (p) => {
    setProducts((ps) => ps.filter((x) => x.id !== p.id));
    log(`${user.name} removed listing "${p.name}"`);
    flash("Listing removed");
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl" style={{ fontFamily: "Georgia, serif", color: "#1A2620" }}>Your counter</h2>
          <p className="text-sm text-[#5C6B62]">{mine.length} listings · {myOrders.length} orders</p>
        </div>
        <div className="flex gap-2">
          <TabButton active={tab === "listings"} onClick={() => setTab("listings")} icon={Package} label="Listings" />
          <TabButton active={tab === "orders"} onClick={() => setTab("orders")} icon={ClipboardList} label="Orders" />
        </div>
      </div>

      {tab === "listings" && (
        <>
          <button
            onClick={() => setEditing("new")}
            className="mb-4 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: "#B8763A" }}
          >
            <Plus size={15} /> Add product
          </button>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#DDD5C2" }}>
            {mine.length === 0 && <div className="p-6 text-sm text-[#8A9285]">No listings yet. Add your first product.</div>}
            {mine.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3 bg-white border-b last:border-b-0" style={{ borderColor: "#DDD5C2" }}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{p.emoji}</span>
                  <div>
                    <div className="text-sm font-medium text-[#1A2620]">{p.name}</div>
                    <div className="text-xs text-[#8A9285]">{p.category} · {money(p.price)} · {p.stock} in stock</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setEditing(p)}><Pencil size={14} color="#5C6B62" /></button>
                  <button onClick={() => remove(p)}><Trash2 size={14} color="#B65C4A" /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "orders" && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#DDD5C2" }}>
          {myOrders.length === 0 && <div className="p-6 text-sm text-[#8A9285]">No orders yet for your items.</div>}
          {myOrders.map((o) => (
            <div key={o.id} className="px-4 py-3 bg-white border-b last:border-b-0" style={{ borderColor: "#DDD5C2" }}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-mono text-[#1A2620]">#{o.id}</span>
                <span className="text-xs text-[#8A9285]">{o.date}</span>
              </div>
              {o.items.filter((i) => i.vendorId === user.id).map((i) => (
                <div key={i.productId} className="text-xs text-[#5C6B62]">{i.qty} × {i.name} — {money(i.qty * i.price)}</div>
              ))}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ProductForm
          initial={editing === "new" ? null : editing}
          onSave={saveProduct}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border"
      style={{
        background: active ? "#12241C" : "white",
        color: active ? "#FAF8F2" : "#5C6B62",
        borderColor: active ? "#12241C" : "#DDD5C2",
      }}
    >
      <Icon size={13} /> {label}
    </button>
  );
}

function ProductForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(
    initial || { name: "", price: "", stock: "", category: "", emoji: "🛍️", description: "" }
  );
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.name || !form.price) return;
    onSave({ ...form, price: Number(form.price), stock: Number(form.stock) || 0 });
  };

  return (
    <Modal onClose={onClose}>
      <h3 className="text-lg font-medium text-[#1A2620] mb-4">{initial ? "Edit listing" : "New listing"}</h3>
      <div className="space-y-3">
        <Field label="Name"><input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price ($)"><input type="number" className="input" value={form.price} onChange={(e) => set("price", e.target.value)} /></Field>
          <Field label="Stock"><input type="number" className="input" value={form.stock} onChange={(e) => set("stock", e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category"><input className="input" value={form.category} onChange={(e) => set("category", e.target.value)} /></Field>
          <Field label="Emoji icon"><input className="input" value={form.emoji} onChange={(e) => set("emoji", e.target.value)} /></Field>
        </div>
        <Field label="Description">
          <textarea className="input" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
      </div>
      <button
        onClick={submit}
        className="w-full mt-5 py-2.5 rounded-lg text-sm font-medium text-white" style={{ background: "#B8763A" }}
      >
        {initial ? "Save changes" : "Publish listing"}
      </button>
    </Modal>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-xs text-[#5C6B62] mb-1">{label}</div>
      {children}
      <style>{`.input{width:100%;padding:8px 10px;border-radius:8px;border:1px solid #DDD5C2;font-size:14px;outline:none;}`}</style>
    </label>
  );
}

/* ---------------- ADMIN ---------------- */

function AdminView({ users, setUsers, products, setProducts, orders, log, flash }) {
  const [tab, setTab] = useState("users");
  const vendors = users.filter((u) => u.role === "vendor");
  const shoppers = users.filter((u) => u.role === "shopper");

  const toggleSuspend = (u) => {
    const next = u.status === "active" ? "suspended" : "active";
    setUsers((us) => us.map((x) => (x.id === u.id ? { ...x, status: next } : x)));
    log(`Priya Shah ${next === "suspended" ? "suspended" : "reactivated"} ${u.name}'s account`);
    flash(next === "suspended" ? "Account suspended" : "Account reactivated");
  };

  const removeListing = (p) => {
    setProducts((ps) => ps.filter((x) => x.id !== p.id));
    log(`Priya Shah removed listing "${p.name}"`);
    flash("Listing removed");
  };

  const vendorName = (id) => users.find((u) => u.id === id)?.name || "Unknown";

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl" style={{ fontFamily: "Georgia, serif", color: "#1A2620" }}>Market oversight</h2>
          <p className="text-sm text-[#5C6B62]">{users.length} accounts · {products.length} listings · {orders.length} orders</p>
        </div>
        <div className="flex gap-2">
          <TabButton active={tab === "users"} onClick={() => setTab("users")} icon={ClipboardList} label="Users" />
          <TabButton active={tab === "listings"} onClick={() => setTab("listings")} icon={Package} label="Listings" />
          <TabButton active={tab === "orders"} onClick={() => setTab("orders")} icon={ShieldCheck} label="Orders" />
        </div>
      </div>

      {tab === "users" && (
        <div className="rounded-xl border overflow-hidden bg-white" style={{ borderColor: "#DDD5C2" }}>
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between px-4 py-3 border-b last:border-b-0" style={{ borderColor: "#DDD5C2" }}>
              <div>
                <div className="text-sm font-medium text-[#1A2620]">{u.name}</div>
                <div className="text-xs text-[#8A9285]">{u.email} · {ROLE_STYLE[u.role].label}</div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    background: u.status === "active" ? "#E7F2E9" : "#F8E7E4",
                    color: u.status === "active" ? "#3C7A4C" : "#B65C4A",
                  }}
                >
                  {u.status}
                </span>
                {u.role !== "admin" && (
                  <button
                    onClick={() => toggleSuspend(u)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border"
                    style={{ borderColor: "#DDD5C2", color: "#5C6B62" }}
                  >
                    {u.status === "active" ? <Ban size={12} /> : <CheckCircle2 size={12} />}
                    {u.status === "active" ? "Suspend" : "Reactivate"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "listings" && (
        <div className="rounded-xl border overflow-hidden bg-white" style={{ borderColor: "#DDD5C2" }}>
          {products.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3 border-b last:border-b-0" style={{ borderColor: "#DDD5C2" }}>
              <div className="flex items-center gap-3">
                <span className="text-xl">{p.emoji}</span>
                <div>
                  <div className="text-sm font-medium text-[#1A2620]">{p.name}</div>
                  <div className="text-xs text-[#8A9285]">{vendorName(p.vendorId)} · {money(p.price)} · {p.stock} in stock</div>
                </div>
              </div>
              <button onClick={() => removeListing(p)}><Trash2 size={14} color="#B65C4A" /></button>
            </div>
          ))}
        </div>
      )}

      {tab === "orders" && (
        <div className="rounded-xl border overflow-hidden bg-white" style={{ borderColor: "#DDD5C2" }}>
          {orders.map((o) => (
            <div key={o.id} className="px-4 py-3 border-b last:border-b-0" style={{ borderColor: "#DDD5C2" }}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-mono text-[#1A2620]">#{o.id}</span>
                <span className="text-xs text-[#8A9285]">{o.date} · {money(o.total)}</span>
              </div>
              <div className="text-xs text-[#5C6B62]">
                {vendorName(o.shopperId)} · {o.items.map((i) => i.name).join(", ")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- SHARED ---------------- */

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="float-right"><X size={18} color="#8A9285" /></button>
        <div className="clear-both">{children}</div>
      </div>
    </div>
  );
}
