import { useState, useEffect, useMemo, createContext, useContext } from "react";
import {
  Store, ShoppingBag, ShieldCheck, Plus, Minus, Trash2, Pencil, X, LogOut,
  Package, ClipboardList, Ban, CheckCircle2, ArrowRight, MapPin, Search,
  Users, DollarSign, AlertTriangle, Truck, LayoutDashboard, Receipt,
  Activity, RotateCcw,
} from "lucide-react";

/* =====================================================================
   THE COMMONS MARKET — multi-role marketplace prototype
   Roles: Shopper · Vendor · Admin
   Data:  one shared localStorage "database" (users, products, orders,
          carts, activity). Open the app in 3 tabs, sign in as a
          different role in each, and watch changes sync live.
   Note:  passwords are stored in plain text — fine for a prototype,
          never do this in production.
===================================================================== */

/* ---------------------------------------------------------------
   PERSISTENT STATE (localStorage + live sync between tabs)
----------------------------------------------------------------*/
const PREFIX = "commons-v2:";

function readKey(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function usePersistentState(key, fallback) {
  const [value, setValue] = useState(() => readKey(key, fallback));

  useEffect(() => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      /* storage unavailable: app keeps working in memory */
    }
  }, [key, value]);

  // another tab changed this key -> adopt its value
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== PREFIX + key) return;
      if (e.newValue === null) return setValue(fallback);
      try {
        setValue(JSON.parse(e.newValue));
      } catch {
        /* ignore malformed data */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return [value, setValue];
}

/* ---------------------------------------------------------------
   HELPERS
----------------------------------------------------------------*/
const uid = (p) => `${p}-${Math.random().toString(36).slice(2, 9)}`;
const round2 = (n) => Math.round(n * 100) / 100;
const fmt = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const fmtDate = (ts) =>
  new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const DAY = 86400000;
const ago = (days, hours = 0) => Date.now() - days * DAY - hours * 3600000;

function timeAgo(ts) {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const SHIPPING_FLAT = 5.99;
const FREE_SHIPPING_OVER = 75;
const TAX_RATE = 0.08;

function priceOrder(subtotal) {
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_OVER ? 0 : SHIPPING_FLAT;
  const tax = round2(subtotal * TAX_RATE);
  return { subtotal: round2(subtotal), shipping, tax, total: round2(subtotal + shipping + tax) };
}

function orderStatus(o) {
  const s = o.items.map((i) => i.status);
  if (s.every((x) => x === "cancelled")) return "cancelled";
  const live = s.filter((x) => x !== "cancelled");
  if (live.every((x) => x === "delivered")) return "delivered";
  if (live.every((x) => x === "placed")) return "placed";
  return "in progress";
}

const STATUS = {
  placed: { bg: "#E8ECFF", fg: "#4F6BF6", label: "Placed" },
  shipped: { bg: "#FFEDE2", fg: "#E0561F", label: "Shipped" },
  delivered: { bg: "#DCFBEA", fg: "#0E8F5B", label: "Delivered" },
  cancelled: { bg: "#FFE5E7", fg: "#D93036", label: "Cancelled" },
  "in progress": { bg: "#FFEDE2", fg: "#E0561F", label: "In progress" },
  active: { bg: "#DCFBEA", fg: "#0E8F5B", label: "Active" },
  suspended: { bg: "#FFE5E7", fg: "#D93036", label: "Suspended" },
};

const ROLE = {
  shopper: { color: "#4F6BF6", tint: "#E8ECFF", label: "Shopper", icon: ShoppingBag },
  vendor: { color: "#E0561F", tint: "#FFEDE2", label: "Vendor", icon: Store },
  admin: { color: "#9B5DE5", tint: "#F3E8FF", label: "Admin", icon: ShieldCheck },
};

const CATEGORY_TINT = { Ceramics: "#FFD9C7", Coffee: "#FFE8A3", Stationery: "#CFE4FF" };
const TILE_PALETTE = ["#FFD9C7", "#FFE8A3", "#CFE4FF", "#E6DAFF", "#CDF5E1", "#FFD6E8"];
function tintFor(category) {
  if (CATEGORY_TINT[category]) return CATEGORY_TINT[category];
  let h = 0;
  for (const c of String(category)) h = (h * 31 + c.charCodeAt(0)) % 997;
  return TILE_PALETTE[h % TILE_PALETTE.length];
}
const EMOJI_PRESETS = ["🍶", "🥣", "🪴", "☕", "🫖", "📓", "🖋️", "🕯️", "🧶", "🍯", "🌿", "🎁", "🛍️", "🧴"];

/* ---------------------------------------------------------------
   SEED DATA (demo password for every account: demo123)
----------------------------------------------------------------*/
const seedUsers = [
  { id: "u-jordan", name: "Jordan Lee", email: "jordan@shopmail.com", password: "demo123", role: "shopper", status: "active", joined: ago(60), address: { name: "Jordan Lee", phone: "555-0142", address: "214 Maple Street, Apt 3B", city: "Portland", zip: "97205" } },
  { id: "u-amara", name: "Amara Khan", email: "amara@shopmail.com", password: "demo123", role: "shopper", status: "active", joined: ago(35), address: { name: "Amara Khan", phone: "555-0178", address: "88 Harbor Road", city: "Seattle", zip: "98101" } },
  { id: "u-sana", name: "Sana Osei", email: "sana@clayandkiln.com", password: "demo123", role: "vendor", status: "active", joined: ago(90), storeName: "Clay & Kiln" },
  { id: "u-theo", name: "Theo Marsh", email: "theo@nomadroasters.com", password: "demo123", role: "vendor", status: "active", joined: ago(75), storeName: "Nomad Roasters" },
  { id: "u-mina", name: "Mina Park", email: "mina@fieldnote.co", password: "demo123", role: "vendor", status: "active", joined: ago(50), storeName: "Fieldnote Paper Co." },
  { id: "u-priya", name: "Priya Shah", email: "priya@commonsmarket.io", password: "demo123", role: "admin", status: "active", joined: ago(120) },
];

const seedProducts = [
  { id: "p1", vendorId: "u-sana", name: "Speckled Stoneware Mug", price: 24, stock: 16, category: "Ceramics", emoji: "🍶", image: "", description: "Wheel-thrown mug in a warm speckled glaze. Holds 12 oz, dishwasher and microwave safe.", createdAt: ago(80) },
  { id: "p2", vendorId: "u-sana", name: "Fluted Serving Bowl", price: 58, stock: 5, category: "Ceramics", emoji: "🥣", image: "", description: "Wide fluted bowl for salads or as a centerpiece. Each piece is slightly different.", createdAt: ago(70) },
  { id: "p3", vendorId: "u-sana", name: "Terracotta Planter, Small", price: 19, stock: 25, category: "Ceramics", emoji: "🪴", image: "", description: "Unglazed terracotta pot with drainage hole, 4 in diameter.", createdAt: ago(60) },
  { id: "p4", vendorId: "u-sana", name: "Hand-Pinched Bud Vase", price: 32, stock: 11, category: "Ceramics", emoji: "🏺", image: "", description: "A small vase sized for one or two stems. Glazed inside to hold water.", createdAt: ago(20) },
  { id: "p5", vendorId: "u-theo", name: "Nomad Dark Roast, 12 oz", price: 16, stock: 39, category: "Coffee", emoji: "☕", image: "", description: "Single-origin Ethiopian beans, roasted weekly in small batches. Notes of cocoa and dried fruit.", createdAt: ago(70) },
  { id: "p6", vendorId: "u-theo", name: "Pour-Over Starter Kit", price: 45, stock: 8, category: "Coffee", emoji: "🫖", image: "", description: "Ceramic dripper, 40 filters, and a bag of medium roast to get you started.", createdAt: ago(55) },
  { id: "p7", vendorId: "u-theo", name: "Cold Brew Concentrate, 32 oz", price: 13, stock: 0, category: "Coffee", emoji: "🧊", image: "", description: "Slow-steeped concentrate. Dilute 1:1 over ice. Currently restocking.", createdAt: ago(40) },
  { id: "p8", vendorId: "u-theo", name: "House Espresso Blend, 12 oz", price: 18, stock: 30, category: "Coffee", emoji: "🫘", image: "", description: "A balanced blend with a caramel finish. Works for espresso and moka pot.", createdAt: ago(15) },
  { id: "p9", vendorId: "u-mina", name: "Dot-Grid Notebook", price: 14, stock: 58, category: "Stationery", emoji: "📓", image: "", description: "A5, 120 pages of 100gsm paper that handles fountain pen ink without bleeding.", createdAt: ago(45) },
  { id: "p10", vendorId: "u-mina", name: "Brass Fountain Pen", price: 32, stock: 11, category: "Stationery", emoji: "🖋️", image: "", description: "Solid brass body that patinas with use. Medium nib, takes standard cartridges.", createdAt: ago(44) },
  { id: "p11", vendorId: "u-mina", name: "Linen Cover Journal", price: 28, stock: 3, category: "Stationery", emoji: "📔", image: "", description: "Hand-bound with a natural linen cover and a ribbon bookmark.", createdAt: ago(30) },
  { id: "p12", vendorId: "u-mina", name: "Wax Seal Kit", price: 21, stock: 14, category: "Stationery", emoji: "🕯️", image: "", description: "Brass seal, three wax sticks and a melting spoon. Makes letters feel special.", createdAt: ago(10) },
];

function makeSeedOrders() {
  const price = (id) => seedProducts.find((p) => p.id === id);
  const line = (id, qty, status) => {
    const p = price(id);
    return { productId: p.id, name: p.name, emoji: p.emoji, vendorId: p.vendorId, qty, price: p.price, status };
  };
  const build = (id, user, items, days, payment) => {
    const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
    return { id, shopperId: user.id, shopperName: user.name, createdAt: ago(days), items, ...priceOrder(subtotal), shipTo: user.address, payment };
  };
  const [jordan, amara] = seedUsers;
  return [
    build("ORD-1003", jordan, [line("p6", 1, "placed"), line("p10", 1, "placed")], 1, "Card"),
    build("ORD-1002", amara, [line("p2", 1, "shipped"), line("p9", 2, "delivered")], 4, "Card"),
    build("ORD-1001", jordan, [line("p1", 2, "delivered"), line("p5", 1, "delivered")], 12, "Cash on delivery"),
  ];
}

// activity text is generated from the seeded orders so the totals always match
const seedActivity = (() => {
  const [o3, o2, o1] = makeSeedOrders();
  return [
    { id: "a4", ts: ago(1), text: `Jordan Lee placed ${o3.id} (${fmt(o3.total)})` },
    { id: "a3", ts: ago(4), text: `Amara Khan placed ${o2.id} (${fmt(o2.total)})` },
    { id: "a2", ts: ago(12), text: `Jordan Lee placed ${o1.id} (${fmt(o1.total)})` },
    { id: "a1", ts: ago(120), text: "Priya Shah opened The Commons Market" },
  ];
})();

function seedSnapshot() {
  return {
    users: seedUsers,
    products: seedProducts,
    orders: makeSeedOrders(),
    carts: {},
    activity: seedActivity,
  };
}

/* ---------------------------------------------------------------
   APP CONTEXT
----------------------------------------------------------------*/
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

export default function App() {
  const [users, setUsers] = usePersistentState("users", seedUsers);
  const [products, setProducts] = usePersistentState("products", seedProducts);
  const [orders, setOrders] = usePersistentState("orders", null);
  const [carts, setCarts] = usePersistentState("carts", {});
  const [activity, setActivity] = usePersistentState("activity", seedActivity);

  // session lives in sessionStorage: survives refresh, but each tab can be a different role
  const [sessionId, setSessionId] = useState(() => {
    try { return sessionStorage.getItem(PREFIX + "session"); } catch { return null; }
  });
  const [notice, setNotice] = useState("");
  const [toasts, setToasts] = useState([]);
  const [confirmCfg, setConfirmCfg] = useState(null);

  // first run: seed orders (they need timestamps computed at runtime)
  const ordersList = Array.isArray(orders) ? orders : null;
  useEffect(() => {
    if (!ordersList) setOrders(makeSeedOrders());
  }, [ordersList, setOrders]);
  const safeOrders = ordersList || [];

  const currentUser = users.find((u) => u.id === sessionId) || null;

  useEffect(() => {
    try {
      if (sessionId) sessionStorage.setItem(PREFIX + "session", sessionId);
      else sessionStorage.removeItem(PREFIX + "session");
    } catch { /* ignore */ }
  }, [sessionId]);

  // kicked out if suspended (or removed) while signed in, even from another tab
  useEffect(() => {
    if (sessionId && (!currentUser || currentUser.status === "suspended")) {
      setNotice("Your account has been suspended by an administrator.");
      setSessionId(null);
    }
  }, [sessionId, currentUser]);

  /* ---------- ui helpers ---------- */
  const toast = (text, type = "ok") => {
    const id = uid("t");
    setToasts((t) => [...t, { id, text, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  };
  const ask = (cfg) => setConfirmCfg(cfg);
  const log = (text) =>
    setActivity((a) => [{ id: uid("a"), ts: Date.now(), text }, ...a].slice(0, 60));

  const vendorOf = (id) => users.find((u) => u.id === id);
  const vendorActive = (id) => vendorOf(id)?.status === "active";
  const storeName = (id) => vendorOf(id)?.storeName || vendorOf(id)?.name || "Unknown store";

  /* ---------- auth ---------- */
  const login = (email, password) => {
    const u = users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u || u.password !== password) return "Incorrect email or password.";
    if (u.status === "suspended") return "This account has been suspended. Please contact an administrator.";
    setNotice("");
    setSessionId(u.id);
    return null;
  };

  const signup = ({ name, email, password, role, storeName: store }) => {
    if (!name.trim()) return "Please enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return "Please enter a valid email address.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (role === "vendor" && !store.trim()) return "Please enter a store name.";
    if (users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase()))
      return "An account with this email already exists.";
    const user = {
      id: uid("u"), name: name.trim(), email: email.trim(), password, role,
      status: "active", joined: Date.now(),
      ...(role === "vendor" ? { storeName: store.trim() } : {}),
    };
    setUsers((us) => [...us, user]);
    log(`${user.name} joined as a ${role}${role === "vendor" ? ` (${user.storeName})` : ""}`);
    setNotice("");
    setSessionId(user.id);
    return null;
  };

  const logout = () => {
    setToasts([]);
    setSessionId(null);
  };

  const resetDemo = () => {
    ask({
      title: "Reset demo data?",
      message: "This wipes every account, listing and order you created and restores the original demo data.",
      confirmLabel: "Reset everything",
      danger: true,
      onConfirm: () => {
        const snap = seedSnapshot();
        Object.entries(snap).forEach(([k, v]) => {
          try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch { /* ignore */ }
        });
        try { sessionStorage.removeItem(PREFIX + "session"); } catch { /* ignore */ }
        window.location.reload();
      },
    });
  };

  /* ---------- cart ---------- */
  const getCartLines = (userId) =>
    (carts[userId] || [])
      .map((i) => {
        const p = products.find((x) => x.id === i.productId);
        if (!p || !vendorActive(p.vendorId) || p.stock <= 0) return null;
        return { product: p, qty: Math.min(i.qty, p.stock) };
      })
      .filter(Boolean);

  const addToCart = (userId, product, qty = 1) => {
    const lines = carts[userId] || [];
    const have = lines.find((l) => l.productId === product.id)?.qty || 0;
    const canAdd = Math.min(qty, product.stock - have);
    if (canAdd <= 0) return toast(`You already have all ${product.stock} in your cart`, "error");
    setCarts((c) => {
      const cur = c[userId] || [];
      const exists = cur.some((l) => l.productId === product.id);
      const next = exists
        ? cur.map((l) => (l.productId === product.id ? { ...l, qty: l.qty + canAdd } : l))
        : [...cur, { productId: product.id, qty: canAdd }];
      return { ...c, [userId]: next };
    });
    toast(canAdd < qty ? `Added ${canAdd} — that's all we have` : `Added ${product.name} to cart`);
  };

  const setCartQty = (userId, product, qty) => {
    const q = Math.max(1, Math.min(product.stock, qty));
    setCarts((c) => ({
      ...c,
      [userId]: (c[userId] || []).map((l) => (l.productId === product.id ? { ...l, qty: q } : l)),
    }));
  };

  const removeFromCart = (userId, productId) =>
    setCarts((c) => ({ ...c, [userId]: (c[userId] || []).filter((l) => l.productId !== productId) }));

  /* ---------- orders ---------- */
  const placeOrder = (user, lines, shipTo, payment) => {
    for (const l of lines) {
      const p = products.find((x) => x.id === l.product.id);
      if (!p || !vendorActive(p.vendorId) || p.stock < l.qty)
        return { ok: false, error: `"${l.product.name}" just sold out or is no longer available. Please review your cart.` };
    }
    const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
    const nextNum = Math.max(1000, ...safeOrders.map((o) => parseInt(o.id.replace("ORD-", ""), 10) || 0)) + 1;
    const order = {
      id: `ORD-${nextNum}`, shopperId: user.id, shopperName: user.name, createdAt: Date.now(),
      items: lines.map((l) => ({
        productId: l.product.id, name: l.product.name, emoji: l.product.emoji,
        vendorId: l.product.vendorId, qty: l.qty, price: l.product.price, status: "placed",
      })),
      ...priceOrder(subtotal), shipTo, payment,
    };
    setOrders((os) => [order, ...(Array.isArray(os) ? os : [])]);
    setProducts((ps) =>
      ps.map((p) => {
        const l = lines.find((x) => x.product.id === p.id);
        return l ? { ...p, stock: p.stock - l.qty } : p;
      })
    );
    setUsers((us) => us.map((u) => (u.id === user.id ? { ...u, address: shipTo } : u)));
    setCarts((c) => ({ ...c, [user.id]: [] }));
    log(`${user.name} placed ${order.id} (${fmt(order.total)})`);
    return { ok: true, order };
  };

  const setItemStatus = (orderId, productId, next, actor) => {
    const order = safeOrders.find((o) => o.id === orderId);
    const item = order?.items.find((i) => i.productId === productId);
    if (!item || item.status === next) return;
    setOrders((os) =>
      os.map((o) =>
        o.id !== orderId ? o : { ...o, items: o.items.map((i) => (i.productId === productId ? { ...i, status: next } : i)) }
      )
    );
    if (next === "cancelled")
      setProducts((ps) => ps.map((p) => (p.id === productId ? { ...p, stock: p.stock + item.qty } : p)));
    log(`${actor} marked "${item.name}" in ${orderId} as ${next}`);
    toast(`${item.name} marked ${next}`);
  };

  /* ---------- products ---------- */
  const saveProduct = (vendor, data) => {
    if (data.id) {
      setProducts((ps) => ps.map((p) => (p.id === data.id ? { ...p, ...data } : p)));
      log(`${vendor.storeName} updated "${data.name}"`);
      toast("Listing updated");
    } else {
      const p = { ...data, id: uid("p"), vendorId: vendor.id, createdAt: Date.now() };
      setProducts((ps) => [p, ...ps]);
      log(`${vendor.storeName} listed "${p.name}" — live in the store now`);
      toast("Listing published");
    }
  };

  const deleteProduct = (product, actor) => {
    setProducts((ps) => ps.filter((p) => p.id !== product.id));
    log(`${actor} removed listing "${product.name}"`);
    toast("Listing removed");
  };

  /* ---------- admin ---------- */
  const toggleSuspend = (target, actor) => {
    const next = target.status === "active" ? "suspended" : "active";
    setUsers((us) => us.map((u) => (u.id === target.id ? { ...u, status: next } : u)));
    log(`${actor} ${next === "suspended" ? "suspended" : "reactivated"} ${target.name}'s account`);
    toast(next === "suspended" ? "Account suspended" : "Account reactivated");
  };

  const ctx = {
    users, products, orders: safeOrders, activity, currentUser, notice,
    toast, ask, log, vendorOf, vendorActive, storeName,
    login, signup, logout, resetDemo,
    getCartLines, addToCart, setCartQty, removeFromCart,
    placeOrder, setItemStatus, saveProduct, deleteProduct, toggleSuspend,
  };

  return (
    <AppCtx.Provider value={ctx}>
      <GlobalStyle />
      {currentUser ? <Shell user={currentUser} /> : <AuthScreen />}
      <Toasts toasts={toasts} />
      <ConfirmHost cfg={confirmCfg} close={() => setConfirmCfg(null)} />
    </AppCtx.Provider>
  );
}

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;600;700;800&display=swap');
      :root { color-scheme: light; --font-display: 'Fredoka', ui-rounded, 'Segoe UI', system-ui, sans-serif; }
      html, body { background: #FFF7ED; margin: 0; }
      body { font-family: 'Nunito', ui-rounded, 'Segoe UI', system-ui, sans-serif; color: #231942; }
      input, select, textarea, button { font-family: inherit; }
      ::selection { background: #FFD9C7; }
    `}</style>
  );
}

/* =====================================================================
   SHARED UI
===================================================================== */
const inputCls =
  "w-full px-3 py-2 rounded-lg border-2 border-[#E4DAFA] bg-white text-sm text-[#231942] outline-none focus:border-[#4F6BF6] placeholder:text-[#A9A1CC]";

function Btn({ tone = "#2B1D5C", variant = "solid", className = "", children, style: extra, ...rest }) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-full text-sm font-bold transition px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-105 active:translate-y-px ";
  const style =
    variant === "solid" ? { background: tone, color: "#fff", boxShadow: "0 3px 0 rgba(35,25,66,.22)" }
    : variant === "outline" ? { border: `2px solid ${tone}`, color: tone, background: "#fff" }
    : { color: tone };
  return <button className={base + className} style={{ ...style, ...extra }} {...rest}>{children}</button>;
}

function Badge({ kind }) {
  const s = STATUS[kind] || STATUS.placed;
  return (
    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="block">
      <div className="text-xs text-[#6A5F94] mb-1">{label}</div>
      {children}
      {error && <div className="text-xs text-[#D93036] mt-1">{error}</div>}
    </label>
  );
}

function Modal({ children, onClose, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className={`bg-white rounded-3xl p-6 w-full ${wide ? "max-w-lg" : "max-w-md"} max-h-[90vh] overflow-y-auto shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="float-right text-[#8B82B3] hover:text-[#231942]" aria-label="Close">
          <X size={18} />
        </button>
        <div className="clear-both">{children}</div>
      </div>
    </div>
  );
}

function Toasts({ toasts }) {
  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="px-4 py-2.5 rounded-lg shadow-lg text-sm flex items-center gap-2 text-[#FFF7ED]"
          style={{ background: t.type === "error" ? "#C93339" : "#2B1D5C" }}
        >
          {t.type === "error" ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />} {t.text}
        </div>
      ))}
    </div>
  );
}

function ConfirmHost({ cfg, close }) {
  if (!cfg) return null;
  return (
    <Modal onClose={close}>
      <h3 className="text-lg font-medium text-[#231942] mb-1">{cfg.title}</h3>
      <p className="text-sm text-[#6A5F94] mb-5">{cfg.message}</p>
      <div className="flex justify-end gap-2">
        <Btn tone="#6A5F94" variant="outline" onClick={close}>Cancel</Btn>
        <Btn
          tone={cfg.danger ? "#D93036" : "#2B1D5C"}
          onClick={() => { close(); cfg.onConfirm(); }}
        >
          {cfg.confirmLabel || "Confirm"}
        </Btn>
      </div>
    </Modal>
  );
}

function Empty({ icon: Icon, title, hint }) {
  return (
    <div className="text-center py-14 px-4 border border-dashed border-[#E4DAFA] rounded-2xl bg-white/50">
      <Icon size={26} className="mx-auto mb-2 text-[#A9A1CC]" />
      <div className="text-sm font-medium text-[#231942]">{title}</div>
      {hint && <div className="text-xs text-[#8B82B3] mt-1">{hint}</div>}
    </div>
  );
}

function Tabs({ tabs, value, onChange, tone = "#2B1D5C" }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tabs.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition"
            style={{
              background: active ? tone : "#fff",
              color: active ? "#fff" : "#6A5F94",
              borderColor: active ? tone : "#E4DAFA",
            }}
          >
            {t.icon && <t.icon size={13} />} {t.label}
            {t.badge > 0 && (
              <span className="ml-0.5 text-[10px] px-1.5 rounded-full" style={{ background: active ? "rgba(255,255,255,.25)" : "#F3EEFF" }}>
                {t.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone, hint }) {
  return (
    <div className="rounded-2xl p-4 border-2" style={{ background: tone + "14", borderColor: tone + "55" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold" style={{ color: "#6A5F94" }}>{label}</span>
        <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: tone }}>
          <Icon size={15} color="#fff" />
        </span>
      </div>
      <div className="text-3xl" style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "#231942" }}>{value}</div>
      {hint && <div className="text-[11px] mt-0.5" style={{ color: "#8B82B3" }}>{hint}</div>}
    </div>
  );
}

function ProductTile({ product, className = "h-32 text-4xl" }) {
  const [failed, setFailed] = useState(false);
  const tint = tintFor(product.category);
  return (
    <div className={`flex items-center justify-center rounded-lg overflow-hidden ${className}`} style={{ background: tint }}>
      {product.image && !failed ? (
        <img src={product.image} alt={product.name} className="w-full h-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <span>{product.emoji}</span>
      )}
    </div>
  );
}

function Qty({ value, max, onChange }) {
  return (
    <div className="inline-flex items-center border-2 border-[#E4DAFA] rounded-lg bg-white">
      <button className="px-2 py-1.5 disabled:opacity-30" disabled={value <= 1} onClick={() => onChange(value - 1)} aria-label="Decrease">
        <Minus size={13} />
      </button>
      <span className="w-8 text-center text-sm font-bold tabular-nums">{value}</span>
      <button className="px-2 py-1.5 disabled:opacity-30" disabled={value >= max} onClick={() => onChange(value + 1)} aria-label="Increase">
        <Plus size={13} />
      </button>
    </div>
  );
}

/* =====================================================================
   AUTH SCREEN
===================================================================== */
function AuthScreen() {
  const { login, signup, notice, resetDemo } = useApp();
  const [mode, setMode] = useState("signin");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "shopper", storeName: "" });
  const [error, setError] = useState("");
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setError(""); };

  const submit = (e) => {
    e.preventDefault();
    const err = mode === "signin" ? login(form.email, form.password) : signup(form);
    if (err) setError(err);
  };

  const demos = [
    { role: "shopper", name: "Jordan Lee", email: "jordan@shopmail.com", note: "Has past orders", emoji: "🛍️" },
    { role: "vendor", name: "Sana Osei", email: "sana@clayandkiln.com", note: "Clay & Kiln", emoji: "🏺" },
    { role: "vendor", name: "Theo Marsh", email: "theo@nomadroasters.com", note: "Nomad Roasters", emoji: "☕" },
    { role: "admin", name: "Priya Shah", email: "priya@commonsmarket.io", note: "Platform admin", emoji: "🛡️" },
  ];

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div
        className="relative overflow-hidden p-8 md:p-12 flex flex-col justify-between"
        style={{ background: "linear-gradient(135deg,#4F6BF6 0%,#9B5DE5 55%,#FF7A3D 130%)" }}
      >
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full" style={{ background: "rgba(255,255,255,.18)" }} />
        <div className="absolute bottom-32 -left-20 w-60 h-60 rounded-full" style={{ background: "rgba(255,209,102,.35)" }} />
        <div className="absolute top-1/2 right-10 w-24 h-24 rounded-full" style={{ background: "rgba(255,122,61,.45)" }} />

        <div className="relative">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold tracking-wide"
            style={{ background: "rgba(255,255,255,.22)", color: "#fff" }}
          >
            <span>🧺</span> THE COMMONS MARKET
          </div>
          <h1 className="mt-8 text-5xl md:text-6xl leading-[1.05]" style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "#fff" }}>
            Shop it.<br />Sell it.<br />Run it.
          </h1>
          <p className="mt-4 text-base max-w-sm" style={{ color: "rgba(255,255,255,.92)" }}>
            One little marketplace, three counters: shoppers buy, vendors sell, admins keep it fair.
          </p>
        </div>

        <div className="relative mt-10">
          <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,.9)" }}>
            Jump in with a demo account
          </div>
          <div className="grid grid-cols-2 gap-3">
            {demos.map((d) => {
              const R = ROLE[d.role];
              return (
                <button
                  key={d.email}
                  onClick={() => { const err = login(d.email, "demo123"); if (err) setError(err); }}
                  className="text-left rounded-2xl p-3 bg-white transition hover:-translate-y-0.5"
                  style={{ boxShadow: "0 4px 0 rgba(35,25,66,.25)" }}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: R.tint }}>
                      {d.emoji}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: R.color }}>{R.label}</div>
                      <div className="text-sm font-bold truncate" style={{ color: "#231942" }}>{d.name}</div>
                      <div className="text-[11px] truncate" style={{ color: "#8B82B3" }}>{d.note}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] mt-3" style={{ color: "rgba(255,255,255,.85)" }}>
            Tip: open this page in three tabs, sign in as a different role in each, and watch changes appear live.
          </p>
        </div>
      </div>

      <div className="p-6 md:p-12 flex items-center justify-center" style={{ background: "linear-gradient(180deg,#FFF7ED,#F5EEFF)" }}>
        <form
          onSubmit={submit}
          className="w-full max-w-sm bg-white rounded-3xl p-6 border-2"
          style={{ borderColor: "#E4DAFA", boxShadow: "0 8px 0 #E4DAFA" }}
        >
          <h2 className="text-2xl" style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "#231942" }}>
            {mode === "signin" ? "Welcome back 👋" : "Join the market ✨"}
          </h2>
          <p className="text-sm mb-5" style={{ color: "#6A5F94" }}>
            {mode === "signin" ? "Sign in to pick up where you left off." : "Make an account in under a minute."}
          </p>

          <div className="flex gap-1 p-1 rounded-full mb-5" style={{ background: "#F3EEFF" }}>
            {[["signin", "Sign in"], ["signup", "Create account"]].map(([id, label]) => (
              <button
                type="button" key={id}
                onClick={() => { setMode(id); setError(""); }}
                className="flex-1 py-1.5 text-sm rounded-full transition font-bold"
                style={{
                  background: mode === id ? "#4F6BF6" : "transparent",
                  color: mode === id ? "#fff" : "#6A5F94",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {notice && (
            <div className="mb-4 text-xs rounded-xl px-3 py-2 flex gap-2" style={{ background: "#FFEDE2", color: "#9A3A0E" }}>
              <AlertTriangle size={14} className="shrink-0 mt-px" /> {notice}
            </div>
          )}

          <div className="space-y-3">
            {mode === "signup" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {["shopper", "vendor"].map((r) => {
                    const R = ROLE[r];
                    const on = form.role === r;
                    return (
                      <button
                        type="button" key={r} onClick={() => set("role", r)}
                        className="rounded-2xl p-3 text-left border-2 transition"
                        style={{ background: on ? R.tint : "#fff", borderColor: on ? R.color : "#E4DAFA" }}
                      >
                        <R.icon size={18} color={R.color} />
                        <div className="text-sm font-bold mt-1" style={{ color: "#231942" }}>
                          {r === "shopper" ? "I want to buy" : "I want to sell"}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <Field label="Full name">
                  <input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} />
                </Field>
                {form.role === "vendor" && (
                  <Field label="Store name">
                    <input className={inputCls} value={form.storeName} onChange={(e) => set("storeName", e.target.value)} />
                  </Field>
                )}
              </>
            )}
            <Field label="Email">
              <input type="email" className={inputCls} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" />
            </Field>
            <Field label="Password">
              <input type="password" className={inputCls} value={form.password} onChange={(e) => set("password", e.target.value)} placeholder={mode === "signup" ? "At least 6 characters" : ""} />
            </Field>
          </div>

          {error && (
            <div className="mt-3 text-xs flex gap-1.5" style={{ color: "#D93036" }}>
              <AlertTriangle size={13} className="shrink-0 mt-px" />{error}
            </div>
          )}

          <Btn type="submit" tone="#4F6BF6" className="w-full mt-5 py-2.5">
            {mode === "signin" ? "Sign in" : "Create account"} <ArrowRight size={15} />
          </Btn>

          <button type="button" onClick={resetDemo} className="mx-auto mt-5 flex items-center gap-1 text-[11px] hover:underline" style={{ color: "#8B82B3" }}>
            <RotateCcw size={11} /> Reset demo data
          </button>
        </form>
      </div>
    </div>
  );
}

/* =====================================================================
   SHELL
===================================================================== */
function Shell({ user }) {
  const { logout, activity } = useApp();
  const R = ROLE[user.role];
  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg,#FFF7ED 0%,#F5EEFF 100%)" }}>
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 bg-white border-b-2" style={{ borderColor: "#E4DAFA" }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
            style={{ background: "linear-gradient(135deg,#4F6BF6,#9B5DE5)" }}
          >
            🧺
          </div>
          <span className="text-xl" style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "#2B1D5C" }}>
            Commons Market
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{ background: R.color, color: "#fff", boxShadow: "0 3px 0 rgba(35,25,66,.22)" }}
          >
            <R.icon size={13} /> {R.label} · {user.storeName || user.name}
          </div>
          <Btn tone="#6A5F94" variant="outline" className="!py-1.5 !text-xs" onClick={logout}>
            <LogOut size={13} /> Sign out
          </Btn>
        </div>
      </header>

      <div style={{ background: "#2B1D5C" }}>
        <div className="px-4 sm:px-6 py-2 flex items-center gap-3 overflow-x-auto whitespace-nowrap text-xs" style={{ color: "#E9E2FF" }}>
          <span className="flex items-center gap-1 uppercase tracking-wider text-[10px] font-bold shrink-0" style={{ color: "#FFD166" }}>
            <Activity size={11} /> Live ledger
          </span>
          {activity.slice(0, 6).map((a) => (
            <span key={a.id} className="shrink-0 flex items-center gap-2">
              <span style={{ color: "#9B5DE5" }}>●</span>
              <span>{a.text}</span>
              <span style={{ color: "#A9A1CC" }}>{timeAgo(a.ts)}</span>
            </span>
          ))}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {user.role === "shopper" && <ShopperView user={user} />}
        {user.role === "vendor" && <VendorView user={user} />}
        {user.role === "admin" && <AdminView user={user} />}
      </main>
    </div>
  );
}

/* =====================================================================
   SHOPPER
===================================================================== */
function ShopperView({ user }) {
  const { orders, getCartLines } = useApp();
  const [tab, setTab] = useState("store");
  const [cartOpen, setCartOpen] = useState(false);
  const lines = getCartLines(user.id);
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const myOrders = orders.filter((o) => o.shopperId === user.id);

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <Tabs
          tone={ROLE.shopper.color} value={tab} onChange={setTab}
          tabs={[
            { id: "store", label: "Shop", icon: ShoppingBag },
            { id: "orders", label: "My orders", icon: Receipt, badge: myOrders.length },
          ]}
        />
        <Btn tone={ROLE.shopper.color} onClick={() => setCartOpen(true)}>
          <ShoppingBag size={15} /> Cart · {count}
        </Btn>
      </div>

      {tab === "store" && <Storefront user={user} />}
      {tab === "orders" && <MyOrders user={user} orders={myOrders} goShop={() => setTab("store")} />}

      {cartOpen && (
        <CartDrawer
          user={user}
          onClose={() => setCartOpen(false)}
          onDone={() => { setCartOpen(false); setTab("orders"); }}
        />
      )}
    </>
  );
}

function Storefront({ user }) {
  const { products, vendorActive, storeName, addToCart } = useApp();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("newest");
  const [open, setOpen] = useState(null);

  const live = products.filter((p) => vendorActive(p.vendorId));
  const categories = ["All", ...Array.from(new Set(live.map((p) => p.category)))];

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = live.filter(
      (p) =>
        (category === "All" || p.category === category) &&
        (!q || [p.name, p.category, p.description, storeName(p.vendorId)].join(" ").toLowerCase().includes(q))
    );
    const sorters = {
      newest: (a, b) => b.createdAt - a.createdAt,
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return list.sort(sorters[sort]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, query, category, sort]);

  // keep the open modal in sync with live data
  const openProduct = open ? products.find((p) => p.id === open) : null;

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 mb-6" style={{ background: "linear-gradient(120deg,#4F6BF6,#9B5DE5 60%,#FF7A3D)" }}>
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full" style={{ background: "rgba(255,255,255,.18)" }} />
        <div className="absolute right-24 -bottom-12 w-32 h-32 rounded-full" style={{ background: "rgba(255,209,102,.35)" }} />
        <div className="relative">
          <h2 className="text-3xl sm:text-4xl" style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "#fff" }}>
            Fresh finds from local makers 🧺
          </h2>
          <p className="mt-1 text-sm sm:text-base" style={{ color: "rgba(255,255,255,.92)" }}>
            {shown.length} {shown.length === 1 ? "item" : "items"} · free shipping on orders over {fmt(FREE_SHIPPING_OVER)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-[#E4DAFA] bg-white flex-1 min-w-[200px]">
          <Search size={14} color="#8B82B3" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products or stores" className="text-sm outline-none w-full bg-transparent" />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className={inputCls + " !w-auto"}>
          <option value="newest">Newest</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-6">
        {categories.map((c) => (
          <button
            key={c} onClick={() => setCategory(c)}
            className="px-3 py-1 rounded-full text-xs border transition"
            style={{ background: category === c ? "#2B1D5C" : "#fff", color: category === c ? "#fff" : "#6A5F94", borderColor: category === c ? "#2B1D5C" : "#E4DAFA" }}
          >
            {c}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <Empty icon={Search} title="Nothing matches that search" hint="Try a different word or clear the category filter." />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {shown.map((p) => (
            <div key={p.id} className="rounded-2xl border-2 border-[#E4DAFA] bg-white p-3 flex flex-col hover:-translate-y-1 hover:shadow-lg transition">
              <button onClick={() => setOpen(p.id)} className="text-left">
                <ProductTile product={p} />
                <div className="mt-3 text-sm font-medium text-[#231942] leading-snug">{p.name}</div>
                <div className="text-xs text-[#8B82B3]">{storeName(p.vendorId)}</div>
              </button>
              <div className="flex items-center justify-between mt-3">
                <span className="font-bold tabular-nums text-sm text-[#231942]">{fmt(p.price)}</span>
                <span className="text-[11px]" style={{ color: p.stock === 0 ? "#D93036" : p.stock <= 5 ? "#E0561F" : "#8B82B3" }}>
                  {p.stock === 0 ? "Sold out" : p.stock <= 5 ? `Only ${p.stock} left` : "In stock"}
                </span>
              </div>
              <Btn tone={ROLE.shopper.color} className="mt-3 !py-1.5" disabled={p.stock === 0} onClick={() => addToCart(user.id, p, 1)}>
                <Plus size={14} /> Add to cart
              </Btn>
            </div>
          ))}
        </div>
      )}

      {openProduct && <ProductModal user={user} product={openProduct} onClose={() => setOpen(null)} />}
    </>
  );
}

function ProductModal({ user, product, onClose }) {
  const { addToCart, storeName } = useApp();
  const [qty, setQty] = useState(1);
  return (
    <Modal onClose={onClose}>
      <ProductTile product={product} className="h-44 text-6xl mb-4" />
      <div className="text-xs text-[#8B82B3] mb-0.5">{product.category} · Sold by {storeName(product.vendorId)}</div>
      <h3 className="text-xl text-[#231942]" style={{ fontFamily: "var(--font-display)" }}>{product.name}</h3>
      <p className="text-sm text-[#6A5F94] my-3">{product.description}</p>
      <div className="flex items-center justify-between mb-4">
        <span className="font-bold tabular-nums text-xl text-[#231942]">{fmt(product.price)}</span>
        <span className="text-xs" style={{ color: product.stock === 0 ? "#D93036" : "#6A5F94" }}>
          {product.stock === 0 ? "Sold out" : `${product.stock} in stock`}
        </span>
      </div>
      {product.stock > 0 ? (
        <div className="flex items-center gap-3">
          <Qty value={qty} max={product.stock} onChange={setQty} />
          <Btn tone={ROLE.shopper.color} className="flex-1" onClick={() => { addToCart(user.id, product, qty); onClose(); }}>
            Add to cart · {fmt(product.price * qty)}
          </Btn>
        </div>
      ) : (
        <div className="text-sm text-[#D93036] text-center py-2 rounded-lg bg-[#FFE5E7]">This item is currently sold out.</div>
      )}
    </Modal>
  );
}

function CartDrawer({ user, onClose, onDone }) {
  const { getCartLines, setCartQty, removeFromCart, storeName } = useApp();
  const [checkout, setCheckout] = useState(false);
  const lines = getCartLines(user.id);
  const totals = priceOrder(lines.reduce((s, l) => s + l.product.price * l.qty, 0));
  const toFree = Math.max(0, FREE_SHIPPING_OVER - totals.subtotal);

  if (checkout)
    return <CheckoutModal user={user} lines={lines} totals={totals} onBack={() => setCheckout(false)} onClose={onClose} onDone={onDone} />;

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-end z-40" onClick={onClose}>
      <div className="w-full max-w-md bg-[#FFF7ED] h-full p-6 overflow-y-auto flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl text-[#231942]" style={{ fontFamily: "var(--font-display)" }}>Your cart</h3>
          <button onClick={onClose} aria-label="Close"><X size={18} color="#8B82B3" /></button>
        </div>

        {lines.length === 0 ? (
          <Empty icon={ShoppingBag} title="Your cart is empty" hint="Add something from the market and it will show up here." />
        ) : (
          <>
            <div className="space-y-3 flex-1">
              {lines.map((l) => (
                <div key={l.product.id} className="flex gap-3 p-3 rounded-2xl bg-white border-2 border-[#E4DAFA]">
                  <ProductTile product={l.product} className="w-16 h-16 text-2xl shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#231942] truncate">{l.product.name}</div>
                    <div className="text-xs text-[#8B82B3] mb-2">{storeName(l.product.vendorId)} · {fmt(l.product.price)}</div>
                    <div className="flex items-center justify-between">
                      <Qty value={l.qty} max={l.product.stock} onChange={(q) => setCartQty(user.id, l.product, q)} />
                      <span className="font-bold tabular-nums text-sm">{fmt(l.product.price * l.qty)}</span>
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(user.id, l.product.id)} className="self-start" aria-label="Remove">
                    <Trash2 size={14} color="#D93036" />
                  </button>
                </div>
              ))}
            </div>

            {toFree > 0 && (
              <div className="mt-4 text-xs text-[#6A5F94] bg-[#F3EEFF] rounded-lg px-3 py-2">
                Add <b>{fmt(toFree)}</b> more for free shipping.
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-[#E4DAFA] space-y-1.5 text-sm">
              <Row label="Subtotal" value={fmt(totals.subtotal)} />
              <Row label="Shipping" value={totals.shipping === 0 ? "Free" : fmt(totals.shipping)} />
              <Row label={`Tax (${TAX_RATE * 100}%)`} value={fmt(totals.tax)} />
              <div className="flex justify-between pt-2 mt-2 border-t border-[#E4DAFA] font-medium text-[#231942]">
                <span>Total</span><span className="font-bold tabular-nums">{fmt(totals.total)}</span>
              </div>
            </div>
            <Btn tone={ROLE.shopper.color} className="w-full mt-4 py-2.5" onClick={() => setCheckout(true)}>
              Checkout <ArrowRight size={15} />
            </Btn>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-[#6A5F94]">
      <span>{label}</span><span className="font-bold tabular-nums">{value}</span>
    </div>
  );
}

function CheckoutModal({ user, lines, totals, onBack, onClose, onDone }) {
  const { placeOrder, toast } = useApp();
  const saved = user.address || {};
  const [form, setForm] = useState({
    name: saved.name || user.name, phone: saved.phone || "", address: saved.address || "",
    city: saved.city || "", zip: saved.zip || "",
  });
  const [payment, setPayment] = useState("Card");
  const [errors, setErrors] = useState({});
  const [placed, setPlaced] = useState(null);
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: "" })); };

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = "Required";
    if (!form.address.trim()) errs.address = "Required";
    if (!form.city.trim()) errs.city = "Required";
    if (!/^[\w\s-]{3,10}$/.test(form.zip.trim())) errs.zip = "Enter a valid postal code";
    if (form.phone && !/^[\d\s()+-]{6,20}$/.test(form.phone)) errs.phone = "Enter a valid phone number";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const res = placeOrder(user, lines, form, payment);
    if (!res.ok) return toast(res.error, "error");
    setPlaced(res.order);
  };

  if (placed)
    return (
      <Modal onClose={onDone}>
        <div className="text-center py-4">
          <CheckCircle2 size={44} className="mx-auto mb-3" color="#0E8F5B" />
          <h3 className="text-xl text-[#231942]" style={{ fontFamily: "var(--font-display)" }}>Order placed</h3>
          <p className="text-sm text-[#6A5F94] mt-1">
            <span className="font-bold tabular-nums">{placed.id}</span> · {fmt(placed.total)} · {placed.payment}
          </p>
          <p className="text-xs text-[#8B82B3] mt-3">The vendors have been notified. Track each item's progress under My orders.</p>
          <Btn tone={ROLE.shopper.color} className="mt-5" onClick={onDone}>View my orders</Btn>
        </div>
      </Modal>
    );

  return (
    <Modal onClose={onClose} wide>
      <h3 className="text-xl text-[#231942] mb-4" style={{ fontFamily: "var(--font-display)" }}>Checkout</h3>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full name" error={errors.name}><input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Phone (optional)" error={errors.phone}><input className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        </div>
        <Field label="Street address" error={errors.address}><input className={inputCls} value={form.address} onChange={(e) => set("address", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="City" error={errors.city}><input className={inputCls} value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
          <Field label="Postal code" error={errors.zip}><input className={inputCls} value={form.zip} onChange={(e) => set("zip", e.target.value)} /></Field>
        </div>

        <div>
          <div className="text-xs text-[#6A5F94] mb-1">Payment (simulated — no real charge)</div>
          <div className="grid grid-cols-2 gap-2">
            {["Card", "Cash on delivery"].map((p) => (
              <button
                type="button" key={p} onClick={() => setPayment(p)}
                className="rounded-lg p-2.5 text-sm border transition"
                style={{ background: payment === p ? ROLE.shopper.tint : "#fff", borderColor: payment === p ? ROLE.shopper.color : "#E4DAFA" }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-3 mt-1 border-t border-[#E4DAFA] text-sm space-y-1">
          <Row label={`${lines.reduce((n, l) => n + l.qty, 0)} items`} value={fmt(totals.subtotal)} />
          <Row label="Shipping" value={totals.shipping === 0 ? "Free" : fmt(totals.shipping)} />
          <Row label="Tax" value={fmt(totals.tax)} />
          <div className="flex justify-between font-medium text-[#231942] pt-1"><span>Total</span><span className="font-bold tabular-nums">{fmt(totals.total)}</span></div>
        </div>

        <div className="flex gap-2 pt-1">
          <Btn type="button" tone="#6A5F94" variant="outline" onClick={onBack}>Back</Btn>
          <Btn type="submit" tone={ROLE.shopper.color} className="flex-1">Place order · {fmt(totals.total)}</Btn>
        </div>
      </form>
    </Modal>
  );
}

function MyOrders({ user, orders, goShop }) {
  const { setItemStatus, ask } = useApp();
  if (orders.length === 0)
    return (
      <div>
        <Empty icon={Receipt} title="No orders yet" hint="When you place an order, you can follow it here." />
        <div className="text-center mt-4"><Btn tone={ROLE.shopper.color} onClick={goShop}>Start shopping</Btn></div>
      </div>
    );

  return (
    <div className="space-y-4">
      {orders.map((o) => (
        <div key={o.id} className="rounded-2xl border-2 border-[#E4DAFA] bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-[#F3EEFF] flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="font-bold tabular-nums text-sm text-[#231942]">{o.id}</span>
              <span className="text-xs text-[#8B82B3]">{fmtDate(o.createdAt)}</span>
            </div>
            <Badge kind={orderStatus(o)} />
          </div>
          <div className="divide-y divide-[#EFE8FF]">
            {o.items.map((i) => (
              <div key={i.productId} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl">{i.emoji}</span>
                  <div className="min-w-0">
                    <div className="text-sm text-[#231942] truncate">{i.name}</div>
                    <div className="text-xs text-[#8B82B3]">{i.qty} × {fmt(i.price)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge kind={i.status} />
                  {i.status === "placed" && (
                    <button
                      className="text-xs text-[#D93036] hover:underline"
                      onClick={() =>
                        ask({
                          title: "Cancel this item?",
                          message: `"${i.name}" will be cancelled and returned to stock.`,
                          confirmLabel: "Cancel item", danger: true,
                          onConfirm: () => setItemStatus(o.id, i.productId, "cancelled", user.name),
                        })
                      }
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-[#EFE8FF] flex items-end justify-between gap-4 flex-wrap text-xs text-[#6A5F94]">
            <div>
              <div className="flex items-center gap-1 text-[#231942] mb-0.5"><Truck size={12} /> Ships to</div>
              {o.shipTo.name}, {o.shipTo.address}, {o.shipTo.city} {o.shipTo.zip}
            </div>
            <div className="text-right">
              <div>Shipping {o.shipping === 0 ? "free" : fmt(o.shipping)} · Tax {fmt(o.tax)} · {o.payment}</div>
              <div className="text-sm text-[#231942] font-medium mt-0.5">Total <span className="font-bold tabular-nums">{fmt(o.total)}</span></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* =====================================================================
   VENDOR
===================================================================== */
function VendorView({ user }) {
  const { products, orders } = useApp();
  const [tab, setTab] = useState("overview");

  const mine = products.filter((p) => p.vendorId === user.id);
  const myOrders = orders
    .map((o) => ({ order: o, items: o.items.filter((i) => i.vendorId === user.id) }))
    .filter((x) => x.items.length);
  const toShip = myOrders.reduce((n, x) => n + x.items.filter((i) => i.status === "placed").length, 0);

  return (
    <>
      <div className="mb-6">
        <h2 className="text-3xl text-[#231942]" style={{ fontFamily: "var(--font-display)" }}>{user.storeName}</h2>
        <p className="text-sm text-[#6A5F94]">Vendor dashboard · {user.name}</p>
      </div>
      <div className="mb-6">
        <Tabs
          tone={ROLE.vendor.color} value={tab} onChange={setTab}
          tabs={[
            { id: "overview", label: "Overview", icon: LayoutDashboard },
            { id: "products", label: "Products", icon: Package, badge: mine.length },
            { id: "orders", label: "Orders", icon: ClipboardList, badge: toShip },
          ]}
        />
      </div>
      {tab === "overview" && <VendorOverview mine={mine} myOrders={myOrders} goTo={setTab} />}
      {tab === "products" && <VendorProducts user={user} mine={mine} />}
      {tab === "orders" && <VendorOrders user={user} myOrders={myOrders} />}
    </>
  );
}

function VendorOverview({ mine, myOrders, goTo }) {
  const revenue = myOrders.reduce(
    (s, x) => s + x.items.filter((i) => i.status !== "cancelled").reduce((a, i) => a + i.qty * i.price, 0), 0
  );
  const toShip = myOrders.reduce((n, x) => n + x.items.filter((i) => i.status === "placed").length, 0);
  const low = mine.filter((p) => p.stock <= 5).sort((a, b) => a.stock - b.stock);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Revenue" value={fmt(revenue)} icon={DollarSign} tone="#0E8F5B" hint="excludes cancelled" />
        <StatCard label="Orders" value={myOrders.length} icon={ClipboardList} tone="#4F6BF6" />
        <StatCard label="Waiting to ship" value={toShip} icon={Truck} tone="#E0561F" />
        <StatCard label="Active listings" value={mine.length} icon={Package} tone="#9B5DE5" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border-2 border-[#E4DAFA] bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[#231942]">Stock alerts</h3>
            <button className="text-xs text-[#E0561F]" onClick={() => goTo("products")}>Manage</button>
          </div>
          {low.length === 0 ? (
            <p className="text-sm text-[#8B82B3]">All products are comfortably stocked.</p>
          ) : (
            <div className="space-y-2">
              {low.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-[#231942]">{p.emoji} {p.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: p.stock === 0 ? "#FFE5E7" : "#FFEDE2", color: p.stock === 0 ? "#D93036" : "#E0561F" }}>
                    {p.stock === 0 ? "Sold out" : `${p.stock} left`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border-2 border-[#E4DAFA] bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[#231942]">Recent orders</h3>
            <button className="text-xs text-[#E0561F]" onClick={() => goTo("orders")}>View all</button>
          </div>
          {myOrders.length === 0 ? (
            <p className="text-sm text-[#8B82B3]">No orders yet.</p>
          ) : (
            <div className="space-y-2">
              {myOrders.slice(0, 4).map(({ order, items }) => (
                <div key={order.id} className="flex items-center justify-between text-sm">
                  <span><span className="font-bold tabular-nums text-[#231942]">{order.id}</span> <span className="text-xs text-[#8B82B3]">{order.shopperName}</span></span>
                  <span className="font-bold tabular-nums text-xs">{fmt(items.reduce((a, i) => a + i.qty * i.price, 0))}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VendorProducts({ user, mine }) {
  const { deleteProduct, ask } = useApp();
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");
  const list = mine.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-[#E4DAFA] bg-white flex-1 min-w-[200px]">
          <Search size={14} color="#8B82B3" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your products" className="text-sm outline-none w-full bg-transparent" />
        </div>
        <Btn tone={ROLE.vendor.color} onClick={() => setEditing("new")}><Plus size={15} /> Add product</Btn>
      </div>

      {list.length === 0 ? (
        <Empty icon={Package} title={mine.length ? "No products match" : "No listings yet"} hint={mine.length ? "" : "Add your first product and it goes live in the shopper store instantly."} />
      ) : (
        <div className="rounded-2xl border-2 border-[#E4DAFA] overflow-hidden bg-white divide-y divide-[#EFE8FF]">
          {list.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <ProductTile product={p} className="w-12 h-12 text-xl shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#231942] truncate">{p.name}</div>
                  <div className="text-xs text-[#8B82B3]">{p.category} · {fmt(p.price)}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: p.stock === 0 ? "#FFE5E7" : p.stock <= 5 ? "#FFEDE2" : "#F3EEFF", color: p.stock === 0 ? "#D93036" : p.stock <= 5 ? "#E0561F" : "#6A5F94" }}>
                  {p.stock === 0 ? "Sold out" : `${p.stock} in stock`}
                </span>
                <button onClick={() => setEditing(p)} aria-label="Edit"><Pencil size={15} color="#6A5F94" /></button>
                <button
                  aria-label="Delete"
                  onClick={() =>
                    ask({
                      title: "Remove this listing?",
                      message: `"${p.name}" will disappear from the store. Past orders keep their record.`,
                      confirmLabel: "Remove", danger: true,
                      onConfirm: () => deleteProduct(p, user.storeName),
                    })
                  }
                >
                  <Trash2 size={15} color="#D93036" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <ProductForm user={user} initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function ProductForm({ user, initial, onClose }) {
  const { saveProduct, products } = useApp();
  const [form, setForm] = useState(
    initial ? { ...initial, price: String(initial.price), stock: String(initial.stock) }
      : { name: "", price: "", stock: "", category: "", emoji: "🛍️", image: "", description: "" }
  );
  const [errors, setErrors] = useState({});
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: "" })); };
  const categories = Array.from(new Set(products.map((p) => p.category)));

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = "Give your product a name";
    if (!(Number(form.price) > 0)) errs.price = "Enter a price above 0";
    if (!Number.isInteger(Number(form.stock)) || Number(form.stock) < 0 || form.stock === "") errs.stock = "Whole number, 0 or more";
    if (!form.category.trim()) errs.category = "Pick or type a category";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    saveProduct(user, {
      ...form, name: form.name.trim(), category: form.category.trim(),
      price: round2(Number(form.price)), stock: Number(form.stock),
      description: form.description.trim() || "No description provided.",
    });
    onClose();
  };

  return (
    <Modal onClose={onClose} wide>
      <h3 className="text-xl text-[#231942] mb-4" style={{ fontFamily: "var(--font-display)" }}>{initial ? "Edit listing" : "New listing"}</h3>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Product name" error={errors.name}><input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Price ($)" error={errors.price}><input type="number" step="0.01" min="0" className={inputCls} value={form.price} onChange={(e) => set("price", e.target.value)} /></Field>
          <Field label="Stock" error={errors.stock}><input type="number" min="0" className={inputCls} value={form.stock} onChange={(e) => set("stock", e.target.value)} /></Field>
          <Field label="Category" error={errors.category}>
            <input list="cats" className={inputCls} value={form.category} onChange={(e) => set("category", e.target.value)} />
            <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
        </div>
        <div>
          <div className="text-xs text-[#6A5F94] mb-1">Icon</div>
          <div className="flex flex-wrap gap-1.5">
            {EMOJI_PRESETS.map((em) => (
              <button
                type="button" key={em} onClick={() => set("emoji", em)}
                className="w-9 h-9 rounded-lg text-lg border transition"
                style={{ background: form.emoji === em ? ROLE.vendor.tint : "#fff", borderColor: form.emoji === em ? ROLE.vendor.color : "#E4DAFA" }}
              >
                {em}
              </button>
            ))}
          </div>
        </div>
        <Field label="Image URL (optional — falls back to the icon)">
          <input className={inputCls} value={form.image} onChange={(e) => set("image", e.target.value)} placeholder="https://…" />
        </Field>
        <Field label="Description">
          <textarea rows={3} className={inputCls} value={form.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <div className="flex gap-2 pt-1">
          <Btn type="button" tone="#6A5F94" variant="outline" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" tone={ROLE.vendor.color} className="flex-1">{initial ? "Save changes" : "Publish listing"}</Btn>
        </div>
      </form>
    </Modal>
  );
}

function VendorOrders({ user, myOrders }) {
  const { setItemStatus, ask } = useApp();
  const [filter, setFilter] = useState("all");
  const filtered = myOrders.filter(({ items }) => filter === "all" || items.some((i) => i.status === filter));

  return (
    <>
      <div className="mb-4">
        <Tabs
          tone="#2B1D5C" value={filter} onChange={setFilter}
          tabs={[
            { id: "all", label: "All" }, { id: "placed", label: "To ship" },
            { id: "shipped", label: "Shipped" }, { id: "delivered", label: "Delivered" }, { id: "cancelled", label: "Cancelled" },
          ]}
        />
      </div>
      {filtered.length === 0 ? (
        <Empty icon={ClipboardList} title="No orders here" hint="Orders containing your products will appear as shoppers check out." />
      ) : (
        <div className="space-y-4">
          {filtered.map(({ order, items }) => (
            <div key={order.id} className="rounded-2xl border-2 border-[#E4DAFA] bg-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-[#F3EEFF] flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-bold tabular-nums text-sm text-[#231942]">{order.id}</span>
                  <span className="text-xs text-[#8B82B3]">{fmtDate(order.createdAt)} · {order.shopperName}</span>
                </div>
                <span className="text-xs text-[#6A5F94] flex items-center gap-1">
                  <Truck size={12} /> {order.shipTo.address}, {order.shipTo.city} {order.shipTo.zip}
                </span>
              </div>
              <div className="divide-y divide-[#EFE8FF]">
                {items.map((i) => (
                  <div key={i.productId} className="flex items-center justify-between gap-3 px-4 py-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{i.emoji}</span>
                      <div>
                        <div className="text-sm text-[#231942]">{i.name}</div>
                        <div className="text-xs text-[#8B82B3]">{i.qty} × {fmt(i.price)} = {fmt(i.qty * i.price)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge kind={i.status} />
                      {i.status === "placed" && (
                        <Btn tone={ROLE.vendor.color} className="!py-1 !text-xs" onClick={() => setItemStatus(order.id, i.productId, "shipped", user.storeName)}>
                          <Truck size={12} /> Mark shipped
                        </Btn>
                      )}
                      {i.status === "shipped" && (
                        <Btn tone="#0E8F5B" className="!py-1 !text-xs" onClick={() => setItemStatus(order.id, i.productId, "delivered", user.storeName)}>
                          <CheckCircle2 size={12} /> Mark delivered
                        </Btn>
                      )}
                      {(i.status === "placed" || i.status === "shipped") && (
                        <button
                          className="text-xs text-[#D93036] hover:underline"
                          onClick={() =>
                            ask({
                              title: "Cancel this item?",
                              message: `${order.shopperName} will see it as cancelled and it returns to your stock.`,
                              confirmLabel: "Cancel item", danger: true,
                              onConfirm: () => setItemStatus(order.id, i.productId, "cancelled", user.storeName),
                            })
                          }
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* =====================================================================
   ADMIN
===================================================================== */
function AdminView({ user }) {
  const { users, products, orders } = useApp();
  const [tab, setTab] = useState("overview");
  return (
    <>
      <div className="mb-6">
        <h2 className="text-3xl text-[#231942]" style={{ fontFamily: "var(--font-display)" }}>Market oversight</h2>
        <p className="text-sm text-[#6A5F94]">Admin console · {user.name}</p>
      </div>
      <div className="mb-6">
        <Tabs
          tone={ROLE.admin.color} value={tab} onChange={setTab}
          tabs={[
            { id: "overview", label: "Overview", icon: LayoutDashboard },
            { id: "users", label: "Users", icon: Users, badge: users.length },
            { id: "listings", label: "Listings", icon: Package, badge: products.length },
            { id: "orders", label: "Orders", icon: Receipt, badge: orders.length },
          ]}
        />
      </div>
      {tab === "overview" && <AdminOverview />}
      {tab === "users" && <AdminUsers admin={user} />}
      {tab === "listings" && <AdminListings admin={user} />}
      {tab === "orders" && <AdminOrders />}
    </>
  );
}

function AdminOverview() {
  const { users, products, orders, activity } = useApp();
  const gmv = orders.reduce((s, o) => s + o.items.filter((i) => i.status !== "cancelled").reduce((a, i) => a + i.qty * i.price, 0), 0);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Shoppers" value={users.filter((u) => u.role === "shopper").length} icon={ShoppingBag} tone="#4F6BF6" />
        <StatCard label="Vendors" value={users.filter((u) => u.role === "vendor").length} icon={Store} tone="#E0561F" />
        <StatCard label="Listings" value={products.length} icon={Package} tone="#9B5DE5" />
        <StatCard label="Orders" value={orders.length} icon={Receipt} tone="#EC4899" />
        <StatCard label="Gross sales" value={fmt(gmv)} icon={DollarSign} tone="#0E8F5B" hint="excl. tax & shipping" />
      </div>
      <div className="rounded-2xl border-2 border-[#E4DAFA] bg-white p-4">
        <h3 className="text-sm font-medium text-[#231942] mb-3 flex items-center gap-1.5"><Activity size={14} /> Platform activity</h3>
        <div className="divide-y divide-[#EFE8FF]">
          {activity.slice(0, 12).map((a) => (
            <div key={a.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-[#231942]">{a.text}</span>
              <span className="text-xs text-[#8B82B3] shrink-0 ml-3">{timeAgo(a.ts)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminUsers({ admin }) {
  const { users, products, orders, toggleSuspend, ask } = useApp();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const list = users.filter(
    (u) =>
      (roleFilter === "all" || u.role === roleFilter) &&
      [u.name, u.email, u.storeName || ""].join(" ").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-[#E4DAFA] bg-white flex-1 min-w-[200px]">
          <Search size={14} color="#8B82B3" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email or store" className="text-sm outline-none w-full bg-transparent" />
        </div>
        <Tabs tone={ROLE.admin.color} value={roleFilter} onChange={setRoleFilter} tabs={[{ id: "all", label: "All" }, { id: "shopper", label: "Shoppers" }, { id: "vendor", label: "Vendors" }, { id: "admin", label: "Admins" }]} />
      </div>

      <div className="rounded-2xl border-2 border-[#E4DAFA] bg-white divide-y divide-[#EFE8FF]">
        {list.length === 0 && <div className="p-6 text-sm text-[#8B82B3]">No users found.</div>}
        {list.map((u) => {
          const R = ROLE[u.role];
          const stat =
            u.role === "vendor" ? `${products.filter((p) => p.vendorId === u.id).length} listings`
            : u.role === "shopper" ? `${orders.filter((o) => o.shopperId === u.id).length} orders` : "platform admin";
          return (
            <div key={u.id} className="flex items-center justify-between gap-3 px-4 py-3 flex-wrap">
              <div className="min-w-0">
                <div className="text-sm font-medium text-[#231942] flex items-center gap-2">
                  {u.name}
                  <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: R.tint, color: R.color }}>{R.label}</span>
                </div>
                <div className="text-xs text-[#8B82B3]">
                  {u.email}{u.storeName ? ` · ${u.storeName}` : ""} · joined {fmtDate(u.joined)} · {stat}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge kind={u.status} />
                {u.role !== "admin" && (
                  <Btn
                    tone={u.status === "active" ? "#D93036" : "#0E8F5B"} variant="outline" className="!py-1 !text-xs"
                    onClick={() =>
                      u.status === "active"
                        ? ask({
                            title: `Suspend ${u.name}?`,
                            message: u.role === "vendor"
                              ? "They won't be able to sign in, and all their listings will be hidden from shoppers."
                              : "They won't be able to sign in until you reactivate the account.",
                            confirmLabel: "Suspend", danger: true,
                            onConfirm: () => toggleSuspend(u, admin.name),
                          })
                        : toggleSuspend(u, admin.name)
                    }
                  >
                    {u.status === "active" ? <><Ban size={12} /> Suspend</> : <><CheckCircle2 size={12} /> Reactivate</>}
                  </Btn>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function AdminListings({ admin }) {
  const { products, users, vendorActive, storeName, deleteProduct, ask } = useApp();
  const [vendor, setVendor] = useState("all");
  const [query, setQuery] = useState("");
  const vendors = users.filter((u) => u.role === "vendor");
  const list = products.filter(
    (p) => (vendor === "all" || p.vendorId === vendor) && p.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-[#E4DAFA] bg-white flex-1 min-w-[200px]">
          <Search size={14} color="#8B82B3" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search listings" className="text-sm outline-none w-full bg-transparent" />
        </div>
        <select value={vendor} onChange={(e) => setVendor(e.target.value)} className={inputCls + " !w-auto"}>
          <option value="all">All vendors</option>
          {vendors.map((v) => <option key={v.id} value={v.id}>{v.storeName}</option>)}
        </select>
      </div>
      {list.length === 0 ? (
        <Empty icon={Package} title="No listings found" />
      ) : (
        <div className="rounded-2xl border-2 border-[#E4DAFA] bg-white divide-y divide-[#EFE8FF]">
          {list.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <ProductTile product={p} className="w-11 h-11 text-xl shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#231942] truncate">{p.name}</div>
                  <div className="text-xs text-[#8B82B3]">{storeName(p.vendorId)} · {fmt(p.price)} · {p.stock} in stock</div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {!vendorActive(p.vendorId) && <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#FFE5E7] text-[#D93036]">Hidden · vendor suspended</span>}
                <Btn
                  tone="#D93036" variant="outline" className="!py-1 !text-xs"
                  onClick={() =>
                    ask({
                      title: "Remove this listing?",
                      message: `"${p.name}" by ${storeName(p.vendorId)} will be removed from the marketplace.`,
                      confirmLabel: "Remove listing", danger: true,
                      onConfirm: () => deleteProduct(p, admin.name),
                    })
                  }
                >
                  <Trash2 size={12} /> Remove
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function AdminOrders() {
  const { orders, storeName } = useApp();
  const [open, setOpen] = useState(null);
  if (orders.length === 0) return <Empty icon={Receipt} title="No orders yet" />;
  return (
    <div className="rounded-2xl border-2 border-[#E4DAFA] bg-white divide-y divide-[#EFE8FF]">
      {orders.map((o) => {
        const vendorIds = Array.from(new Set(o.items.map((i) => i.vendorId)));
        const isOpen = open === o.id;
        return (
          <div key={o.id}>
            <button onClick={() => setOpen(isOpen ? null : o.id)} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left flex-wrap">
              <div>
                <div className="text-sm flex items-center gap-2">
                  <span className="font-bold tabular-nums text-[#231942]">{o.id}</span>
                  <span className="text-xs text-[#8B82B3]">{fmtDate(o.createdAt)}</span>
                </div>
                <div className="text-xs text-[#6A5F94]">{o.shopperName} → {vendorIds.map(storeName).join(", ")}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold tabular-nums text-sm">{fmt(o.total)}</span>
                <Badge kind={orderStatus(o)} />
              </div>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 text-xs text-[#6A5F94] space-y-1.5 bg-[#FFF7ED]">
                {o.items.map((i) => (
                  <div key={i.productId} className="flex items-center justify-between pt-1.5">
                    <span>{i.emoji} {i.qty} × {i.name} <span className="text-[#A9A1CC]">({storeName(i.vendorId)})</span></span>
                    <Badge kind={i.status} />
                  </div>
                ))}
                <div className="pt-2 border-t border-[#EFE8FF]">
                  Ships to {o.shipTo.name}, {o.shipTo.address}, {o.shipTo.city} {o.shipTo.zip} · {o.payment} · Shipping {o.shipping === 0 ? "free" : fmt(o.shipping)} · Tax {fmt(o.tax)}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
