/*
  Lottery Purchase System (LPS) - CS3365 Phase 2 Web Application
  Vercel-ready static SPA with optional /api/send-email serverless email endpoint.

  Important academic note:
  - Customer accounts, orders, carts, tickets, emails, and claims persist in browser localStorage.
  - The fixed admin account below is for the Phase 2 prototype/demo. A production system would move authentication,
    payment, and persistent storage to a secure backend database.
*/

const ADMIN_EMAIL = "admin@lps.local";
const ADMIN_PASSWORD = "Admin@2026!";
const STORE_KEY = "lps_phase2_final_state_v1";
const SESSION_KEY = "lps_phase2_final_session_v1";
const MAX_TICKETS_PER_TRANSACTION = 10;
const TWO_STEP_REQUIRED = true;

const DEFAULT_TICKETS = [
  { id: uid("ticket"), name: "Power Ball", price: 2.00, prizeAmount: 1000000, drawingDate: nextFriday(), active: true, winningNumbers: [7, 11, 21, 32, 44], updatedAt: nowISO() },
  { id: uid("ticket"), name: "Mega Millions", price: 2.00, prizeAmount: 750000, drawingDate: nextFriday(), active: true, winningNumbers: [5, 14, 26, 38, 49], updatedAt: nowISO() },
  { id: uid("ticket"), name: "Lotto Texas", price: 1.00, prizeAmount: 250000, drawingDate: nextFriday(), active: true, winningNumbers: [3, 9, 18, 27, 41], updatedAt: nowISO() },
  { id: uid("ticket"), name: "Texas Two Step", price: 1.50, prizeAmount: 125000, drawingDate: nextFriday(), active: true, winningNumbers: [2, 16, 23, 34, 47], updatedAt: nowISO() }
];

let state = loadState();
let session = loadSession();
let view = "home";
let authMode = "login";
let pendingAuth = null;
let selectedTicketId = null;
let selectedOrderId = null;
let searchText = "";
let mobileOpen = false;

const app = document.getElementById("app");

function nowISO(){ return new Date().toISOString(); }
function uid(prefix="id"){ return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`; }
function money(value){ return Number(value || 0).toLocaleString("en-US",{style:"currency",currency:"USD"}); }
function fmtDate(value){ if(!value) return "Pending"; return new Date(value).toLocaleDateString(); }
function esc(value){ return String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c])); }
function normalizeEmail(email){ return String(email || "").trim().toLowerCase(); }
function nextFriday(){ const d = new Date(); const day = d.getDay(); const diff = (5 - day + 7) % 7 || 7; d.setDate(d.getDate() + diff); d.setHours(18,0,0,0); return d.toISOString().slice(0,10); }
function numbersText(nums){ return (nums || []).map(n => `<span class="num">${Number(n)}</span>`).join(""); }
function parseNumbers(raw){ return String(raw || "").split(/[,\s]+/).map(n => Number(n)).filter(n => Number.isInteger(n)); }
function validNumbers(nums){ return nums.length === 5 && nums.every(n => n >= 1 && n <= 50) && new Set(nums).size === 5; }
function randomNumbers(){ const nums = new Set(); while(nums.size < 5) nums.add(Math.floor(Math.random() * 50) + 1); return [...nums].sort((a,b)=>a-b); }
function getCurrentUser(){ return session?.type === "customer" ? state.users.find(u => u.id === session.userId) : null; }
function isAdmin(){ return session?.type === "admin"; }
function getCart(){ const user = getCurrentUser(); if(!user) return []; state.carts[user.id] ||= []; return state.carts[user.id]; }
function save(){ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
function saveSession(){ if(session) localStorage.setItem(SESSION_KEY, JSON.stringify(session)); else localStorage.removeItem(SESSION_KEY); }
function loadSession(){ try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; } }
function loadState(){
  try {
    const existing = JSON.parse(localStorage.getItem(STORE_KEY));
    if(existing?.version === 1) return existing;
  } catch {}
  const initial = {
    version: 1,
    users: [],
    tickets: DEFAULT_TICKETS,
    orders: [],
    carts: {},
    emails: [],
    verifications: {},
    claims: [],
    regulatoryReports: [],
    activity: [],
    settings: { twoStepRequired: TWO_STEP_REQUIRED, emailMode: "auto" }
  };
  localStorage.setItem(STORE_KEY, JSON.stringify(initial));
  return initial;
}
function resetState(){
  if(!confirm("Reset all local LPS data? This clears customers, orders, tickets, emails, claims, and reports in this browser.")) return;
  localStorage.removeItem(STORE_KEY);
  localStorage.removeItem(SESSION_KEY);
  state = loadState();
  session = null;
  view = "home";
  toast("System reset complete.", "success");
  render();
}
function logActivity(actor, message){
  state.activity.unshift({ id: uid("act"), actor, message, createdAt: nowISO() });
  state.activity = state.activity.slice(0, 80);
  save();
}
function toast(message, type="success"){
  const box = document.getElementById("toast");
  const item = document.createElement("div");
  item.className = `toast ${type}`;
  item.textContent = message;
  box.appendChild(item);
  setTimeout(() => item.remove(), 5200);
}
async function sha256(value){
  const text = String(value || "");
  if(window.crypto?.subtle){
    const data = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2,"0")).join("");
  }
  let h = 0;
  for(let i=0;i<text.length;i++) h = Math.imul(31,h) + text.charCodeAt(i) | 0;
  return `fallback_${h}`;
}
function generateCode(){ return String(Math.floor(100000 + Math.random() * 900000)); }
async function sendEmail(to, subject, body, category="general"){
  const email = { id: uid("email"), to, subject, body, category, status: "queued", createdAt: nowISO(), providerMessage: "Waiting to send" };
  state.emails.unshift(email);
  state.emails = state.emails.slice(0, 100);
  save();
  try {
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, body, category })
    });
    const data = await res.json().catch(() => ({}));
    email.status = data.simulated ? "simulated" : (data.ok ? "sent" : "failed");
    email.providerMessage = data.message || (data.simulated ? "No email API key configured; message saved in LPS Mail Center." : "Email endpoint responded.");
  } catch (error) {
    email.status = "simulated";
    email.providerMessage = "Static/local run: message saved in LPS Mail Center.";
  }
  save();
  return email;
}
async function issueCode(email, purpose){
  const code = generateCode();
  state.verifications[normalizeEmail(email)] = { code, purpose, expiresAt: Date.now() + 10 * 60 * 1000, attempts: 0 };
  save();
  await sendEmail(email, `LPS ${purpose === "login" ? "two-step login" : "email verification"} code`, `Your Lottery Purchase System verification code is ${code}. It expires in 10 minutes. If you did not request this, ignore this message.`, purpose);
  return code;
}
function verifyCode(email, code, purpose){
  const record = state.verifications[normalizeEmail(email)];
  if(!record || record.purpose !== purpose) return { ok:false, message:"No active verification code found." };
  if(Date.now() > record.expiresAt) return { ok:false, message:"The verification code expired. Request a new code." };
  record.attempts += 1;
  if(record.attempts > 5) return { ok:false, message:"Too many attempts. Request a new code." };
  if(String(code).trim() !== String(record.code)) { save(); return { ok:false, message:"Incorrect verification code." }; }
  delete state.verifications[normalizeEmail(email)];
  save();
  return { ok:true };
}
function latestCodePreview(){
  const emails = state.emails.slice(0,5);
  if(!emails.length) return "No LPS emails have been sent yet.";
  return emails.map(e => `[${fmtDate(e.createdAt)} ${new Date(e.createdAt).toLocaleTimeString()}] To: ${e.to}\nSubject: ${e.subject}\n${e.body}\nStatus: ${e.status} - ${e.providerMessage}`).join("\n\n---\n\n");
}

function render(){
  if(!session){ renderAuth(); return; }
  if(isAdmin()) renderAdminApp(); else renderCustomerApp();
}
function renderAuth(){
  app.innerHTML = `
    <div class="public-shell">
      <section class="hero">
        <div>
          <div class="brand"><div class="logo">L</div><span>Lottery Purchase System</span></div>
          <div class="eyebrow">CS3365 Phase 2 • Vercel-ready web app</div>
          <h1>Buy tickets, verify winners, and manage the lottery online.</h1>
          <p>LPS gives customers a modern digital lottery experience with registration, two-step verification, cart checkout, electronic tickets, order history, winnings claims, and admin management in one web application.</p>
          <div class="hero-list">
            <div class="hero-item">Customer registration and login</div>
            <div class="hero-item">Two-step email verification</div>
            <div class="hero-item">Add multiple tickets to cart</div>
            <div class="hero-item">Dedicated admin dashboard</div>
          </div>
          <p class="footer-note">Fixed admin account: <strong>${ADMIN_EMAIL}</strong> / <strong>${ADMIN_PASSWORD}</strong>. No customer demo account is preloaded.</p>
        </div>
        <div class="auth-card">
          <div class="tabs">
            <button class="tab ${authMode === "login" ? "active" : ""}" onclick="setAuthMode('login')">Login</button>
            <button class="tab ${authMode === "register" ? "active" : ""}" onclick="setAuthMode('register')">Register</button>
          </div>
          ${pendingAuth ? renderVerificationCard() : (authMode === "login" ? renderLoginForm() : renderRegisterForm())}
          <details class="dev-mail">
            <summary>Email Service Preview / Verification Codes</summary>
            <p class="text-muted">When a real email provider is not configured, LPS still records all emails here so the Phase 2 demo can show the internal email service and two-step verification.</p>
            <pre>${esc(latestCodePreview())}</pre>
          </details>
        </div>
      </section>
    </div>`;
}
function renderLoginForm(){
  return `<form class="form-grid" onsubmit="handleLogin(event)">
    <div class="notice">Customers can create their own account. Administrators use the single fixed admin account and manage tickets, winning numbers, claiming center verification, email logs, and regulatory reports from the admin dashboard.</div>
    <div class="field"><label>Email</label><input name="email" type="email" required autocomplete="email" placeholder="you@example.com"></div>
    <div class="field"><label>Password</label><input name="password" type="password" required autocomplete="current-password" placeholder="Enter password"></div>
    <button class="btn primary full" type="submit">Continue to two-step verification</button>
  </form>`;
}
function renderRegisterForm(){
  return `<form class="form-grid" onsubmit="handleRegister(event)">
    <div class="form-row">
      <div class="field"><label>Full name</label><input name="fullName" required placeholder="Full name"></div>
      <div class="field"><label>Email</label><input name="email" type="email" required autocomplete="email" placeholder="you@example.com"></div>
    </div>
    <div class="field"><label>Home address</label><input name="address" required placeholder="Street, city, state"></div>
    <div class="form-row">
      <div class="field"><label>Phone number</label><input name="phone" required placeholder="(806) 555-0100"></div>
      <div class="field"><label>Password</label><input name="password" type="password" required minlength="8" autocomplete="new-password" placeholder="8+ characters"></div>
    </div>
    <div class="notice warn">After registration, LPS sends an email verification code. The account cannot log in until the code is verified.</div>
    <button class="btn primary full" type="submit">Create customer account</button>
  </form>`;
}
function renderVerificationCard(){
  const title = pendingAuth.purpose === "login" ? "Two-step verification" : "Verify your email";
  return `<form class="form-grid" onsubmit="handleVerify(event)">
    <div class="notice success"><strong>${title}</strong><br>A 6-digit code was sent to <strong>${esc(pendingAuth.email)}</strong>. Use your real email if Resend is configured, or open the Email Service Preview below during the class demo.</div>
    <div class="field"><label>Verification code</label><input name="code" inputmode="numeric" required maxlength="6" placeholder="123456"></div>
    <div class="btn-row">
      <button class="btn primary" type="submit">Verify and continue</button>
      <button class="btn light" type="button" onclick="resendCode()">Resend code</button>
      <button class="btn red" type="button" onclick="cancelVerification()">Cancel</button>
    </div>
  </form>`;
}
window.setAuthMode = function(mode){ authMode = mode; pendingAuth = null; render(); };
window.cancelVerification = function(){ pendingAuth = null; render(); };
window.resendCode = async function(){ if(!pendingAuth) return; await issueCode(pendingAuth.email, pendingAuth.purpose); toast("New verification code sent.", "success"); render(); };
window.handleRegister = async function(event){
  event.preventDefault();
  const form = new FormData(event.target);
  const email = normalizeEmail(form.get("email"));
  if(email === ADMIN_EMAIL) return toast("That email is reserved for the fixed admin account.", "error");
  if(state.users.some(u => normalizeEmail(u.email) === email)) return toast("This email is already registered.", "error");
  const password = String(form.get("password") || "");
  if(password.length < 8) return toast("Password must be at least 8 characters.", "error");
  const user = {
    id: uid("user"),
    fullName: String(form.get("fullName") || "").trim(),
    email,
    address: String(form.get("address") || "").trim(),
    phone: String(form.get("phone") || "").trim(),
    passwordHash: await sha256(password),
    verified: false,
    createdAt: nowISO(),
    updatedAt: nowISO()
  };
  state.users.push(user);
  state.carts[user.id] = [];
  save();
  logActivity("Customer", `${user.email} registered a new customer account.`);
  await issueCode(email, "register");
  pendingAuth = { type:"customer", email, userId:user.id, purpose:"register" };
  toast("Account created. Verify the email code to activate it.", "success");
  render();
};
window.handleLogin = async function(event){
  event.preventDefault();
  const form = new FormData(event.target);
  const email = normalizeEmail(form.get("email"));
  const password = String(form.get("password") || "");
  if(email === ADMIN_EMAIL){
    if(password !== ADMIN_PASSWORD) return toast("Invalid admin password.", "error");
    await issueCode(email, "login");
    pendingAuth = { type:"admin", email, purpose:"login" };
    toast("Admin two-step verification code sent.", "success");
    render();
    return;
  }
  const user = state.users.find(u => normalizeEmail(u.email) === email);
  if(!user) return toast("No customer account found with that email.", "error");
  const passwordHash = await sha256(password);
  if(user.passwordHash !== passwordHash) return toast("Invalid customer password.", "error");
  if(!user.verified){
    await issueCode(email, "register");
    pendingAuth = { type:"customer", email, userId:user.id, purpose:"register" };
    toast("Please verify your email before logging in.", "warn");
    render();
    return;
  }
  await issueCode(email, "login");
  pendingAuth = { type:"customer", email, userId:user.id, purpose:"login" };
  toast("Two-step login code sent.", "success");
  render();
};
window.handleVerify = async function(event){
  event.preventDefault();
  const code = new FormData(event.target).get("code");
  const result = verifyCode(pendingAuth.email, code, pendingAuth.purpose);
  if(!result.ok) return toast(result.message, "error");
  if(pendingAuth.purpose === "register"){
    const user = state.users.find(u => u.id === pendingAuth.userId);
    if(user){ user.verified = true; user.updatedAt = nowISO(); save(); }
    session = { type:"customer", userId: pendingAuth.userId, loginAt: nowISO() };
    view = "home";
    logActivity("Customer", `${pendingAuth.email} verified account and logged in.`);
  } else {
    if(pendingAuth.type === "admin") {
      session = { type:"admin", loginAt: nowISO() };
      view = "dashboard";
      logActivity("Administrator", `Admin logged in with two-step verification.`);
    } else {
      session = { type:"customer", userId: pendingAuth.userId, loginAt: nowISO() };
      view = "home";
      logActivity("Customer", `${pendingAuth.email} logged in with two-step verification.`);
    }
  }
  pendingAuth = null;
  saveSession();
  toast("Verification successful.", "success");
  render();
};
function logout(){ session = null; selectedTicketId = null; selectedOrderId = null; view = "home"; saveSession(); toast("Logged out.", "success"); render(); }
window.logout = logout;

function navButton(name, label){ return `<button class="nav-btn ${view===name?"active":""}" onclick="go('${name}')">${label}</button>`; }
function renderHeader(navItems){
  const user = getCurrentUser();
  const label = isAdmin() ? "Admin" : esc(user?.fullName || "Customer");
  return `<header class="app-header"><nav class="nav">
    <div class="nav-left"><div class="brand"><div class="logo">L</div><span>LPS</span></div><button class="btn ghost mobile-menu" onclick="toggleMobileMenu()">Menu</button><div class="nav-links ${mobileOpen?"open":""}">${navItems}</div></div>
    <div class="nav-right"><span class="user-pill">${label}</span><button class="btn light" onclick="logout()">Logout</button></div>
  </nav></header>`;
}
window.toggleMobileMenu = function(){ mobileOpen = !mobileOpen; render(); };
window.go = function(name){ view = name; selectedTicketId = null; selectedOrderId = null; mobileOpen = false; render(); };
function pageTitle(title, subtitle, right=""){
  return `<div class="page-title"><div><h2>${title}</h2><p>${subtitle}</p></div>${right?`<div class="btn-row">${right}</div>`:""}</div>`;
}
function renderCustomerApp(){
  const nav = [
    navButton("home","Home"), navButton("browse","Browse"), navButton("search","Search"), navButton("cart",`Cart (${getCart().length})`), navButton("orders","Order History"), navButton("winners","Previous Winners"), navButton("profile","Profile")
  ].join("");
  app.innerHTML = renderHeader(nav) + `<div class="shell">${renderCustomerView()}</div>`;
}
function renderCustomerView(){
  if(view === "browse") return renderBrowse();
  if(view === "search") return renderSearch();
  if(view === "cart") return renderCart();
  if(view === "orders") return renderOrders();
  if(view === "winners") return renderPreviousWinners();
  if(view === "profile") return renderProfile();
  if(view === "ticketDetail") return renderTicketDetail();
  if(view === "orderDetail") return renderOrderDetail();
  return renderCustomerHome();
}
function renderCustomerHome(){
  const user = getCurrentUser();
  const orders = state.orders.filter(o => o.userId === user.id);
  const wins = orders.flatMap(o => o.tickets).filter(t => t.prizeAmount > 0).length;
  return `${pageTitle(`Welcome, ${esc(user.fullName.split(" ")[0] || "User")}!`, "Browse tickets, add up to ten selections to your cart, pay once, then receive electronic tickets with unique confirmation numbers.")}
  <div class="grid four">
    <div class="card metric"><div><span>Cart items</span><strong>${getCart().length}</strong></div><button class="btn primary" onclick="go('cart')">Open</button></div>
    <div class="card metric"><div><span>Total orders</span><strong>${orders.length}</strong></div><button class="btn light" onclick="go('orders')">View</button></div>
    <div class="card metric"><div><span>Winning tickets</span><strong>${wins}</strong></div></div>
    <div class="card metric"><div><span>Active games</span><strong>${state.tickets.filter(t=>t.active).length}</strong></div></div>
  </div>
  <div class="grid three mt">
    <button class="card soft" onclick="go('browse')"><h3>Browse Lottery Tickets</h3><p>See Power Ball, Mega Millions, Lotto Texas, Texas Two Step, and any new tickets added by admin.</p></button>
    <button class="card soft" onclick="go('search')"><h3>Search Tickets</h3><p>Find a specific ticket by name and view details before purchasing.</p></button>
    <button class="card soft" onclick="go('orders')"><h3>Order History</h3><p>Review all current and previous purchases, e-tickets, winning numbers, and claim status.</p></button>
  </div>`;
}
function ticketCards(tickets){
  if(!tickets.length) return `<div class="empty">No active tickets match this view.</div>`;
  return `<div class="grid three">${tickets.map(ticket => `<div class="card ticket-card">
    <span class="badge ${ticket.active?"green":"gray"}">${ticket.active?"Active":"Inactive"}</span>
    <h3>${esc(ticket.name)}</h3>
    <div class="price">${money(ticket.price)} <small>per ticket</small></div>
    <div class="kv"><span>Drawing date</span><span>${fmtDate(ticket.drawingDate)}</span></div>
    <div class="kv"><span>Prize amount</span><span>${money(ticket.prizeAmount)}</span></div>
    <div class="kv"><span>Winning numbers</span><span>${numbersText(ticket.winningNumbers)}</span></div>
    <div class="btn-row mt"><button class="btn primary" onclick="openTicket('${ticket.id}')">View / Add to cart</button></div>
  </div>`).join("")}</div>`;
}
function renderBrowse(){
  const tickets = state.tickets.filter(t => t.active);
  return `${pageTitle("Browse Lottery Tickets", "Select a ticket, manually choose five numbers from 1-50 or use auto-select, then add it to the cart.")}${ticketCards(tickets)}`;
}
function renderSearch(){
  const tickets = state.tickets.filter(t => t.active && t.name.toLowerCase().includes(searchText.toLowerCase()));
  return `${pageTitle("Search Tickets", "Search for a specific lottery ticket by name.")}
  <div class="card mb"><div class="field"><label>Search by ticket name</label><input value="${esc(searchText)}" placeholder="Mega Millions" oninput="updateSearch(this.value)"></div></div>
  ${ticketCards(tickets)}`;
}
window.updateSearch = function(value){ searchText = value; render(); };
window.openTicket = function(id){ selectedTicketId = id; view = "ticketDetail"; render(); };
window.autoFillNumbers = function(){ document.querySelectorAll(".pick-number").forEach((input, i) => input.value = randomNumbers()[i]); };
function renderTicketDetail(){
  const ticket = state.tickets.find(t => t.id === selectedTicketId);
  if(!ticket) return `<div class="empty">Ticket not found.</div>`;
  return `${pageTitle(ticket.name, "Pick exactly five unique numbers from 1 to 50 and add the selection to your cart.", `<button class="btn light" onclick="go('browse')">Back to browse</button>`)}
  <div class="grid two">
    <div class="card">
      <h3>Ticket Details</h3>
      <div class="kv"><span>Cost</span><span>${money(ticket.price)}</span></div>
      <div class="kv"><span>Drawing Date</span><span>${fmtDate(ticket.drawingDate)}</span></div>
      <div class="kv"><span>Prize Amount</span><span>${money(ticket.prizeAmount)}</span></div>
      <div class="kv"><span>Number Range</span><span>Choose 5 unique numbers from 1 to 50</span></div>
      <div class="divider"></div>
      <p><strong>Winning calculation:</strong> 5 matches = 100%, 4 = 20%, 3 = 5%, 2 = 1%, 1 = no prize.</p>
    </div>
    <form class="card form-grid" onsubmit="addToCart(event, '${ticket.id}')">
      <h3>Select Your Numbers</h3>
      <div class="number-grid">
        ${[0,1,2,3,4].map(i => `<input class="pick-number" name="n${i}" inputmode="numeric" min="1" max="50" required placeholder="${i+1}">`).join("")}
      </div>
      <div class="btn-row">
        <button class="btn light" type="button" onclick="fillRandomSelection()">Auto-select random numbers</button>
        <button class="btn primary" type="submit">Add to cart</button>
      </div>
      <div class="notice">Cart limit: maximum ${MAX_TICKETS_PER_TRANSACTION} tickets per checkout transaction.</div>
    </form>
  </div>`;
}
window.fillRandomSelection = function(){
  const nums = randomNumbers();
  document.querySelectorAll(".pick-number").forEach((input, i) => input.value = nums[i]);
};
window.addToCart = function(event, ticketId){
  event.preventDefault();
  const cart = getCart();
  if(cart.length >= MAX_TICKETS_PER_TRANSACTION) return toast(`You can only purchase ${MAX_TICKETS_PER_TRANSACTION} tickets per transaction.`, "error");
  const form = new FormData(event.target);
  const nums = [0,1,2,3,4].map(i => Number(form.get(`n${i}`))).sort((a,b)=>a-b);
  if(!validNumbers(nums)) return toast("Pick exactly five unique numbers from 1 to 50.", "error");
  const ticket = state.tickets.find(t => t.id === ticketId && t.active);
  if(!ticket) return toast("Ticket is not available.", "error");
  cart.push({ id: uid("cart"), ticketId, numbers: nums, addedAt: nowISO() });
  save();
  toast(`${ticket.name} added to cart.`, "success");
  view = "cart";
  render();
};
function renderCart(){
  const cart = getCart();
  const total = cart.reduce((sum,item) => sum + (state.tickets.find(t => t.id === item.ticketId)?.price || 0), 0);
  return `${pageTitle("Cart & Checkout", "Review all selected tickets and pay for the full cart in one transaction using PayPal, Venmo, or linked bank account.", `<button class="btn light" onclick="go('browse')">Add more tickets</button>`)}
  <div class="grid two">
    <div class="card">
      <h3>Cart Items (${cart.length}/${MAX_TICKETS_PER_TRANSACTION})</h3>
      ${!cart.length ? `<div class="empty">Your cart is empty. Browse tickets to add selections.</div>` : `<div class="cart-list">${cart.map(item => {
        const ticket = state.tickets.find(t => t.id === item.ticketId);
        return `<div class="cart-item"><div><strong>${esc(ticket?.name || "Unknown Ticket")}</strong><div class="numbers mt">${numbersText(item.numbers)}</div><small class="text-muted">${money(ticket?.price || 0)}</small></div><button class="btn red" onclick="removeCartItem('${item.id}')">Remove</button></div>`;
      }).join("")}</div>`}
    </div>
    <form class="card form-grid" onsubmit="checkoutCart(event)">
      <h3>Secure Checkout</h3>
      <div class="kv"><span>Total tickets</span><span>${cart.length}</span></div>
      <div class="kv"><span>Transaction total</span><span>${money(total)}</span></div>
      <div class="field"><label>Payment method</label><select name="paymentMethod" required><option value="PayPal">PayPal</option><option value="Venmo">Venmo</option><option value="Bank Account">Bank Account</option></select></div>
      <div class="field"><label>Payment account / handle</label><input name="account" required placeholder="PayPal email, Venmo handle, or ****1234"></div>
      <div class="notice warn">This project prototype simulates payment approval while enforcing the allowed payment methods.</div>
      <button class="btn primary full" type="submit" ${cart.length ? "" : "disabled"}>Pay for cart and generate e-tickets</button>
    </form>
  </div>`;
}
window.removeCartItem = function(id){ const cart = getCart(); const idx = cart.findIndex(i => i.id === id); if(idx>=0) cart.splice(idx,1); save(); render(); };
window.checkoutCart = async function(event){
  event.preventDefault();
  const user = getCurrentUser();
  const cart = getCart();
  if(!cart.length) return toast("Your cart is empty.", "error");
  if(cart.length > MAX_TICKETS_PER_TRANSACTION) return toast("Cart exceeds transaction limit.", "error");
  const form = new FormData(event.target);
  const paymentMethod = form.get("paymentMethod");
  if(!["PayPal","Venmo","Bank Account"].includes(paymentMethod)) return toast("Only PayPal, Venmo, or Bank Account are supported.", "error");
  const lineItems = cart.map(item => {
    const ticket = state.tickets.find(t => t.id === item.ticketId);
    const result = evaluateTicket(item.numbers, ticket);
    return {
      id: uid("eticket"),
      ticketId: ticket.id,
      ticketName: ticket.name,
      ticketPrice: Number(ticket.price),
      drawingDate: ticket.drawingDate,
      numbers: item.numbers,
      winningNumbers: ticket.winningNumbers || [],
      matchedCount: result.matchedCount,
      prizeAmount: result.prizeAmount,
      status: result.prizeAmount > 0 ? (result.prizeAmount >= 600 ? "Winner - Claiming Center Required" : "Winner - Online Claim Available") : "Purchased",
      ticketNumber: `TX-${Math.floor(100000000 + Math.random()*900000000)}`,
      confirmationNumber: `LPS-${Math.random().toString(36).slice(2,6).toUpperCase()}-${Math.floor(10000 + Math.random()*90000)}`,
      claimed: false,
      centerVerified: false,
      winnerNotified: false,
      purchasedAt: nowISO()
    };
  });
  const total = lineItems.reduce((sum,t)=>sum+t.ticketPrice,0);
  const order = { id: uid("order"), userId: user.id, createdAt: nowISO(), paymentMethod, maskedAccount: maskAccount(String(form.get("account") || "")), total, status:"Paid", tickets: lineItems };
  state.orders.unshift(order);
  state.carts[user.id] = [];
  save();
  logActivity("Customer", `${user.email} purchased ${lineItems.length} ticket(s) for ${money(total)}.`);
  await sendEmail(user.email, "LPS purchase confirmation", `Your order ${order.id} was processed successfully. ${lineItems.length} electronic ticket(s) were generated. Total paid: ${money(total)}.`, "purchase");
  for(const t of lineItems){ if(t.prizeAmount > 0) await notifyWinner(user, order, t); }
  selectedOrderId = order.id;
  view = "orderDetail";
  toast("Payment approved. E-tickets generated.", "success");
  render();
};
function maskAccount(value){ const s = String(value).trim(); if(s.length <= 4) return "****"; return `${"*".repeat(Math.max(4, s.length-4))}${s.slice(-4)}`; }
function evaluateTicket(numbers, ticket){
  const winning = ticket?.winningNumbers || [];
  if(!validNumbers(winning)) return { matchedCount:0, prizeAmount:0 };
  const matchedCount = numbers.filter(n => winning.includes(n)).length;
  let multiplier = 0;
  if(matchedCount === 5) multiplier = 1;
  else if(matchedCount === 4) multiplier = .20;
  else if(matchedCount === 3) multiplier = .05;
  else if(matchedCount === 2) multiplier = .01;
  return { matchedCount, prizeAmount: Math.round((Number(ticket.prizeAmount || 0) * multiplier) * 100) / 100 };
}
async function notifyWinner(user, order, ticket){
  if(ticket.winnerNotified) return;
  ticket.winnerNotified = true;
  const claimMsg = ticket.prizeAmount <= 599 ? "You may claim this prize online from Order History." : "Because this prize is $600 or more, present the e-ticket at a local claiming center for verification and regulatory reporting.";
  await sendEmail(user.email, `Winner notification for ${ticket.ticketName}`, `Congratulations! Ticket ${ticket.ticketNumber} matched ${ticket.matchedCount} number(s) and won ${money(ticket.prizeAmount)}. ${claimMsg}`, "winner");
  save();
}
function renderOrders(){
  const user = getCurrentUser();
  const orders = state.orders.filter(o => o.userId === user.id);
  return `${pageTitle("Order History", "View all previous and current purchases, electronic tickets, drawn winning numbers, and claim eligibility.")}
  <div class="card">${!orders.length ? `<div class="empty">No orders yet. Purchase tickets to see order history.</div>` : `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Order</th><th>Tickets</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>${orders.map(order => {
    const prize = order.tickets.reduce((sum,t)=>sum+t.prizeAmount,0);
    return `<tr><td>${fmtDate(order.createdAt)}</td><td>${order.id}</td><td>${order.tickets.length}</td><td>${money(order.total)}</td><td>${prize>0?`<span class="badge gold">Winner ${money(prize)}</span>`:`<span class="badge green">Paid</span>`}</td><td><button class="btn light" onclick="openOrder('${order.id}')">View details</button></td></tr>`;
  }).join("")}</tbody></table></div>`}</div>`;
}
window.openOrder = function(id){ selectedOrderId = id; view = "orderDetail"; render(); };
function renderOrderDetail(){
  const order = state.orders.find(o => o.id === selectedOrderId);
  if(!order) return `<div class="empty">Order not found.</div>`;
  return `${pageTitle("Order Details", `Order ${order.id} • ${fmtDate(order.createdAt)}`, `<button class="btn light" onclick="go('orders')">Back to history</button><button class="btn primary" onclick="window.print()">Print tickets</button>`)}
  <div class="card mb"><div class="grid three"><div><strong>Total Paid</strong><p>${money(order.total)}</p></div><div><strong>Payment Method</strong><p>${esc(order.paymentMethod)} (${esc(order.maskedAccount)})</p></div><div><strong>Status</strong><p>${esc(order.status)}</p></div></div></div>
  <div class="grid two print-area">${order.tickets.map(t => renderETicket(order, t)).join("")}</div>`;
}
function renderETicket(order, t){
  const claimButton = t.prizeAmount > 0 && !t.claimed && t.prizeAmount <= 599 ? `<button class="btn green" onclick="claimPrize('${order.id}','${t.id}')">Claim online</button>` : "";
  const centerMsg = t.prizeAmount >= 600 ? `<div class="notice warn mt">Prize is $600 or more. Present this e-ticket at a claiming center for verification and IRS/regulatory reporting.</div>` : "";
  return `<div class="ticket-print">
    <div class="btn-row" style="justify-content:space-between"><span class="badge purple">E-Ticket</span><span class="badge ${t.prizeAmount>0?"gold":"green"}">${esc(t.status)}</span></div>
    <h3>${esc(t.ticketName)}</h3>
    <div class="kv"><span>Ticket Number</span><span>${esc(t.ticketNumber)}</span></div>
    <div class="kv"><span>Confirmation #</span><span>${esc(t.confirmationNumber)}</span></div>
    <div class="kv"><span>Your Numbers</span><span class="numbers">${numbersText(t.numbers)}</span></div>
    <div class="kv"><span>Winning Numbers</span><span class="numbers">${validNumbers(t.winningNumbers) ? numbersText(t.winningNumbers) : "Pending"}</span></div>
    <div class="kv"><span>Matches</span><span>${t.matchedCount}</span></div>
    <div class="kv"><span>Prize</span><span>${money(t.prizeAmount)}</span></div>
    <div class="status-strip">${t.claimed?`<span class="badge green">Claimed ${money(t.prizeAmount)}</span>`:""}${t.centerVerified?`<span class="badge green">Claiming Center Verified</span>`:""}</div>
    ${centerMsg}
    <div class="btn-row mt no-print">${claimButton}</div>
  </div>`;
}
window.claimPrize = function(orderId, ticketId){
  const order = state.orders.find(o => o.id === orderId);
  const ticket = order?.tickets.find(t => t.id === ticketId);
  if(!ticket) return toast("Ticket not found.", "error");
  if(ticket.prizeAmount > 599) return toast("This prize requires claiming center verification.", "warn");
  const method = prompt("Deposit winnings to PayPal, Venmo, or Bank Account:", order.paymentMethod || "PayPal");
  if(!method) return;
  if(!["PayPal","Venmo","Bank Account"].includes(method)) return toast("Allowed deposit methods are PayPal, Venmo, or Bank Account.", "error");
  ticket.claimed = true;
  ticket.claimedAt = nowISO();
  ticket.payoutMethod = method;
  ticket.status = "Claimed Online";
  const claim = { id: uid("claim"), userId: order.userId, orderId, ticketId, amount: ticket.prizeAmount, method, status:"Deposited", createdAt: nowISO() };
  state.claims.unshift(claim);
  save();
  const user = state.users.find(u => u.id === order.userId);
  sendEmail(user.email, "LPS winnings claim confirmation", `Your prize claim of ${money(ticket.prizeAmount)} for ${ticket.ticketNumber} has been deposited to ${method}.`, "claim");
  logActivity("Customer", `${user.email} claimed ${money(ticket.prizeAmount)} online.`);
  toast("Prize claimed and deposit confirmation sent.", "success");
  render();
};
function renderPreviousWinners(){
  const rows = state.tickets.map(t => `<tr><td>${esc(t.name)}</td><td>${fmtDate(t.drawingDate)}</td><td><div class="numbers">${validNumbers(t.winningNumbers)?numbersText(t.winningNumbers):"Pending"}</div></td><td>${money(t.prizeAmount)}</td></tr>`).join("");
  return `${pageTitle("Previous Winning Numbers", "Browse the winning numbers entered by the administrator for each current ticket type.")}
  <div class="card"><div class="table-wrap"><table><thead><tr><th>Ticket</th><th>Drawing Date</th><th>Winning Numbers</th><th>Prize Amount</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}
function renderProfile(){
  const user = getCurrentUser();
  return `${pageTitle("Profile Management", "View and update your customer information.")}
  <form class="card form-grid" onsubmit="updateProfile(event)">
    <div class="form-row"><div class="field"><label>Full name</label><input name="fullName" required value="${esc(user.fullName)}"></div><div class="field"><label>Email</label><input disabled value="${esc(user.email)}"><small>Email cannot be changed because it is used as the username.</small></div></div>
    <div class="field"><label>Home address</label><input name="address" required value="${esc(user.address)}"></div>
    <div class="field"><label>Phone</label><input name="phone" required value="${esc(user.phone)}"></div>
    <button class="btn primary" type="submit">Save profile</button>
  </form>
  <form class="card form-grid mt" onsubmit="changePassword(event)">
    <h3>Change Password</h3><div class="form-row"><div class="field"><label>New password</label><input name="password" type="password" minlength="8" required></div><div class="field"><label>Confirm password</label><input name="confirm" type="password" minlength="8" required></div></div><button class="btn light" type="submit">Update password</button>
  </form>`;
}
window.updateProfile = function(event){ event.preventDefault(); const user = getCurrentUser(); const form = new FormData(event.target); user.fullName = form.get("fullName"); user.address = form.get("address"); user.phone = form.get("phone"); user.updatedAt = nowISO(); save(); toast("Profile updated.", "success"); render(); };
window.changePassword = async function(event){ event.preventDefault(); const form = new FormData(event.target); const p = String(form.get("password")); if(p !== String(form.get("confirm"))) return toast("Passwords do not match.", "error"); const user = getCurrentUser(); user.passwordHash = await sha256(p); user.updatedAt = nowISO(); save(); toast("Password updated.", "success"); render(); };

function renderAdminApp(){
  const nav = [navButton("dashboard","Dashboard"), navButton("manage","Manage Tickets"), navButton("claims","Claiming Center"), navButton("reports","Regulatory Reports"), navButton("emails","Email Service"), navButton("customers","Customers")].join("");
  app.innerHTML = renderHeader(nav) + `<div class="shell">${renderAdminView()}</div>`;
}
function renderAdminView(){
  if(view === "manage") return renderManageTickets();
  if(view === "claims") return renderClaimingCenter();
  if(view === "reports") return renderRegulatoryReports();
  if(view === "emails") return renderEmailCenter();
  if(view === "customers") return renderCustomers();
  return renderAdminDashboard();
}
function metrics(){
  const sold = state.orders.reduce((sum,o)=>sum+o.tickets.length,0);
  const revenue = state.orders.reduce((sum,o)=>sum+o.total,0);
  const winnings = state.orders.flatMap(o=>o.tickets).reduce((sum,t)=>sum+t.prizeAmount,0);
  const claims = state.claims.reduce((sum,c)=>sum+c.amount,0);
  return { sold, revenue, winnings, claims };
}
function renderAdminDashboard(){
  const m = metrics();
  return `${pageTitle("System Admin Dashboard", "Manage the full LPS from a dedicated graphical admin interface. Admin never needs to edit files, databases, or code.", `<button class="btn red" onclick="resetState()">Reset local demo data</button>`)}
  <div class="grid four">
    <div class="card metric"><div><span>Total tickets sold</span><strong>${m.sold}</strong></div></div>
    <div class="card metric"><div><span>Total revenue</span><strong>${money(m.revenue)}</strong></div></div>
    <div class="card metric"><div><span>Registered customers</span><strong>${state.users.length}</strong></div></div>
    <div class="card metric"><div><span>Email messages</span><strong>${state.emails.length}</strong></div></div>
  </div>
  <div class="grid two mt">
    <div class="card"><h3>Recent Activity</h3>${state.activity.length?`<div class="table-wrap"><table><thead><tr><th>Time</th><th>Actor</th><th>Activity</th></tr></thead><tbody>${state.activity.slice(0,10).map(a=>`<tr><td>${new Date(a.createdAt).toLocaleString()}</td><td>${esc(a.actor)}</td><td>${esc(a.message)}</td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">No activity yet.</div>`}</div>
    <div class="card dark-card"><h3>Admin Functions</h3><p>Use Manage Tickets to add, delete, change prices, set winning amounts, and enter winning numbers. Use Claiming Center to verify $600+ tickets. Use Regulatory Reports to produce IRS/compliance records.</p><div class="btn-row"><button class="btn gold" onclick="go('manage')">Manage Tickets</button><button class="btn ghost" onclick="go('claims')">Claiming Center</button></div></div>
  </div>`;
}
function renderManageTickets(){
  return `${pageTitle("Manage Tickets", "View, add, edit, remove tickets, change prices, set prize amounts, drawing dates, and winning numbers.")}
  <div class="grid two">
    <form class="card form-grid" onsubmit="addTicket(event)">
      <h3>Add New Ticket</h3>
      <div class="form-row"><div class="field"><label>Ticket name</label><input name="name" required placeholder="New Lottery Game"></div><div class="field"><label>Price</label><input name="price" type="number" min="0.01" step="0.01" required></div></div>
      <div class="form-row"><div class="field"><label>Prize amount</label><input name="prizeAmount" type="number" min="1" step="1" required></div><div class="field"><label>Drawing date</label><input name="drawingDate" type="date" required value="${nextFriday()}"></div></div>
      <div class="field"><label>Winning numbers (optional)</label><input name="winningNumbers" placeholder="1, 2, 3, 4, 5"><small>Exactly five unique numbers from 1 to 50.</small></div>
      <button class="btn primary" type="submit">Add ticket</button>
    </form>
    <div class="card"><h3>Current Tickets</h3><div class="notice">When you save winning numbers, LPS recalculates all matching customer tickets and sends winner notification emails.</div></div>
  </div>
  <div class="grid two mt">${state.tickets.map(t => renderTicketAdminCard(t)).join("")}</div>`;
}
function renderTicketAdminCard(t){
  return `<form class="card form-grid" onsubmit="updateTicket(event,'${t.id}')">
    <div class="btn-row" style="justify-content:space-between"><h3>${esc(t.name)}</h3><span class="badge ${t.active?"green":"gray"}">${t.active?"Active":"Inactive"}</span></div>
    <div class="form-row"><div class="field"><label>Name</label><input name="name" required value="${esc(t.name)}"></div><div class="field"><label>Price</label><input name="price" type="number" min="0.01" step="0.01" required value="${Number(t.price)}"></div></div>
    <div class="form-row"><div class="field"><label>Prize amount</label><input name="prizeAmount" type="number" min="1" step="1" required value="${Number(t.prizeAmount)}"></div><div class="field"><label>Drawing date</label><input name="drawingDate" type="date" required value="${esc(t.drawingDate)}"></div></div>
    <div class="field"><label>Winning numbers</label><input name="winningNumbers" required value="${(t.winningNumbers||[]).join(', ')}"></div>
    <div class="field"><label>Status</label><select name="active"><option value="true" ${t.active?"selected":""}>Active</option><option value="false" ${!t.active?"selected":""}>Inactive</option></select></div>
    <div class="btn-row"><button class="btn primary" type="submit">Save changes</button><button class="btn red" type="button" onclick="deleteTicket('${t.id}')">Remove ticket</button></div>
  </form>`;
}
window.addTicket = function(event){
  event.preventDefault(); const form = new FormData(event.target); const nums = parseNumbers(form.get("winningNumbers")); if(nums.length && !validNumbers(nums)) return toast("Winning numbers must be five unique numbers from 1 to 50.", "error");
  const ticket = { id:uid("ticket"), name:String(form.get("name")).trim(), price:Number(form.get("price")), prizeAmount:Number(form.get("prizeAmount")), drawingDate:String(form.get("drawingDate")), active:true, winningNumbers: nums.length ? nums.sort((a,b)=>a-b) : [], updatedAt:nowISO() };
  state.tickets.push(ticket); save(); logActivity("Administrator", `Added ticket ${ticket.name}.`); toast("Ticket added.", "success"); render();
};
window.updateTicket = async function(event, id){
  event.preventDefault(); const ticket = state.tickets.find(t=>t.id===id); if(!ticket) return; const form = new FormData(event.target); const oldNums = JSON.stringify(ticket.winningNumbers || []); const nums = parseNumbers(form.get("winningNumbers")); if(!validNumbers(nums)) return toast("Winning numbers must be five unique numbers from 1 to 50.", "error");
  ticket.name = String(form.get("name")).trim(); ticket.price = Number(form.get("price")); ticket.prizeAmount = Number(form.get("prizeAmount")); ticket.drawingDate = String(form.get("drawingDate")); ticket.active = form.get("active") === "true"; ticket.winningNumbers = nums.sort((a,b)=>a-b); ticket.updatedAt = nowISO();
  save(); logActivity("Administrator", `Updated ticket ${ticket.name}.`);
  if(oldNums !== JSON.stringify(ticket.winningNumbers)) await recalculateWinners(ticket.id);
  toast("Ticket updated.", "success"); render();
};
window.deleteTicket = function(id){
  const ticket = state.tickets.find(t=>t.id===id); if(!ticket) return; if(!confirm(`Remove ${ticket.name} from the platform? Existing purchased e-tickets remain in order history.`)) return; ticket.active = false; save(); logActivity("Administrator", `Removed/deactivated ticket ${ticket.name}.`); toast("Ticket deactivated.", "success"); render();
};
async function recalculateWinners(ticketId){
  const ticket = state.tickets.find(t=>t.id===ticketId); if(!ticket) return;
  let winners = 0;
  for(const order of state.orders){
    const user = state.users.find(u=>u.id===order.userId);
    for(const line of order.tickets.filter(t=>t.ticketId===ticketId)){
      const result = evaluateTicket(line.numbers, ticket);
      line.winningNumbers = ticket.winningNumbers;
      line.matchedCount = result.matchedCount;
      line.prizeAmount = result.prizeAmount;
      line.status = result.prizeAmount > 0 ? (result.prizeAmount >= 600 ? "Winner - Claiming Center Required" : "Winner - Online Claim Available") : "Not a Winner";
      if(result.prizeAmount > 0 && !line.winnerNotified && user){ winners++; await notifyWinner(user, order, line); }
    }
  }
  save(); logActivity("Administrator", `Winning numbers updated for ${ticket.name}; ${winners} new winner notification(s) sent.`);
}
function renderClaimingCenter(){
  return `${pageTitle("Claiming Center", "Verify electronic tickets for prizes of $600 or more using ticket number or confirmation number. This satisfies the project feedback about Claiming Center functionality.")}
  <div class="card mb"><div class="field"><label>Search ticket / confirmation number</label><input id="claimSearch" placeholder="LPS-ABCD-12345 or TX-123456789" oninput="renderClaimSearch(this.value)"></div></div>
  <div id="claimResults">${renderClaimResults("")}</div>`;
}
window.renderClaimSearch = function(value){ document.getElementById("claimResults").innerHTML = renderClaimResults(value); };
function allPurchasedTickets(){ return state.orders.flatMap(order => order.tickets.map(ticket => ({ order, ticket, user: state.users.find(u=>u.id===order.userId) }))); }
function renderClaimResults(query){
  const q = String(query||"").trim().toLowerCase();
  const matches = allPurchasedTickets().filter(x => !q || x.ticket.ticketNumber.toLowerCase().includes(q) || x.ticket.confirmationNumber.toLowerCase().includes(q)).slice(0,20);
  if(!matches.length) return `<div class="empty">No matching electronic tickets found.</div>`;
  return `<div class="grid two">${matches.map(({order,ticket,user}) => `<div class="card">
    <h3>${esc(ticket.ticketName)}</h3><div class="kv"><span>Customer</span><span>${esc(user?.fullName || "Unknown")} (${esc(user?.email || "")})</span></div><div class="kv"><span>Ticket</span><span>${esc(ticket.ticketNumber)}</span></div><div class="kv"><span>Confirmation</span><span>${esc(ticket.confirmationNumber)}</span></div><div class="kv"><span>Prize</span><span>${money(ticket.prizeAmount)}</span></div><div class="kv"><span>Status</span><span>${esc(ticket.status)}</span></div>
    <div class="numbers mt">${numbersText(ticket.numbers)}</div>
    ${ticket.prizeAmount >= 600 && !ticket.centerVerified ? `<button class="btn primary mt" onclick="verifyAtClaimingCenter('${order.id}','${ticket.id}')">Verify $600+ Claim</button>` : ticket.centerVerified ? `<div class="notice success mt">Claiming Center verified. Regulatory report created.</div>` : `<div class="notice mt">This prize is below $600 or not a winning ticket; online claim page handles eligible small prizes.</div>`}
  </div>`).join("")}</div>`;
}
window.verifyAtClaimingCenter = async function(orderId, ticketId){
  const order = state.orders.find(o=>o.id===orderId); const ticket = order?.tickets.find(t=>t.id===ticketId); const user = state.users.find(u=>u.id===order?.userId); if(!ticket || !user) return;
  ticket.centerVerified = true; ticket.status = "Claiming Center Verified"; const report = { id:uid("report"), userId:user.id, customerName:user.fullName, customerEmail:user.email, orderId, ticketId, ticketNumber:ticket.ticketNumber, confirmationNumber:ticket.confirmationNumber, prizeAmount:ticket.prizeAmount, verifiedAt:nowISO(), reportStatus:"Ready for IRS / Regulatory Agency" };
  state.regulatoryReports.unshift(report); save(); await sendEmail(user.email, "LPS claiming center verification complete", `Your prize ${money(ticket.prizeAmount)} for ticket ${ticket.ticketNumber} has been verified at the claiming center. Tax/regulatory reporting has been prepared.`, "claiming-center"); logActivity("Claiming Center", `Verified ${ticket.ticketNumber} for ${money(ticket.prizeAmount)} and created regulatory report.`); toast("Ticket verified and regulatory report created.", "success"); render();
};
function renderRegulatoryReports(){
  return `${pageTitle("Regulatory Reports", "Prepare tax and regulatory reporting records for $600+ verified prize claims. This represents the Regulatory Agency/IRS data flow.", `<button class="btn light" onclick="exportReports()">Export JSON</button>`)}
  <div class="card">${!state.regulatoryReports.length ? `<div class="empty">No $600+ regulatory reports yet. Verify a winning ticket in Claiming Center to generate one.</div>` : `<div class="table-wrap"><table><thead><tr><th>Verified</th><th>Customer</th><th>Ticket</th><th>Prize</th><th>Status</th></tr></thead><tbody>${state.regulatoryReports.map(r=>`<tr><td>${new Date(r.verifiedAt).toLocaleString()}</td><td>${esc(r.customerName)}<br><span class="text-muted">${esc(r.customerEmail)}</span></td><td>${esc(r.ticketNumber)}<br><span class="text-muted">${esc(r.confirmationNumber)}</span></td><td>${money(r.prizeAmount)}</td><td><span class="badge purple">${esc(r.reportStatus)}</span></td></tr>`).join("")}</tbody></table></div>`}</div>`;
}
window.exportReports = function(){
  const blob = new Blob([JSON.stringify(state.regulatoryReports,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "lps-regulatory-reports.json"; a.click(); URL.revokeObjectURL(url);
};
function renderEmailCenter(){
  return `${pageTitle("Internal Email Service", "LPS logs and sends verification codes, purchase confirmations, winner notifications, claim confirmations, and claiming center messages. Real sending works when the Vercel email API key is configured.")}
  <div class="card mb"><div class="notice ${state.emails.some(e=>e.status==='sent')?"success":"warn"}">Current mode: ${state.emails.some(e=>e.status==='sent') ? "Real email sent through /api/send-email" : "Simulation/local mail queue. Configure RESEND_API_KEY and RESEND_FROM_EMAIL in Vercel to send real email."}</div></div>
  <div class="card">${!state.emails.length ? `<div class="empty">No emails have been sent yet.</div>` : `<div class="table-wrap"><table><thead><tr><th>Time</th><th>To</th><th>Category</th><th>Subject / Body</th><th>Status</th></tr></thead><tbody>${state.emails.map(e=>`<tr><td>${new Date(e.createdAt).toLocaleString()}</td><td>${esc(e.to)}</td><td><span class="badge gray">${esc(e.category)}</span></td><td><strong>${esc(e.subject)}</strong><br><span class="text-muted">${esc(e.body)}</span></td><td><span class="badge ${e.status==='sent'?"green":e.status==='failed'?"red":"gold"}">${esc(e.status)}</span><br><span class="text-muted">${esc(e.providerMessage)}</span></td></tr>`).join("")}</tbody></table></div>`}</div>`;
}
function renderCustomers(){
  return `${pageTitle("Customer Accounts", "View registered customer accounts and verification status. Customers create their own accounts; there are no preloaded customer demo accounts.")}
  <div class="card">${!state.users.length ? `<div class="empty">No customers registered yet.</div>` : `<div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Verified</th><th>Orders</th></tr></thead><tbody>${state.users.map(u=>`<tr><td>${esc(u.fullName)}</td><td>${esc(u.email)}</td><td>${esc(u.phone)}</td><td><span class="badge ${u.verified?"green":"red"}">${u.verified?"Verified":"Pending"}</span></td><td>${state.orders.filter(o=>o.userId===u.id).length}</td></tr>`).join("")}</tbody></table></div>`}</div>`;
}
render();
