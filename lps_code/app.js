const STORAGE_KEY = "lps_web_app_v3";
const MAX_TICKETS_PER_ORDER = 10;
let route = "home";
let authTab = "login";
let selectedTicketId = null;
let purchaseQuantity = 1;
let verifyResult = null;
let adminEditId = null;

const $ = (id) => document.getElementById(id);
const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const todayIso = () => new Date().toISOString();
const displayDate = (iso) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

function nextWeekDate(daysAhead = 7) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

function hashPassword(password) {
  let hash = 5381;
  const text = String(password || "");
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash) + text.charCodeAt(i);
  return `h${Math.abs(hash)}`;
}

function randomId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

function randomNumbers() {
  const nums = new Set();
  while (nums.size < 5) nums.add(Math.floor(Math.random() * 50) + 1);
  return [...nums].sort((a, b) => a - b);
}

function defaultTickets() {
  return [
    { id: "power-ball", name: "Power Ball", price: 2.00, jackpot: 5000, drawDate: nextWeekDate(3), active: true, winningNumbers: [], description: "High prize drawing with five numbers from 1-50." },
    { id: "mega-millions", name: "Mega Millions", price: 2.00, jackpot: 2500, drawDate: nextWeekDate(4), active: true, winningNumbers: [], description: "Popular weekly ticket with online purchase and e-ticket generation." },
    { id: "lotto-texas", name: "Lotto Texas", price: 1.00, jackpot: 500, drawDate: nextWeekDate(5), active: true, winningNumbers: [], description: "Lower cost lottery ticket with the same five-number rules." },
    { id: "texas-two-step", name: "Texas Two Step", price: 1.50, jackpot: 750, drawDate: nextWeekDate(6), active: true, winningNumbers: [], description: "Texas themed weekly ticket available through LPS." }
  ];
}

function defaultState() {
  return {
    users: [],
    tickets: defaultTickets(),
    orders: [],
    claims: [],
    notifications: [],
    activities: [
      { id: randomId("ACT"), at: todayIso(), actor: "System", message: "LPS initialized with four lottery ticket types." }
    ],
    sessionEmail: null
  };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultState();
  try {
    const state = JSON.parse(raw);
    if (!state.users || !state.tickets || !state.orders) return defaultState();
    return state;
  } catch {
    return defaultState();
  }
}

let state = loadState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function addActivity(actor, message) {
  state.activities.unshift({ id: randomId("ACT"), at: todayIso(), actor, message });
  state.activities = state.activities.slice(0, 80);
}

function currentUser() {
  const email = normalizeEmail(state.sessionEmail);
  return state.users.find((u) => u.email === email) || null;
}

function isAdminCreated() {
  return state.users.some((u) => u.role === "admin");
}

function activeTickets() {
  return state.tickets.filter((t) => t.active !== false);
}

function calculatePrize(ticket, chosenNumbers) {
  if (!ticket || !Array.isArray(ticket.winningNumbers) || ticket.winningNumbers.length !== 5) {
    return { status: "Pending Drawing", matches: 0, prize: 0, winningNumbers: [] };
  }
  const winningSet = new Set(ticket.winningNumbers.map(Number));
  const matches = chosenNumbers.filter((n) => winningSet.has(Number(n))).length;
  const jackpot = Number(ticket.jackpot || 0);
  let multiplier = 0;
  if (matches === 5) multiplier = 1;
  else if (matches === 4) multiplier = 0.20;
  else if (matches === 3) multiplier = 0.05;
  else if (matches === 2) multiplier = 0.01;
  const prize = Number((jackpot * multiplier).toFixed(2));
  return {
    status: prize > 0 ? "Winner" : "Not Winning",
    matches,
    prize,
    winningNumbers: [...ticket.winningNumbers]
  };
}

function recalculateOrdersForTicket(ticketId) {
  const ticket = state.tickets.find((t) => t.id === ticketId);
  state.orders.forEach((order) => {
    if (order.ticketTypeId !== ticketId) return;
    order.eTickets.forEach((et) => {
      const result = calculatePrize(ticket, et.numbers);
      const oldPrize = Number(et.prize || 0);
      et.status = result.status;
      et.matches = result.matches;
      et.prize = result.prize;
      et.winningNumbers = result.winningNumbers;
      if (result.prize > 0 && oldPrize !== result.prize) {
        et.claimStatus = result.prize <= 599 ? "Available for Online Claim" : "Claim at Center Required";
        const user = state.users.find((u) => u.email === order.userEmail);
        state.notifications.unshift({
          id: randomId("MSG"),
          userEmail: order.userEmail,
          at: todayIso(),
          subject: "Winner Notification",
          message: `Congratulations${user ? `, ${user.name}` : ""}! Ticket ${et.ticketNumber} matched ${result.matches} numbers for ${money(result.prize)}.`,
          read: false
        });
      }
    });
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function badge(text, color = "blue") {
  return `<span class="badge ${color}">${escapeHtml(text)}</span>`;
}

function setRoute(newRoute) {
  route = newRoute;
  verifyResult = null;
  adminEditId = null;
  render();
}

function setAuthTab(tab) {
  authTab = tab;
  render();
}

function showMessage(text, type = "notice") {
  const el = $("form-message");
  if (el) el.innerHTML = `<div class="${type}">${escapeHtml(text)}</div>`;
}

function resetLocalData() {
  const ok = confirm("This clears all local LPS users, orders, claims, and activity in this browser. Continue?");
  if (!ok) return;
  localStorage.removeItem(STORAGE_KEY);
  state = defaultState();
  route = "home";
  authTab = "login";
  render();
}

function login(event) {
  event.preventDefault();
  const email = normalizeEmail($("login-email").value);
  const password = $("login-password").value;
  const user = state.users.find((u) => u.email === email && u.passwordHash === hashPassword(password));
  if (!user) {
    showMessage("Login failed. Check the email and password you created, then try again.", "alert");
    return;
  }
  state.sessionEmail = user.email;
  addActivity(user.name, `${user.role === "admin" ? "Administrator" : "Customer"} logged in.`);
  saveState();
  route = user.role === "admin" ? "admin-dashboard" : "home";
  render();
}

function registerCustomer(event) {
  event.preventDefault();
  const name = $("reg-name").value.trim();
  const email = normalizeEmail($("reg-email").value);
  const phone = $("reg-phone").value.trim();
  const address = $("reg-address").value.trim();
  const password = $("reg-password").value;
  if (!name || !email || !phone || !address || !password) {
    showMessage("Please complete every registration field.", "alert");
    return;
  }
  if (password.length < 6) {
    showMessage("Password must be at least 6 characters.", "alert");
    return;
  }
  if (state.users.some((u) => u.email === email)) {
    showMessage("That email already has an account. Use Login instead.", "alert");
    return;
  }
  state.users.push({ id: randomId("USR"), role: "customer", name, email, phone, address, passwordHash: hashPassword(password), createdAt: todayIso() });
  state.sessionEmail = email;
  addActivity(name, "Customer account created and logged in.");
  saveState();
  route = "home";
  render();
}

function createAdmin(event) {
  event.preventDefault();
  if (isAdminCreated()) {
    showMessage("An admin account already exists. Please log in with that admin account.", "alert");
    return;
  }
  const name = $("admin-name").value.trim();
  const email = normalizeEmail($("admin-email").value);
  const password = $("admin-password").value;
  if (!name || !email || !password) {
    showMessage("Please enter admin name, email, and password.", "alert");
    return;
  }
  if (password.length < 6) {
    showMessage("Admin password must be at least 6 characters.", "alert");
    return;
  }
  state.users.push({ id: randomId("ADM"), role: "admin", name, email, phone: "", address: "Texas Lottery Commission", passwordHash: hashPassword(password), createdAt: todayIso() });
  state.sessionEmail = email;
  addActivity(name, "Administrator account created through first-time admin setup.");
  saveState();
  route = "admin-dashboard";
  render();
}

function logout() {
  const user = currentUser();
  if (user) addActivity(user.name, "Logged out.");
  state.sessionEmail = null;
  saveState();
  route = "home";
  authTab = "login";
  render();
}

function updateProfile(event) {
  event.preventDefault();
  const user = currentUser();
  if (!user) return;
  user.name = $("profile-name").value.trim();
  user.phone = $("profile-phone").value.trim();
  user.address = $("profile-address").value.trim();
  const newPassword = $("profile-password").value;
  if (newPassword) {
    if (newPassword.length < 6) {
      alert("New password must be at least 6 characters.");
      return;
    }
    user.passwordHash = hashPassword(newPassword);
  }
  addActivity(user.name, "Updated profile information.");
  saveState();
  alert("Profile updated successfully.");
  render();
}

function startPurchase(ticketId) {
  selectedTicketId = ticketId;
  purchaseQuantity = 1;
  route = "purchase";
  render();
}

function updatePurchaseQuantity() {
  const qty = Math.max(1, Math.min(MAX_TICKETS_PER_ORDER, Number($("purchase-qty").value || 1)));
  purchaseQuantity = qty;
  render();
}

function autoSelectTicket(index) {
  const nums = randomNumbers();
  nums.forEach((n, j) => {
    const input = $(`num-${index}-${j}`);
    if (input) input.value = n;
  });
}

function autoSelectAllTickets() {
  for (let i = 0; i < purchaseQuantity; i++) autoSelectTicket(i);
}

function readNumberSelections() {
  const all = [];
  for (let i = 0; i < purchaseQuantity; i++) {
    const nums = [];
    for (let j = 0; j < 5; j++) {
      const raw = $(`num-${i}-${j}`).value;
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 1 || n > 50) {
        return { ok: false, message: `Ticket ${i + 1} has an invalid number. Enter whole numbers from 1 to 50.` };
      }
      nums.push(n);
    }
    if (new Set(nums).size !== 5) {
      return { ok: false, message: `Ticket ${i + 1} has duplicate numbers. Choose five different numbers.` };
    }
    all.push(nums.sort((a, b) => a - b));
  }
  return { ok: true, numbersList: all };
}

function confirmPurchase(event) {
  event.preventDefault();
  const user = currentUser();
  const ticket = state.tickets.find((t) => t.id === selectedTicketId);
  if (!user || !ticket) return;
  const selections = readNumberSelections();
  if (!selections.ok) {
    alert(selections.message);
    return;
  }
  const method = document.querySelector("input[name='payment-method']:checked")?.value;
  const paymentRef = $("payment-ref").value.trim();
  if (!method || !paymentRef) {
    alert("Select a payment method and enter the linked account/email/reference.");
    return;
  }
  const orderId = randomId("ORD");
  const eTickets = selections.numbersList.map((nums) => {
    const result = calculatePrize(ticket, nums);
    return {
      ticketNumber: randomId("TKT"),
      confirmationNumber: randomId("CNF"),
      numbers: nums,
      status: result.status,
      matches: result.matches,
      prize: result.prize,
      winningNumbers: result.winningNumbers,
      claimStatus: result.prize > 0 ? (result.prize <= 599 ? "Available for Online Claim" : "Claim at Center Required") : "Not Eligible"
    };
  });
  const order = {
    id: orderId,
    userEmail: user.email,
    ticketTypeId: ticket.id,
    ticketName: ticket.name,
    unitPrice: Number(ticket.price),
    total: Number((Number(ticket.price) * purchaseQuantity).toFixed(2)),
    paymentMethod: method,
    paymentReferenceMasked: maskPayment(paymentRef),
    purchasedAt: todayIso(),
    eTickets
  };
  state.orders.unshift(order);
  state.notifications.unshift({
    id: randomId("MSG"),
    userEmail: user.email,
    at: todayIso(),
    subject: "Purchase Confirmation",
    message: `Your ${ticket.name} order ${order.id} was completed. ${eTickets.length} electronic ticket(s) were generated.`,
    read: false
  });
  addActivity(user.name, `Purchased ${purchaseQuantity} ${ticket.name} ticket(s) for ${money(order.total)} using ${method}.`);
  saveState();
  route = "orders";
  render();
}

function maskPayment(value) {
  const text = String(value || "").trim();
  if (text.includes("@")) {
    const [name, domain] = text.split("@");
    return `${name.slice(0, 2)}***@${domain}`;
  }
  return `****${text.slice(-4)}`;
}

function markMessagesRead() {
  const user = currentUser();
  if (!user) return;
  state.notifications.forEach((n) => {
    if (n.userEmail === user.email) n.read = true;
  });
  saveState();
  render();
}

function claimOnline(orderId, ticketNumber) {
  const user = currentUser();
  const order = state.orders.find((o) => o.id === orderId && o.userEmail === user.email);
  const et = order?.eTickets.find((t) => t.ticketNumber === ticketNumber);
  if (!et || et.prize <= 0 || et.prize > 599) return;
  const method = prompt("Deposit method for online claim: PayPal, Venmo, or Bank", "PayPal");
  if (!method) return;
  const allowed = ["paypal", "venmo", "bank"];
  if (!allowed.includes(method.trim().toLowerCase())) {
    alert("Only PayPal, Venmo, or Bank are allowed.");
    return;
  }
  et.claimStatus = "Claimed Online";
  const claim = {
    id: randomId("CLM"),
    orderId,
    ticketNumber,
    userEmail: user.email,
    amount: et.prize,
    method,
    status: "Deposited",
    regulatoryReportStatus: "Not Required Under $600",
    createdAt: todayIso()
  };
  state.claims.unshift(claim);
  addActivity(user.name, `Claimed ${money(et.prize)} online for ticket ${ticketNumber}.`);
  saveState();
  render();
}

function saveTicket(event) {
  event.preventDefault();
  const user = currentUser();
  if (!user || user.role !== "admin") return;
  const name = $("ticket-name").value.trim();
  const price = Number($("ticket-price").value);
  const jackpot = Number($("ticket-jackpot").value);
  const drawDate = $("ticket-date").value;
  const active = $("ticket-active").value === "true";
  const description = $("ticket-description").value.trim();
  const winningNumbersText = $("ticket-winning").value.trim();
  const winningNumbers = winningNumbersText ? winningNumbersText.split(/[ ,]+/).filter(Boolean).map(Number) : [];
  if (!name || !Number.isFinite(price) || price <= 0 || !Number.isFinite(jackpot) || jackpot <= 0 || !drawDate) {
    alert("Please enter a valid name, price, prize amount, and draw date.");
    return;
  }
  if (winningNumbers.length && (winningNumbers.length !== 5 || winningNumbers.some((n) => !Number.isInteger(n) || n < 1 || n > 50) || new Set(winningNumbers).size !== 5)) {
    alert("Winning numbers must be exactly five unique whole numbers from 1 to 50.");
    return;
  }
  if (adminEditId) {
    const ticket = state.tickets.find((t) => t.id === adminEditId);
    Object.assign(ticket, { name, price, jackpot, drawDate, active, description, winningNumbers: winningNumbers.sort((a,b) => a-b) });
    recalculateOrdersForTicket(ticket.id);
    addActivity(user.name, `Updated ticket ${name}.`);
  } else {
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || randomId("ticket");
    state.tickets.unshift({ id: `${id}-${Date.now().toString(36)}`, name, price, jackpot, drawDate, active, description, winningNumbers: winningNumbers.sort((a,b) => a-b) });
    addActivity(user.name, `Added new ticket ${name}.`);
  }
  adminEditId = null;
  saveState();
  route = "manage-tickets";
  render();
}

function editTicket(ticketId) {
  adminEditId = ticketId;
  route = "manage-tickets";
  render();
}

function deleteTicket(ticketId) {
  const user = currentUser();
  const ticket = state.tickets.find((t) => t.id === ticketId);
  if (!ticket) return;
  const used = state.orders.some((o) => o.ticketTypeId === ticketId);
  if (used) {
    ticket.active = false;
    addActivity(user.name, `Deactivated ticket ${ticket.name} because purchase history exists.`);
  } else {
    state.tickets = state.tickets.filter((t) => t.id !== ticketId);
    addActivity(user.name, `Deleted ticket ${ticket.name}.`);
  }
  saveState();
  render();
}

function verifyClaimingCenter(event) {
  event.preventDefault();
  const ticketNumber = $("verify-ticket").value.trim().toUpperCase();
  const confirmationNumber = $("verify-confirmation").value.trim().toUpperCase();
  verifyResult = null;
  for (const order of state.orders) {
    const et = order.eTickets.find((t) => t.ticketNumber === ticketNumber && t.confirmationNumber === confirmationNumber);
    if (et) {
      const user = state.users.find((u) => u.email === order.userEmail);
      verifyResult = { order, et, user };
      break;
    }
  }
  render();
}

function approveCenterClaim(orderId, ticketNumber) {
  const admin = currentUser();
  const order = state.orders.find((o) => o.id === orderId);
  const et = order?.eTickets.find((t) => t.ticketNumber === ticketNumber);
  if (!et || Number(et.prize) < 600) return;
  et.claimStatus = "Verified at Claiming Center";
  const existing = state.claims.find((c) => c.ticketNumber === ticketNumber);
  if (!existing) {
    state.claims.unshift({
      id: randomId("CLM"),
      orderId,
      ticketNumber,
      userEmail: order.userEmail,
      amount: et.prize,
      method: "Claiming Center",
      status: "Verified",
      regulatoryReportStatus: "Pending Regulatory Report",
      createdAt: todayIso()
    });
  }
  addActivity(admin.name, `Verified claiming center prize ${money(et.prize)} for ticket ${ticketNumber}.`);
  saveState();
  verifyResult = null;
  render();
}

function markRegulatoryReported(claimId) {
  const admin = currentUser();
  const claim = state.claims.find((c) => c.id === claimId);
  if (!claim) return;
  claim.regulatoryReportStatus = "Reported to Regulatory Agency";
  claim.reportedAt = todayIso();
  addActivity(admin.name, `Reported claim ${claim.id} to Regulatory Agency for tax/compliance tracking.`);
  saveState();
  render();
}

function renderShell(content, active = route) {
  const user = currentUser();
  const unread = user ? state.notifications.filter((n) => n.userEmail === user.email && !n.read).length : 0;
  const isAdmin = user?.role === "admin";
  const navItems = isAdmin
    ? [
        ["admin-dashboard", "Dashboard"], ["manage-tickets", "Manage Tickets"], ["claiming-center", "Claiming Center"], ["regulatory", "Regulatory Reports"], ["activity", "Activity"], ["profile", "Profile"]
      ]
    : [
        ["home", "Home"], ["browse", "Browse"], ["search", "Search"], ["orders", "Orders"], ["messages", `Messages${unread ? ` (${unread})` : ""}`], ["profile", "Profile"]
      ];
  document.getElementById("app").innerHTML = `
    <div class="app-shell">
      <header class="topbar">
        <div class="topbar-inner">
          <div class="brand"><div class="logo-mark">LPS</div><div>Lottery Purchase System<br><small style="color: rgba(255,255,255,.68); font-weight:650;">${escapeHtml(user?.role === "admin" ? "Admin Console" : "Customer Portal")}</small></div></div>
          <nav class="nav">
            ${navItems.map(([id, label]) => `<button class="${active === id ? "active" : ""}" onclick="setRoute('${id}')">${escapeHtml(label)}</button>`).join("")}
            <button onclick="logout()">Logout</button>
          </nav>
        </div>
      </header>
      <main class="container">${content}</main>
    </div>
  `;
}

function renderAuth() {
  const ticketCount = state.tickets.length;
  const adminExists = isAdminCreated();
  document.getElementById("app").innerHTML = `
    <main class="container">
      <section class="hero">
        <div class="hero-card">
          <h1>Buy lottery tickets without waiting in line.</h1>
          <p>LPS is a polished web app prototype for online lottery ticket purchasing, e-ticket generation, online claims under $600, claiming center verification, and regulatory reporting.</p>
          <div class="stat-row">
            <div class="stat-pill"><strong>${ticketCount}</strong><span>Ticket Types</span></div>
            <div class="stat-pill"><strong>1-50</strong><span>Number Range</span></div>
            <div class="stat-pill"><strong>10</strong><span>Max Per Order</span></div>
          </div>
        </div>
        <div class="card">
          <div class="tabs">
            <button class="${authTab === "login" ? "active" : ""}" onclick="setAuthTab('login')">Login</button>
            <button class="${authTab === "register" ? "active" : ""}" onclick="setAuthTab('register')">Register</button>
            <button class="${authTab === "admin" ? "active" : ""}" onclick="setAuthTab('admin')">Admin Setup</button>
          </div>
          <div id="form-message"></div>
          ${authTab === "login" ? renderLoginForm() : authTab === "register" ? renderRegisterForm() : renderAdminSetupForm(adminExists)}
        </div>
      </section>
      <div class="footer-actions no-print">
        <span>No demo accounts are preloaded. Create your own customer account and first-time admin account.</span><br>
        <button onclick="resetLocalData()">Reset local app data</button>
      </div>
    </main>
  `;
}

function renderLoginForm() {
  return `
    <form onsubmit="login(event)" class="form-grid">
      <h2>Welcome back</h2>
      <p>Use the email and password you created. Emails are normalized so extra spaces/capital letters will not break login.</p>
      <div class="form-row"><label for="login-email">Email</label><input id="login-email" type="email" required autocomplete="email" /></div>
      <div class="form-row"><label for="login-password">Password</label><input id="login-password" type="password" required autocomplete="current-password" /></div>
      <button class="primary" type="submit">Log In</button>
    </form>
  `;
}

function renderRegisterForm() {
  return `
    <form onsubmit="registerCustomer(event)" class="form-grid">
      <h2>Create customer profile</h2>
      <div class="form-row"><label for="reg-name">Full Name</label><input id="reg-name" required /></div>
      <div class="form-row"><label for="reg-email">Email</label><input id="reg-email" type="email" required /></div>
      <div class="form-row"><label for="reg-phone">Phone Number</label><input id="reg-phone" required /></div>
      <div class="form-row"><label for="reg-address">Home Address</label><input id="reg-address" required /></div>
      <div class="form-row"><label for="reg-password">Password</label><input id="reg-password" type="password" minlength="6" required /></div>
      <button class="primary" type="submit">Create Account & Enter LPS</button>
    </form>
  `;
}

function renderAdminSetupForm(adminExists) {
  if (adminExists) {
    return `
      <div class="alert">An admin account already exists in this browser's LPS data. Log in with that admin email and password to access the admin dashboard.</div>
      ${renderLoginForm()}
    `;
  }
  return `
    <form onsubmit="createAdmin(event)" class="form-grid">
      <h2>First-time admin setup</h2>
      <p>Create your own admin credentials. No hardcoded admin password is included.</p>
      <div class="form-row"><label for="admin-name">Admin Name</label><input id="admin-name" required /></div>
      <div class="form-row"><label for="admin-email">Admin Email</label><input id="admin-email" type="email" required /></div>
      <div class="form-row"><label for="admin-password">Admin Password</label><input id="admin-password" type="password" minlength="6" required /></div>
      <button class="primary" type="submit">Create Admin Account</button>
    </form>
  `;
}

function renderCustomerHome() {
  const user = currentUser();
  const orders = state.orders.filter((o) => o.userEmail === user.email);
  const wins = orders.flatMap((o) => o.eTickets).filter((t) => Number(t.prize) > 0).length;
  const unread = state.notifications.filter((n) => n.userEmail === user.email && !n.read).length;
  return renderShell(`
    <div class="notice">Welcome, <strong>${escapeHtml(user.name)}</strong>. You can browse tickets, buy up to ten tickets per transaction, and view generated e-tickets in Order History.</div>
    <section class="grid-3">
      <div class="kpi"><span>Total Orders</span><strong>${orders.length}</strong></div>
      <div class="kpi"><span>Winning E-Tickets</span><strong>${wins}</strong></div>
      <div class="kpi"><span>Unread Messages</span><strong>${unread}</strong></div>
    </section>
    <div class="divider"></div>
    <section class="grid-3">
      <div class="card"><h3>Browse Tickets</h3><p>View active lottery tickets, drawing dates, prices, and prize amounts.</p><button class="primary" onclick="setRoute('browse')">Browse Now</button></div>
      <div class="card"><h3>Order History</h3><p>Return later and your purchases will still be saved in this browser.</p><button class="secondary" onclick="setRoute('orders')">View Orders</button></div>
      <div class="card"><h3>Previous Winners</h3><p>See winning numbers after an administrator enters official results.</p><button class="secondary" onclick="setRoute('previous-winners')">View Numbers</button></div>
    </section>
  `, "home");
}

function renderBrowse() {
  return renderShell(`
    <h1>Browse Lottery Tickets</h1>
    <p class="muted">Choose a ticket, manually enter five numbers, or auto-select random numbers.</p>
    <section class="grid-4">${activeTickets().map(renderTicketCard).join("")}</section>
  `, "browse");
}

function renderTicketCard(ticket) {
  const hasWinning = ticket.winningNumbers?.length === 5;
  return `
    <article class="card ticket-card">
      <div class="ticket-title">${escapeHtml(ticket.name)}</div>
      <span class="badge blue">${money(ticket.price)} per ticket</span>
      <p>${escapeHtml(ticket.description || "Five numbers from 1 to 50.")}</p>
      <div><strong>Drawing:</strong> ${escapeHtml(ticket.drawDate)}</div>
      <div><strong>Prize Amount:</strong> ${money(ticket.jackpot)}</div>
      <div>${hasWinning ? badge(`Winning: ${ticket.winningNumbers.join(", ")}`, "green") : badge("Winning numbers pending", "orange")}</div>
      <div style="margin-top:auto;"><button class="primary" onclick="startPurchase('${ticket.id}')">Buy Ticket</button></div>
    </article>
  `;
}

function renderSearch() {
  return renderShell(`
    <h1>Search Tickets</h1>
    <div class="card">
      <div class="form-row"><label for="search-input">Search by ticket name</label><input id="search-input" oninput="renderSearchResults()" placeholder="Example: Mega Millions" /></div>
    </div>
    <div id="search-results" style="margin-top:18px;" class="grid-4">${activeTickets().map(renderTicketCard).join("")}</div>
  `, "search");
}

function renderSearchResults() {
  const q = $("search-input").value.trim().toLowerCase();
  const matches = activeTickets().filter((t) => t.name.toLowerCase().includes(q));
  $("search-results").innerHTML = matches.length ? matches.map(renderTicketCard).join("") : `<div class="empty-state">No tickets matched your search.</div>`;
}

function renderPurchase() {
  const ticket = state.tickets.find((t) => t.id === selectedTicketId) || activeTickets()[0];
  selectedTicketId = ticket.id;
  const total = Number(ticket.price) * purchaseQuantity;
  const ticketForms = Array.from({ length: purchaseQuantity }, (_, i) => `
    <div class="ticket-strip">
      <div class="button-row" style="justify-content:space-between; margin-bottom:12px;">
        <strong>Ticket ${i + 1} Numbers (1-50)</strong>
        <button type="button" class="secondary" onclick="autoSelectTicket(${i})">Auto-select</button>
      </div>
      <div class="number-grid">
        ${Array.from({ length: 5 }, (_, j) => `<input id="num-${i}-${j}" type="number" min="1" max="50" placeholder="${j + 1}" required />`).join("")}
      </div>
    </div>
  `).join("");
  return renderShell(`
    <h1>Purchase ${escapeHtml(ticket.name)}</h1>
    <form onsubmit="confirmPurchase(event)" class="grid-2">
      <div class="card">
        <h2>Ticket Selection</h2>
        <div class="form-grid">
          <div class="form-row"><label>Ticket Type</label><select onchange="selectedTicketId=this.value; render()">${activeTickets().map((t) => `<option value="${t.id}" ${t.id === ticket.id ? "selected" : ""}>${escapeHtml(t.name)} - ${money(t.price)}</option>`).join("")}</select></div>
          <div class="form-row"><label for="purchase-qty">Quantity (1-10)</label><input id="purchase-qty" type="number" min="1" max="10" value="${purchaseQuantity}" onchange="updatePurchaseQuantity()" /></div>
          <div class="button-row"><button type="button" class="secondary" onclick="autoSelectAllTickets()">Auto-select all tickets</button><button type="button" class="ghost" onclick="setRoute('browse')">Back to Browse</button></div>
        </div>
        ${ticketForms}
      </div>
      <div class="card">
        <h2>Secure Checkout</h2>
        <div class="ticket-strip">
          <div><strong>${escapeHtml(ticket.name)}</strong> x ${purchaseQuantity}</div>
          <div>Unit Price: ${money(ticket.price)}</div>
          <h2>Total: ${money(total)}</h2>
        </div>
        <div class="form-grid">
          <label><input style="width:auto;" type="radio" name="payment-method" value="PayPal" required /> PayPal</label>
          <label><input style="width:auto;" type="radio" name="payment-method" value="Venmo" /> Venmo</label>
          <label><input style="width:auto;" type="radio" name="payment-method" value="Bank Account" /> Linked Bank Account</label>
          <div class="form-row"><label for="payment-ref">Payment Account / Email / Last 4</label><input id="payment-ref" placeholder="example@email.com or last 4 digits" required /></div>
          <div class="notice">Payment gateway behavior is simulated for the class project. The allowed payment methods still match the stakeholder requirement.</div>
          <button class="primary" type="submit">Confirm Purchase</button>
        </div>
      </div>
    </form>
  `, "browse");
}

function renderOrders() {
  const user = currentUser();
  const orders = state.orders.filter((o) => o.userEmail === user.email);
  if (!orders.length) {
    return renderShell(`<h1>Order History</h1><div class="empty-state"><h2>No orders yet</h2><p>Purchase a ticket and it will appear here after logging out and back in.</p><button class="primary" onclick="setRoute('browse')">Buy Tickets</button></div>`, "orders");
  }
  return renderShell(`
    <h1>Order History</h1>
    ${orders.map(renderOrderCard).join("")}
  `, "orders");
}

function renderOrderCard(order) {
  const winningCount = order.eTickets.filter((t) => Number(t.prize) > 0).length;
  return `
    <section class="card print-area" style="margin-bottom:18px;">
      <div class="button-row" style="justify-content:space-between;">
        <div><h2 style="margin-bottom:4px;">${escapeHtml(order.ticketName)} Order</h2><span class="muted">${escapeHtml(order.id)} • ${displayDate(order.purchasedAt)} • ${escapeHtml(order.paymentMethod)} ${escapeHtml(order.paymentReferenceMasked)}</span></div>
        <div>${winningCount ? badge(`${winningCount} Winner(s)`, "green") : badge("No winning tickets yet", "gray")}</div>
      </div>
      <div class="divider"></div>
      ${order.eTickets.map((et) => renderETicket(order, et)).join("")}
      <div class="button-row no-print"><button class="secondary" onclick="window.print()">Print / Save E-Tickets</button></div>
    </section>
  `;
}

function renderETicket(order, et) {
  const color = et.status === "Winner" ? "green" : et.status === "Pending Drawing" ? "orange" : "gray";
  const winningNumbers = et.winningNumbers?.length ? et.winningNumbers.join(", ") : "Pending";
  const claimButton = et.prize > 0 && et.prize <= 599 && et.claimStatus !== "Claimed Online"
    ? `<button class="success" onclick="claimOnline('${order.id}', '${et.ticketNumber}')">Claim ${money(et.prize)} Online</button>`
    : et.prize >= 600 ? `<span class="badge orange">Present e-ticket at Claiming Center</span>` : "";
  return `
    <div class="ticket-strip">
      <div class="grid-2">
        <div>
          <strong>E-Ticket:</strong> ${escapeHtml(et.ticketNumber)}<br>
          <strong>Confirmation:</strong> ${escapeHtml(et.confirmationNumber)}<br>
          <strong>Your Numbers:</strong> ${et.numbers.join(", ")}<br>
          <strong>Winning Numbers:</strong> ${escapeHtml(winningNumbers)}
        </div>
        <div>
          ${badge(et.status, color)}<br><br>
          <strong>Matches:</strong> ${et.matches || 0}/5<br>
          <strong>Prize:</strong> ${money(et.prize)}<br>
          <strong>Claim Status:</strong> ${escapeHtml(et.claimStatus || "Not Eligible")}
        </div>
      </div>
      <div class="button-row no-print" style="margin-top:12px;">${claimButton}</div>
    </div>
  `;
}

function renderMessages() {
  const user = currentUser();
  const messages = state.notifications.filter((n) => n.userEmail === user.email);
  return renderShell(`
    <div class="button-row" style="justify-content:space-between;"><h1>Messages</h1><button class="secondary" onclick="markMessagesRead()">Mark All Read</button></div>
    ${messages.length ? messages.map((m) => `
      <article class="card" style="margin-bottom:14px;">
        <div class="button-row" style="justify-content:space-between;"><h3>${escapeHtml(m.subject)}</h3>${m.read ? badge("Read", "gray") : badge("New", "blue")}</div>
        <p>${escapeHtml(m.message)}</p><span class="muted">${displayDate(m.at)}</span>
      </article>
    `).join("") : `<div class="empty-state">No messages yet.</div>`}
  `, "messages");
}

function renderPreviousWinners() {
  const rows = state.tickets.filter((t) => t.winningNumbers?.length === 5).map((t) => `
    <tr><td>${escapeHtml(t.name)}</td><td>${escapeHtml(t.drawDate)}</td><td>${t.winningNumbers.join(", ")}</td><td>${money(t.jackpot)}</td></tr>
  `).join("");
  return renderShell(`
    <h1>Previous Winning Numbers</h1>
    <div class="table-wrap"><table><thead><tr><th>Ticket</th><th>Drawing Date</th><th>Winning Numbers</th><th>Prize Amount</th></tr></thead><tbody>${rows || `<tr><td colspan="4">No winning numbers have been entered yet.</td></tr>`}</tbody></table></div>
  `, "home");
}

function renderProfile() {
  const user = currentUser();
  return renderShell(`
    <h1>Profile Management</h1>
    <form onsubmit="updateProfile(event)" class="card form-grid" style="max-width:720px;">
      <div class="form-row"><label>Email</label><input value="${escapeHtml(user.email)}" disabled /></div>
      <div class="form-row"><label for="profile-name">Full Name</label><input id="profile-name" value="${escapeHtml(user.name)}" required /></div>
      <div class="form-row"><label for="profile-phone">Phone</label><input id="profile-phone" value="${escapeHtml(user.phone || "")}" /></div>
      <div class="form-row"><label for="profile-address">Address</label><input id="profile-address" value="${escapeHtml(user.address || "")}" /></div>
      <div class="form-row"><label for="profile-password">New Password (leave blank to keep current)</label><input id="profile-password" type="password" minlength="6" /></div>
      <button class="primary" type="submit">Save Profile</button>
    </form>
  `, "profile");
}

function renderAdminDashboard() {
  const totalTicketsSold = state.orders.reduce((sum, o) => sum + o.eTickets.length, 0);
  const revenue = state.orders.reduce((sum, o) => sum + Number(o.total), 0);
  const onlineClaims = state.claims.filter((c) => c.method !== "Claiming Center").length;
  const pendingReports = state.claims.filter((c) => c.regulatoryReportStatus === "Pending Regulatory Report").length;
  return renderShell(`
    <h1>System Admin Dashboard</h1>
    <section class="grid-4">
      <div class="kpi"><span>Total Tickets Sold</span><strong>${totalTicketsSold}</strong></div>
      <div class="kpi"><span>Total Revenue</span><strong>${money(revenue)}</strong></div>
      <div class="kpi"><span>Online Claims</span><strong>${onlineClaims}</strong></div>
      <div class="kpi"><span>Pending Reports</span><strong>${pendingReports}</strong></div>
    </section>
    <div class="divider"></div>
    <section class="grid-2">
      <div class="card"><h2>Ticket Management</h2><p>Add/remove tickets, update costs, prize amounts, draw dates, and winning numbers through the web interface.</p><button class="primary" onclick="setRoute('manage-tickets')">Manage Tickets</button></div>
      <div class="card"><h2>Claiming Center / Regulatory</h2><p>Verify $600+ prizes and create tax/compliance records for the Regulatory Agency.</p><button class="secondary" onclick="setRoute('claiming-center')">Verify Claim</button></div>
    </section>
  `, "admin-dashboard");
}

function renderManageTickets() {
  const edit = adminEditId ? state.tickets.find((t) => t.id === adminEditId) : null;
  const rows = state.tickets.map((t) => `<tr><td>${escapeHtml(t.name)}</td><td>${money(t.price)}</td><td>${money(t.jackpot)}</td><td>${escapeHtml(t.drawDate)}</td><td>${t.winningNumbers?.length === 5 ? t.winningNumbers.join(", ") : "Pending"}</td><td>${t.active ? badge("Active", "green") : badge("Inactive", "gray")}</td><td><button class="secondary" onclick="editTicket('${t.id}')">Edit</button> <button class="danger" onclick="deleteTicket('${t.id}')">Remove</button></td></tr>`).join("");
  return renderShell(`
    <h1>Manage Tickets</h1>
    <section class="grid-2">
      <div class="card">
        <h2>${edit ? "Edit Ticket" : "Add Ticket"}</h2>
        <form onsubmit="saveTicket(event)" class="form-grid">
          <div class="form-row"><label for="ticket-name">Ticket Name</label><input id="ticket-name" value="${escapeHtml(edit?.name || "")}" required /></div>
          <div class="grid-2">
            <div class="form-row"><label for="ticket-price">Cost</label><input id="ticket-price" type="number" step="0.01" min="0.01" value="${escapeHtml(edit?.price || "")}" required /></div>
            <div class="form-row"><label for="ticket-jackpot">Prize Amount</label><input id="ticket-jackpot" type="number" step="0.01" min="1" value="${escapeHtml(edit?.jackpot || "")}" required /></div>
          </div>
          <div class="grid-2">
            <div class="form-row"><label for="ticket-date">Drawing Date</label><input id="ticket-date" type="date" value="${escapeHtml(edit?.drawDate || nextWeekDate(7))}" required /></div>
            <div class="form-row"><label for="ticket-active">Status</label><select id="ticket-active"><option value="true" ${edit?.active !== false ? "selected" : ""}>Active</option><option value="false" ${edit?.active === false ? "selected" : ""}>Inactive</option></select></div>
          </div>
          <div class="form-row"><label for="ticket-winning">Winning Numbers (optional, five numbers separated by spaces)</label><input id="ticket-winning" placeholder="1 2 3 4 5" value="${escapeHtml(edit?.winningNumbers?.join(" ") || "")}" /></div>
          <div class="form-row"><label for="ticket-description">Description</label><textarea id="ticket-description">${escapeHtml(edit?.description || "")}</textarea></div>
          <div class="button-row"><button class="primary" type="submit">${edit ? "Save Changes" : "Add Ticket"}</button>${edit ? `<button type="button" class="ghost" onclick="adminEditId=null; render()">Cancel</button>` : ""}</div>
        </form>
      </div>
      <div class="card">
        <h2>Current Tickets</h2>
        <div class="table-wrap"><table><thead><tr><th>Name</th><th>Cost</th><th>Prize</th><th>Draw</th><th>Winning Numbers</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>
      </div>
    </section>
  `, "manage-tickets");
}

function renderClaimingCenter() {
  return renderShell(`
    <h1>Claiming Center Verification</h1>
    <div class="notice">For prizes of $600 or more, the customer must present their electronic ticket at a local claiming center. This page verifies the ticket number and confirmation number through LPS.</div>
    <section class="grid-2">
      <form class="card form-grid" onsubmit="verifyClaimingCenter(event)">
        <h2>Verify Presented E-Ticket</h2>
        <div class="form-row"><label for="verify-ticket">Ticket Number</label><input id="verify-ticket" placeholder="TKT-..." required /></div>
        <div class="form-row"><label for="verify-confirmation">Confirmation Number</label><input id="verify-confirmation" placeholder="CNF-..." required /></div>
        <button class="primary" type="submit">Verify Ticket</button>
      </form>
      <div class="card">
        <h2>Verification Result</h2>
        ${renderVerifyResult()}
      </div>
    </section>
  `, "claiming-center");
}

function renderVerifyResult() {
  if (!verifyResult) return `<p class="muted">Enter a ticket number and confirmation number to verify.</p>`;
  const { order, et, user } = verifyResult;
  const canApprove = Number(et.prize) >= 600 && et.claimStatus !== "Verified at Claiming Center";
  return `
    <div class="ticket-strip">
      <strong>Customer:</strong> ${escapeHtml(user?.name || order.userEmail)}<br>
      <strong>Ticket:</strong> ${escapeHtml(order.ticketName)}<br>
      <strong>Numbers:</strong> ${et.numbers.join(", ")}<br>
      <strong>Status:</strong> ${escapeHtml(et.status)}<br>
      <strong>Prize:</strong> ${money(et.prize)}<br>
      <strong>Claim Status:</strong> ${escapeHtml(et.claimStatus)}
    </div>
    ${canApprove ? `<button class="success" onclick="approveCenterClaim('${order.id}', '${et.ticketNumber}')">Verify $600+ Claim</button>` : `<div class="alert">This ticket is either not a $600+ claim or it has already been verified.</div>`}
  `;
}

function renderRegulatoryReports() {
  const reportable = state.claims.filter((c) => Number(c.amount) >= 600);
  const rows = reportable.map((c) => {
    const user = state.users.find((u) => u.email === c.userEmail);
    return `<tr><td>${escapeHtml(c.id)}</td><td>${escapeHtml(user?.name || c.userEmail)}<br><span class="muted">${escapeHtml(c.userEmail)}</span></td><td>${escapeHtml(c.ticketNumber)}</td><td>${money(c.amount)}</td><td>${escapeHtml(c.status)}</td><td>${escapeHtml(c.regulatoryReportStatus)}</td><td>${c.regulatoryReportStatus !== "Reported to Regulatory Agency" ? `<button class="primary" onclick="markRegulatoryReported('${c.id}')">Mark Reported</button>` : badge("Complete", "green")}</td></tr>`;
  }).join("");
  return renderShell(`
    <h1>Regulatory Agency Reports</h1>
    <div class="notice">This page represents reporting data required for tax collection and regulatory compliance after Claiming Center verification.</div>
    <div class="table-wrap"><table><thead><tr><th>Claim ID</th><th>Customer</th><th>Ticket</th><th>Amount</th><th>Claim Status</th><th>Report Status</th><th>Action</th></tr></thead><tbody>${rows || `<tr><td colspan="7">No $600+ verified claims yet.</td></tr>`}</tbody></table></div>
  `, "regulatory");
}

function renderActivity() {
  return renderShell(`
    <h1>System Activity</h1>
    <div class="table-wrap"><table><thead><tr><th>Date</th><th>Actor</th><th>Activity</th></tr></thead><tbody>${state.activities.map((a) => `<tr><td>${displayDate(a.at)}</td><td>${escapeHtml(a.actor)}</td><td>${escapeHtml(a.message)}</td></tr>`).join("")}</tbody></table></div>
  `, "activity");
}

function render() {
  const user = currentUser();
  if (!user) {
    renderAuth();
    return;
  }
  if (user.role === "admin") {
    if (route === "manage-tickets") return renderManageTickets();
    if (route === "claiming-center") return renderClaimingCenter();
    if (route === "regulatory") return renderRegulatoryReports();
    if (route === "activity") return renderActivity();
    if (route === "profile") return renderProfile();
    return renderAdminDashboard();
  }
  if (route === "browse") return renderBrowse();
  if (route === "search") return renderSearch();
  if (route === "purchase") return renderPurchase();
  if (route === "orders") return renderOrders();
  if (route === "messages") return renderMessages();
  if (route === "profile") return renderProfile();
  if (route === "previous-winners") return renderPreviousWinners();
  return renderCustomerHome();
}

window.setRoute = setRoute;
window.setAuthTab = setAuthTab;
window.resetLocalData = resetLocalData;
window.login = login;
window.registerCustomer = registerCustomer;
window.createAdmin = createAdmin;
window.logout = logout;
window.updateProfile = updateProfile;
window.startPurchase = startPurchase;
window.updatePurchaseQuantity = updatePurchaseQuantity;
window.autoSelectTicket = autoSelectTicket;
window.autoSelectAllTickets = autoSelectAllTickets;
window.confirmPurchase = confirmPurchase;
window.renderSearchResults = renderSearchResults;
window.markMessagesRead = markMessagesRead;
window.claimOnline = claimOnline;
window.saveTicket = saveTicket;
window.editTicket = editTicket;
window.deleteTicket = deleteTicket;
window.verifyClaimingCenter = verifyClaimingCenter;
window.approveCenterClaim = approveCenterClaim;
window.markRegulatoryReported = markRegulatoryReported;
window.render = render;

render();
