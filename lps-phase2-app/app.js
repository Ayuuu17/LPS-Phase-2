const STORE_KEY = "lps-phase2-data-v1";
const SESSION_KEY = "lps-phase2-session";
const TODAY = "2026-04-28";

const state = {
  authMode: "login",
  selectedTicketId: "power-ball",
  purchaseQuantity: 1,
  selectedOrderId: null,
  searchTerm: "",
  adminTicketId: "power-ball",
  verificationQuery: "",
};

const app = document.getElementById("app");
const nav = document.getElementById("nav");
const toast = document.getElementById("toast");

function defaultData() {
  return {
    users: [
      {
        id: "u-demo",
        role: "customer",
        name: "Demo Customer",
        email: "customer@lps.test",
        password: "Password123!",
        address: "2500 Broadway, Lubbock, TX",
        phone: "806-555-0188",
        messages: [
          {
            id: "msg-1",
            date: "2026-04-26",
            subject: "Winning ticket notification",
            body: "Your Lotto Texas ticket won $25.00. You can claim this amount online.",
          },
          {
            id: "msg-2",
            date: "2026-04-26",
            subject: "Prize verification required",
            body: "Your Power Ball ticket won $1,000.00. Please present the electronic ticket at a Claiming Center.",
          },
        ],
      },
      {
        id: "u-admin",
        role: "admin",
        name: "LPS Administrator",
        email: "admin@lps.test",
        password: "Admin123!",
        address: "Texas Lottery Commission",
        phone: "512-555-0110",
        messages: [],
      },
      {
        id: "u-claim",
        role: "claimingCenter",
        name: "Claiming Center Staff",
        email: "claiming@lps.test",
        password: "Claim123!",
        address: "Lubbock Claiming Center",
        phone: "806-555-0199",
        messages: [],
      },
      {
        id: "u-reg",
        role: "regulator",
        name: "Regulatory Agency Reviewer",
        email: "regulator@lps.test",
        password: "Reg123!",
        address: "IRS / Regulatory Reporting",
        phone: "202-555-0144",
        messages: [],
      },
    ],
    tickets: [
      {
        id: "power-ball",
        name: "Power Ball",
        price: 2,
        prizePool: 5000,
        nextDrawingDate: "2026-05-03",
        active: true,
        drawings: [{ date: "2026-04-26", numbers: [4, 12, 23, 34, 45], enteredBy: "u-admin" }],
      },
      {
        id: "mega-millions",
        name: "Mega Millions",
        price: 2,
        prizePool: 2500,
        nextDrawingDate: "2026-05-03",
        active: true,
        drawings: [{ date: "2026-04-26", numbers: [5, 16, 22, 31, 48], enteredBy: "u-admin" }],
      },
      {
        id: "lotto-texas",
        name: "Lotto Texas",
        price: 1,
        prizePool: 500,
        nextDrawingDate: "2026-05-03",
        active: true,
        drawings: [{ date: "2026-04-26", numbers: [1, 8, 19, 27, 40], enteredBy: "u-admin" }],
      },
      {
        id: "texas-two-step",
        name: "Texas Two Step",
        price: 1.5,
        prizePool: 300,
        nextDrawingDate: "2026-05-03",
        active: true,
        drawings: [{ date: "2026-04-26", numbers: [6, 14, 21, 33, 49], enteredBy: "u-admin" }],
      },
    ],
    orders: [
      {
        id: "ORD-1001",
        userId: "u-demo",
        ticketId: "power-ball",
        purchaseDate: "2026-04-20",
        drawingDate: "2026-04-26",
        paymentMethod: "Bank Account",
        total: 2,
        lines: [
          {
            id: "LINE-1001",
            ticketNumber: "PB-7G4K2",
            confirmationNumber: "CN-PB-1001",
            numbers: [4, 12, 23, 34, 1],
            claimStatus: "requires_center",
          },
        ],
      },
      {
        id: "ORD-1002",
        userId: "u-demo",
        ticketId: "lotto-texas",
        purchaseDate: "2026-04-21",
        drawingDate: "2026-04-26",
        paymentMethod: "PayPal",
        total: 1,
        lines: [
          {
            id: "LINE-1002",
            ticketNumber: "LT-9D2P8",
            confirmationNumber: "CN-LT-1002",
            numbers: [1, 8, 19, 33, 45],
            claimStatus: "unclaimed",
          },
        ],
      },
    ],
    reports: [],
    auditLog: [
      {
        id: "AUD-1",
        date: "2026-04-26",
        actorId: "u-admin",
        action: "Entered weekly winning numbers for all active tickets.",
      },
    ],
  };
}

function loadData() {
  const saved = localStorage.getItem(STORE_KEY);
  if (!saved) {
    const seeded = defaultData();
    localStorage.setItem(STORE_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    return JSON.parse(saved);
  } catch {
    const seeded = defaultData();
    localStorage.setItem(STORE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function saveData(data) {
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
}

let data = loadData();

function currentUser() {
  const id = localStorage.getItem(SESSION_KEY);
  return data.users.find((user) => user.id === id) || null;
}

function setSession(userId) {
  if (userId) {
    localStorage.setItem(SESSION_KEY, userId);
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

function route() {
  return (location.hash || "#home").slice(1);
}

function go(target) {
  location.hash = target;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("show"), 2800);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatNumbers(numbers) {
  return numbers.map((n) => String(n).padStart(2, "0")).join(" - ");
}

function makeId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function ticketById(id) {
  return data.tickets.find((ticket) => ticket.id === id);
}

function userById(id) {
  return data.users.find((user) => user.id === id);
}

function drawingFor(ticket, date) {
  return ticket.drawings.find((drawing) => drawing.date === date);
}

function countMatches(userNumbers, winningNumbers) {
  return userNumbers.filter((number) => winningNumbers.includes(number)).length;
}

function prizeFor(matches, prizePool) {
  if (matches === 5) return prizePool;
  if (matches === 4) return prizePool * 0.2;
  if (matches === 3) return prizePool * 0.05;
  if (matches === 2) return prizePool * 0.01;
  return 0;
}

function evaluateLine(order, line) {
  const ticket = ticketById(order.ticketId);
  const drawing = ticket ? drawingFor(ticket, order.drawingDate) : null;
  if (!ticket || !drawing) {
    return { status: "Pending", matches: 0, prize: 0, drawingNumbers: null };
  }
  const matches = countMatches(line.numbers, drawing.numbers);
  const prize = Number(prizeFor(matches, ticket.prizePool).toFixed(2));
  return {
    status: prize > 0 ? "Winner" : "Not Winner",
    matches,
    prize,
    drawingNumbers: drawing.numbers,
  };
}

function orderPrize(order) {
  return order.lines.reduce((sum, line) => sum + evaluateLine(order, line).prize, 0);
}

function claimLabel(line, evalResult) {
  if (evalResult.status === "Pending") return "Drawing pending";
  if (evalResult.prize <= 0) return "No prize";
  if (line.claimStatus === "online_claimed") return "Claimed online";
  if (line.claimStatus === "center_verified") return "Verified by Claiming Center";
  if (evalResult.prize >= 600) return "Claiming Center required";
  return "Ready for online claim";
}

function addAudit(actorId, action) {
  data.auditLog.unshift({ id: makeId("AUD"), date: TODAY, actorId, action });
  saveData(data);
}

function addMessage(userId, subject, body) {
  const user = userById(userId);
  if (!user) return;
  user.messages.unshift({ id: makeId("MSG"), date: TODAY, subject, body });
}

function notifyWinners(ticketId, drawingDate) {
  const affected = data.orders.filter((order) => order.ticketId === ticketId && order.drawingDate === drawingDate);
  for (const order of affected) {
    const user = userById(order.userId);
    const ticket = ticketById(order.ticketId);
    if (!user || !ticket) continue;
    for (const line of order.lines) {
      const result = evaluateLine(order, line);
      if (result.prize <= 0) continue;
      const online = result.prize <= 599;
      line.claimStatus = online ? "unclaimed" : "requires_center";
      const action = online ? "You can claim this prize online." : "Please visit a local Claiming Center for verification.";
      addMessage(
        user.id,
        `Winning ${ticket.name} ticket`,
        `${line.ticketNumber} matched ${result.matches} numbers and won ${money(result.prize)}. ${action}`
      );
    }
  }
  saveData(data);
}

function randomNumbers() {
  const pool = Array.from({ length: 50 }, (_, index) => index + 1);
  const picks = [];
  while (picks.length < 5) {
    const index = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(index, 1)[0]);
  }
  return picks.sort((a, b) => a - b);
}

function parseNumberInputs(container) {
  const values = Array.from(container.querySelectorAll("input[data-number]")).map((input) => Number(input.value));
  const unique = new Set(values);
  if (values.length !== 5 || values.some((value) => !Number.isInteger(value) || value < 1 || value > 50)) {
    throw new Error("Each ticket must have five whole numbers from 1 to 50.");
  }
  if (unique.size !== 5) {
    throw new Error("Each ticket must use five different numbers.");
  }
  return values.sort((a, b) => a - b);
}

function renderNav() {
  const user = currentUser();
  if (!user) {
    nav.innerHTML = "";
    return;
  }

  const linksByRole = {
    customer: [
      ["home", "Home"],
      ["browse", "Browse"],
      ["search", "Search"],
      ["orders", "Orders"],
      ["previous", "Previous Numbers"],
      ["profile", "Profile"],
    ],
    admin: [
      ["admin", "Dashboard"],
      ["manage", "Manage Tickets"],
      ["draw", "Draw Numbers"],
      ["audit", "Audit"],
    ],
    claimingCenter: [["verify", "Verify Prize"]],
    regulator: [["reports", "Regulatory Reports"]],
  };

  const active = route();
  const links = linksByRole[user.role] || [];
  nav.innerHTML = [
    ...links.map(
      ([target, label]) =>
        `<button type="button" class="${active === target ? "active" : ""}" data-route="${target}">${label}</button>`
    ),
    `<button type="button" class="danger-button" data-action="logout">Logout</button>`,
  ].join("");

  nav.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => go(button.dataset.route));
  });
  nav.querySelector("[data-action='logout']").addEventListener("click", () => {
    setSession(null);
    showToast("Logged out.");
    go("login");
    render();
  });
}

function requireRole(roles) {
  const user = currentUser();
  if (!user) {
    go("login");
    return null;
  }
  if (!roles.includes(user.role)) {
    go(user.role === "admin" ? "admin" : user.role === "claimingCenter" ? "verify" : user.role === "regulator" ? "reports" : "home");
    return null;
  }
  return user;
}

function renderAuth() {
  renderNav();
  const isLogin = state.authMode === "login";
  app.innerHTML = `
    <section class="auth-layout">
      <div class="auth-card">
        <h1>${isLogin ? "Sign in to LPS" : "Create Customer Account"}</h1>
        <p class="lead">${isLogin ? "Use a customer, administrator, claiming-center, or regulatory demo account." : "Registration creates a customer account and logs you in."}</p>
        <div class="tabs" role="tablist" aria-label="Authentication options">
          <button type="button" class="${isLogin ? "active" : ""}" data-auth="login">Login</button>
          <button type="button" class="${!isLogin ? "active" : ""}" data-auth="register">Register</button>
        </div>
        <form id="auth-form" class="form">
          ${!isLogin ? `
            <div class="field"><label for="name">Full name</label><input id="name" required autocomplete="name"></div>
            <div class="field"><label for="address">Home address</label><input id="address" required autocomplete="street-address"></div>
            <div class="field"><label for="phone">Phone number</label><input id="phone" required autocomplete="tel"></div>
          ` : ""}
          <div class="field"><label for="email">Email</label><input id="email" type="email" required autocomplete="email"></div>
          <div class="field"><label for="password">Password</label><input id="password" type="password" required autocomplete="${isLogin ? "current-password" : "new-password"}"></div>
          <button class="button" type="submit">${isLogin ? "Login" : "Register"}</button>
        </form>
        <div class="divider"></div>
        <p class="compact"><strong>Demo logins</strong></p>
        <p class="muted compact">Customer: customer@lps.test / Password123!</p>
        <p class="muted compact">Admin: admin@lps.test / Admin123!</p>
        <p class="muted compact">Claiming Center: claiming@lps.test / Claim123!</p>
        <p class="muted">Regulatory Agency: regulator@lps.test / Reg123!</p>
      </div>
    </section>
  `;

  app.querySelectorAll("[data-auth]").forEach((button) => {
    button.addEventListener("click", () => {
      state.authMode = button.dataset.auth;
      renderAuth();
    });
  });

  app.querySelector("#auth-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const email = app.querySelector("#email").value.trim().toLowerCase();
    const password = app.querySelector("#password").value;

    if (isLogin) {
      const user = data.users.find((candidate) => candidate.email.toLowerCase() === email && candidate.password === password);
      if (!user) {
        showToast("Invalid email or password.");
        return;
      }
      setSession(user.id);
      showToast(`Welcome, ${user.name}.`);
      go(user.role === "admin" ? "admin" : user.role === "claimingCenter" ? "verify" : user.role === "regulator" ? "reports" : "home");
      render();
      return;
    }

    if (data.users.some((candidate) => candidate.email.toLowerCase() === email)) {
      showToast("That email is already registered.");
      return;
    }
    const user = {
      id: makeId("USR"),
      role: "customer",
      name: app.querySelector("#name").value.trim(),
      email,
      password,
      address: app.querySelector("#address").value.trim(),
      phone: app.querySelector("#phone").value.trim(),
      messages: [],
    };
    data.users.push(user);
    saveData(data);
    setSession(user.id);
    showToast("Account created.");
    go("home");
    render();
  });
}

function renderHome() {
  const user = requireRole(["customer"]);
  if (!user) return;
  renderNav();
  const orders = data.orders.filter((order) => order.userId === user.id);
  const winningLines = orders.flatMap((order) => order.lines.map((line) => ({ order, line, result: evaluateLine(order, line) }))).filter((item) => item.result.prize > 0);
  const latestMessages = user.messages.slice(0, 4);
  app.innerHTML = `
    <section class="hero">
      <div class="panel">
        <p class="badge teal">Logged in as Customer</p>
        <h1>Buy, track, and claim Texas lottery tickets online.</h1>
        <p class="lead">Browse active tickets, select five numbers manually or automatically, checkout with approved payment methods, and keep every electronic ticket in your account history.</p>
        <div class="row">
          <button class="button" data-route="browse">Browse Tickets</button>
          <button class="secondary-button" data-route="orders">Order History</button>
          <button class="quiet-button" data-route="previous">Previous Numbers</button>
        </div>
      </div>
      <div class="stack">
        <div class="card stat">
          <span class="value">${orders.length}</span>
          <span class="muted">Orders saved to this account</span>
        </div>
        <div class="card stat">
          <span class="value">${money(winningLines.reduce((sum, item) => sum + item.result.prize, 0))}</span>
          <span class="muted">Total prizes detected</span>
        </div>
        <div class="card">
          <h2>Notifications</h2>
          ${latestMessages.length ? latestMessages.map((message) => `
            <div class="notice ${message.subject.includes("Winning") ? "good" : "warn"}">
              <strong>${escapeHtml(message.subject)}</strong>
              <p class="muted compact">${escapeHtml(message.date)}</p>
              <p>${escapeHtml(message.body)}</p>
            </div>
          `).join("") : `<p class="muted">No notifications yet.</p>`}
        </div>
      </div>
    </section>
  `;
  app.querySelectorAll("[data-route]").forEach((button) => button.addEventListener("click", () => go(button.dataset.route)));
}

function ticketCard(ticket) {
  return `
    <article class="ticket-card">
      <div class="spread">
        <strong>${escapeHtml(ticket.name)}</strong>
        <span class="badge ${ticket.active ? "good" : "danger"}">${ticket.active ? "Active" : "Inactive"}</span>
      </div>
      <p class="muted compact">Next drawing: ${escapeHtml(ticket.nextDrawingDate)}</p>
      <p class="compact">Price: <strong>${money(ticket.price)}</strong></p>
      <p class="compact">Prize pool: <strong>${money(ticket.prizePool)}</strong></p>
      <p class="muted">Pick exactly five numbers from 1 to 50.</p>
      <button class="button" type="button" data-buy="${ticket.id}" ${ticket.active ? "" : "disabled"}>Buy Ticket</button>
    </article>
  `;
}

function bindBuyButtons() {
  app.querySelectorAll("[data-buy]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedTicketId = button.dataset.buy;
      state.purchaseQuantity = 1;
      go("purchase");
    });
  });
}

function renderBrowse() {
  requireRole(["customer"]);
  renderNav();
  const activeTickets = data.tickets.filter((ticket) => ticket.active);
  app.innerHTML = `
    <section class="stack">
      <div class="spread">
        <div>
          <h1>Browse Lottery Tickets</h1>
          <p class="lead">All supported ticket types use five numbers from 1 to 50 and the approved PayPal, Venmo, or bank-account checkout flow.</p>
        </div>
        <button class="quiet-button" type="button" data-route="search">Search</button>
      </div>
      <div class="grid four">${activeTickets.map(ticketCard).join("")}</div>
    </section>
  `;
  bindBuyButtons();
  app.querySelector("[data-route='search']").addEventListener("click", () => go("search"));
}

function renderSearch() {
  requireRole(["customer"]);
  renderNav();
  const term = state.searchTerm.toLowerCase();
  const results = data.tickets.filter((ticket) => ticket.name.toLowerCase().includes(term));
  app.innerHTML = `
    <section class="stack">
      <div>
        <h1>Search Tickets</h1>
        <p class="lead">Search by ticket name and purchase from the result list.</p>
      </div>
      <div class="field">
        <label for="ticket-search">Ticket name</label>
        <input id="ticket-search" type="search" value="${escapeHtml(state.searchTerm)}" placeholder="Example: Mega Millions">
      </div>
      <div class="grid four">${results.map(ticketCard).join("") || `<p class="muted">No ticket matches your search.</p>`}</div>
    </section>
  `;
  app.querySelector("#ticket-search").addEventListener("input", (event) => {
    state.searchTerm = event.target.value;
    renderSearch();
  });
  bindBuyButtons();
}

function numberInputs(lineIndex) {
  return `
    <div class="number-grid" data-line="${lineIndex}">
      ${Array.from({ length: 5 }, (_, index) => `
        <input type="number" min="1" max="50" data-number="${index}" aria-label="Ticket ${lineIndex + 1} number ${index + 1}" required>
      `).join("")}
    </div>
  `;
}

function renderPurchase() {
  const user = requireRole(["customer"]);
  if (!user) return;
  renderNav();
  const ticket = ticketById(state.selectedTicketId) || data.tickets.find((candidate) => candidate.active);
  if (!ticket) {
    app.innerHTML = `<div class="notice warn">No active tickets are available.</div>`;
    return;
  }
  state.selectedTicketId = ticket.id;
  app.innerHTML = `
    <section class="stack">
      <div>
        <h1>Purchase ${escapeHtml(ticket.name)}</h1>
        <p class="lead">Choose up to ten tickets, enter five unique numbers per ticket, and checkout through one of the approved payment methods.</p>
      </div>
      <form id="purchase-form" class="panel form">
        <div class="grid two">
          <div class="field">
            <label for="ticket-select">Ticket type</label>
            <select id="ticket-select">
              ${data.tickets.filter((candidate) => candidate.active).map((candidate) => `<option value="${candidate.id}" ${candidate.id === ticket.id ? "selected" : ""}>${escapeHtml(candidate.name)} - ${money(candidate.price)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label for="quantity">Quantity (1-10)</label>
            <input id="quantity" type="number" min="1" max="10" value="${state.purchaseQuantity}" required>
          </div>
        </div>
        <div class="notice">
          <strong>Drawing date:</strong> ${escapeHtml(ticket.nextDrawingDate)}
          <span class="badge">Total ${money(ticket.price * state.purchaseQuantity)}</span>
        </div>
        <div class="ticket-strip">
          ${Array.from({ length: state.purchaseQuantity }, (_, index) => `
            <div class="ticket-line">
              <div class="spread">
                <strong>Ticket ${index + 1} Numbers</strong>
                <button class="quiet-button" type="button" data-auto="${index}">Auto Select</button>
              </div>
              ${numberInputs(index)}
            </div>
          `).join("")}
        </div>
        <div class="field">
          <label for="payment">Payment method</label>
          <select id="payment" required>
            <option>PayPal</option>
            <option>Venmo</option>
            <option>Bank Account</option>
          </select>
          <small>Credit and debit cards are not accepted for this LPS demo.</small>
        </div>
        <button class="button" type="submit">Confirm Purchase (${money(ticket.price * state.purchaseQuantity)})</button>
      </form>
    </section>
  `;

  app.querySelector("#ticket-select").addEventListener("change", (event) => {
    state.selectedTicketId = event.target.value;
    renderPurchase();
  });
  app.querySelector("#quantity").addEventListener("change", (event) => {
    state.purchaseQuantity = Math.max(1, Math.min(10, Number(event.target.value) || 1));
    renderPurchase();
  });
  app.querySelectorAll("[data-auto]").forEach((button) => {
    button.addEventListener("click", () => {
      const wrapper = app.querySelector(`[data-line='${button.dataset.auto}']`);
      randomNumbers().forEach((value, index) => {
        wrapper.querySelector(`[data-number='${index}']`).value = value;
      });
    });
  });
  app.querySelector("#purchase-form").addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const lineWrappers = Array.from(app.querySelectorAll("[data-line]"));
      const lines = lineWrappers.map((wrapper) => ({
        id: makeId("LINE"),
        ticketNumber: `${ticket.id.slice(0, 2).toUpperCase()}-${makeId("TKT").slice(4)}`,
        confirmationNumber: `CN-${makeId("CONF").slice(5)}`,
        numbers: parseNumberInputs(wrapper),
        claimStatus: "pending",
      }));
      const order = {
        id: makeId("ORD"),
        userId: user.id,
        ticketId: ticket.id,
        purchaseDate: TODAY,
        drawingDate: ticket.nextDrawingDate,
        paymentMethod: app.querySelector("#payment").value,
        total: Number((ticket.price * lines.length).toFixed(2)),
        lines,
      };
      data.orders.unshift(order);
      saveData(data);
      showToast("Purchase complete. Electronic ticket generated.");
      state.selectedOrderId = order.id;
      go("orders");
    } catch (error) {
      showToast(error.message);
    }
  });
}

function orderRow(order) {
  const ticket = ticketById(order.ticketId);
  const prize = orderPrize(order);
  const status = order.lines.some((line) => evaluateLine(order, line).status === "Pending")
    ? "Pending"
    : prize > 0
      ? "Winner"
      : "Not Winner";
  return `
    <tr>
      <td>${escapeHtml(order.id)}</td>
      <td>${escapeHtml(ticket ? ticket.name : "Unknown")}</td>
      <td>${escapeHtml(order.purchaseDate)}</td>
      <td>${escapeHtml(order.drawingDate)}</td>
      <td>${money(order.total)}</td>
      <td><span class="badge ${status === "Winner" ? "good" : status === "Pending" ? "warn" : ""}">${status}</span></td>
      <td>${money(prize)}</td>
      <td><button class="quiet-button" type="button" data-order="${order.id}">Details</button></td>
    </tr>
  `;
}

function orderDetails(order) {
  const ticket = ticketById(order.ticketId);
  return `
    <div class="panel stack">
      <div class="spread">
        <div>
          <h2>Order ${escapeHtml(order.id)}</h2>
          <p class="muted">${escapeHtml(ticket ? ticket.name : "Unknown Ticket")} purchased on ${escapeHtml(order.purchaseDate)} with ${escapeHtml(order.paymentMethod)}</p>
        </div>
        <button class="quiet-button" type="button" data-print>Print / Display E-Ticket</button>
      </div>
      ${order.lines.map((line) => {
        const result = evaluateLine(order, line);
        const claimText = claimLabel(line, result);
        return `
          <div class="ticket-line">
            <div class="spread">
              <strong>${escapeHtml(line.ticketNumber)}</strong>
              <span class="badge ${result.prize > 0 ? "good" : result.status === "Pending" ? "warn" : ""}">${escapeHtml(result.status)}</span>
            </div>
            <p class="compact">Confirmation: <strong>${escapeHtml(line.confirmationNumber)}</strong></p>
            <p class="compact">Your numbers: ${formatNumbers(line.numbers)}</p>
            <p class="compact">Winning numbers: ${result.drawingNumbers ? formatNumbers(result.drawingNumbers) : "Pending weekly drawing"}</p>
            <p class="compact">Matches: ${result.matches} | Prize: <strong>${money(result.prize)}</strong></p>
            <p class="muted compact">Claim status: ${escapeHtml(claimText)}</p>
            ${result.prize > 0 && result.prize <= 599 && line.claimStatus !== "online_claimed" ? `
              <button class="secondary-button" type="button" data-claim="${line.id}">Claim Online</button>
            ` : ""}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderOrders() {
  const user = requireRole(["customer"]);
  if (!user) return;
  renderNav();
  const orders = data.orders.filter((order) => order.userId === user.id);
  const selected = orders.find((order) => order.id === state.selectedOrderId) || orders[0];
  app.innerHTML = `
    <section class="stack">
      <div>
        <h1>Order History</h1>
        <p class="lead">Every purchase remains tied to your account, including ticket numbers, confirmation numbers, winning numbers, and claim status.</p>
      </div>
      ${orders.length ? `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Order</th><th>Ticket</th><th>Purchased</th><th>Drawing</th><th>Total</th><th>Status</th><th>Prize</th><th>View</th></tr></thead>
            <tbody>${orders.map(orderRow).join("")}</tbody>
          </table>
        </div>
        ${selected ? orderDetails(selected) : ""}
      ` : `<div class="notice">No purchases yet. Browse tickets to create your first electronic ticket.</div>`}
    </section>
  `;
  app.querySelectorAll("[data-order]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedOrderId = button.dataset.order;
      renderOrders();
    });
  });
  const printButton = app.querySelector("[data-print]");
  if (printButton) printButton.addEventListener("click", () => window.print());
  app.querySelectorAll("[data-claim]").forEach((button) => {
    button.addEventListener("click", () => {
      const order = selected;
      const line = order.lines.find((candidate) => candidate.id === button.dataset.claim);
      const result = evaluateLine(order, line);
      if (result.prize <= 0 || result.prize > 599) return;
      line.claimStatus = "online_claimed";
      addAudit(user.id, `Claimed ${money(result.prize)} online for ${line.ticketNumber}.`);
      saveData(data);
      showToast(`${money(result.prize)} deposited to your selected payout account.`);
      renderOrders();
    });
  });
}

function renderPreviousNumbers() {
  requireRole(["customer"]);
  renderNav();
  const rows = data.tickets.flatMap((ticket) =>
    ticket.drawings.map((drawing) => ({ ticket, drawing }))
  ).sort((a, b) => b.drawing.date.localeCompare(a.drawing.date));
  app.innerHTML = `
    <section class="stack">
      <div>
        <h1>Previous Winning Numbers</h1>
        <p class="lead">Drawn winning numbers entered by administrators are available for customer review.</p>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Ticket</th><th>Drawing Date</th><th>Winning Numbers</th><th>Prize Pool</th></tr></thead>
          <tbody>${rows.map(({ ticket, drawing }) => `
            <tr>
              <td>${escapeHtml(ticket.name)}</td>
              <td>${escapeHtml(drawing.date)}</td>
              <td>${formatNumbers(drawing.numbers)}</td>
              <td>${money(ticket.prizePool)}</td>
            </tr>
          `).join("")}</tbody>
        </table>
      </div>
    </section>
  `;
}

function renderProfile() {
  const user = requireRole(["customer"]);
  if (!user) return;
  renderNav();
  app.innerHTML = `
    <section class="stack">
      <div>
        <h1>Profile</h1>
        <p class="lead">Update the personal details stored with your LPS account.</p>
      </div>
      <form id="profile-form" class="panel form">
        <div class="grid two">
          <div class="field"><label for="name">Full name</label><input id="name" value="${escapeHtml(user.name)}" required></div>
          <div class="field"><label for="email">Email</label><input id="email" type="email" value="${escapeHtml(user.email)}" required></div>
          <div class="field"><label for="phone">Phone</label><input id="phone" value="${escapeHtml(user.phone)}" required></div>
          <div class="field"><label for="password">Change password</label><input id="password" value="${escapeHtml(user.password)}" required></div>
        </div>
        <div class="field"><label for="address">Home address</label><input id="address" value="${escapeHtml(user.address)}" required></div>
        <button class="button" type="submit">Save Profile</button>
      </form>
    </section>
  `;
  app.querySelector("#profile-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const nextEmail = app.querySelector("#email").value.trim().toLowerCase();
    if (data.users.some((candidate) => candidate.id !== user.id && candidate.email.toLowerCase() === nextEmail)) {
      showToast("That email is already used by another account.");
      return;
    }
    user.name = app.querySelector("#name").value.trim();
    user.email = nextEmail;
    user.phone = app.querySelector("#phone").value.trim();
    user.address = app.querySelector("#address").value.trim();
    user.password = app.querySelector("#password").value;
    saveData(data);
    showToast("Profile saved.");
    renderProfile();
  });
}

function metrics() {
  const sold = data.orders.reduce((sum, order) => sum + order.lines.length, 0);
  const revenue = data.orders.reduce((sum, order) => sum + order.total, 0);
  const payout = data.orders.reduce((sum, order) => sum + orderPrize(order), 0);
  const centerClaims = data.orders.flatMap((order) => order.lines.map((line) => ({ order, line, result: evaluateLine(order, line) }))).filter((item) => item.result.prize >= 600 && item.line.claimStatus !== "center_verified").length;
  return { sold, revenue, payout, centerClaims };
}

function renderAdminDashboard() {
  const user = requireRole(["admin"]);
  if (!user) return;
  renderNav();
  const m = metrics();
  app.innerHTML = `
    <section class="stack">
      <div class="spread">
        <div>
          <h1>Admin Dashboard</h1>
          <p class="lead">Monitor status, revenue, claims, and ticket activity from a dedicated administrative interface.</p>
        </div>
        <button class="danger-button" type="button" data-reset>Reset Demo Data</button>
      </div>
      <div class="grid four">
        <div class="card stat"><span class="value">${m.sold}</span><span class="muted">Tickets sold</span></div>
        <div class="card stat"><span class="value">${money(m.revenue)}</span><span class="muted">Total revenue</span></div>
        <div class="card stat"><span class="value">${money(m.payout)}</span><span class="muted">Prize obligation</span></div>
        <div class="card stat"><span class="value">${m.centerClaims}</span><span class="muted">Claims needing center verification</span></div>
      </div>
      <div class="grid two">
        <div class="card">
          <h2>Recent Orders</h2>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Prize</th></tr></thead>
              <tbody>${data.orders.slice(0, 6).map((order) => `
                <tr><td>${escapeHtml(order.id)}</td><td>${escapeHtml(userById(order.userId)?.name || "Unknown")}</td><td>${money(order.total)}</td><td>${money(orderPrize(order))}</td></tr>
              `).join("")}</tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <h2>Regulatory Reports</h2>
          <p class="lead">${data.reports.length} claim reports are available for regulatory review.</p>
          <button class="secondary-button" type="button" data-route="reports">Open Reports</button>
        </div>
      </div>
    </section>
  `;
  app.querySelector("[data-reset]").addEventListener("click", () => {
    if (!window.confirm("Reset all demo data to the original seeded state?")) return;
    data = defaultData();
    saveData(data);
    showToast("Demo data reset.");
    renderAdminDashboard();
  });
  app.querySelector("[data-route='reports']").addEventListener("click", () => go("reports"));
}

function renderManageTickets() {
  const user = requireRole(["admin"]);
  if (!user) return;
  renderNav();
  app.innerHTML = `
    <section class="stack">
      <div>
        <h1>Manage Tickets</h1>
        <p class="lead">Administrators can add, remove, activate, deactivate, and update ticket prices or prize pools without touching files or a database console.</p>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Price</th><th>Prize Pool</th><th>Next Drawing</th><th>Status</th><th>Save</th><th>Toggle</th></tr></thead>
          <tbody>${data.tickets.map((ticket) => `
            <tr data-ticket-row="${ticket.id}">
              <td><input value="${escapeHtml(ticket.name)}" data-field="name" aria-label="${escapeHtml(ticket.name)} name"></td>
              <td><input type="number" min="0.01" step="0.01" value="${ticket.price}" data-field="price" aria-label="${escapeHtml(ticket.name)} price"></td>
              <td><input type="number" min="1" step="1" value="${ticket.prizePool}" data-field="prizePool" aria-label="${escapeHtml(ticket.name)} prize pool"></td>
              <td><input type="date" value="${escapeHtml(ticket.nextDrawingDate)}" data-field="nextDrawingDate" aria-label="${escapeHtml(ticket.name)} next drawing date"></td>
              <td><span class="badge ${ticket.active ? "good" : "danger"}">${ticket.active ? "Active" : "Inactive"}</span></td>
              <td><button class="quiet-button" type="button" data-save-ticket="${ticket.id}">Save</button></td>
              <td><button class="${ticket.active ? "danger-button" : "secondary-button"}" type="button" data-toggle-ticket="${ticket.id}">${ticket.active ? "Deactivate" : "Activate"}</button></td>
            </tr>
          `).join("")}</tbody>
        </table>
      </div>
      <form id="add-ticket-form" class="panel form">
        <h2>Add New Ticket</h2>
        <div class="grid four">
          <div class="field"><label for="new-name">Ticket name</label><input id="new-name" required></div>
          <div class="field"><label for="new-price">Price</label><input id="new-price" type="number" min="0.01" step="0.01" required></div>
          <div class="field"><label for="new-pool">Prize pool</label><input id="new-pool" type="number" min="1" step="1" required></div>
          <div class="field"><label for="new-date">Next drawing</label><input id="new-date" type="date" value="2026-05-03" required></div>
        </div>
        <button class="button" type="submit">Add Ticket</button>
      </form>
    </section>
  `;
  app.querySelectorAll("[data-save-ticket]").forEach((button) => {
    button.addEventListener("click", () => {
      const ticket = ticketById(button.dataset.saveTicket);
      const row = app.querySelector(`[data-ticket-row='${ticket.id}']`);
      ticket.name = row.querySelector("[data-field='name']").value.trim();
      ticket.price = Number(row.querySelector("[data-field='price']").value);
      ticket.prizePool = Number(row.querySelector("[data-field='prizePool']").value);
      ticket.nextDrawingDate = row.querySelector("[data-field='nextDrawingDate']").value;
      addAudit(user.id, `Updated ticket settings for ${ticket.name}.`);
      saveData(data);
      showToast("Ticket updated.");
      renderManageTickets();
    });
  });
  app.querySelectorAll("[data-toggle-ticket]").forEach((button) => {
    button.addEventListener("click", () => {
      const ticket = ticketById(button.dataset.toggleTicket);
      ticket.active = !ticket.active;
      addAudit(user.id, `${ticket.active ? "Activated" : "Deactivated"} ${ticket.name}.`);
      saveData(data);
      renderManageTickets();
    });
  });
  app.querySelector("#add-ticket-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const ticket = {
      id: app.querySelector("#new-name").value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || makeId("ticket").toLowerCase(),
      name: app.querySelector("#new-name").value.trim(),
      price: Number(app.querySelector("#new-price").value),
      prizePool: Number(app.querySelector("#new-pool").value),
      nextDrawingDate: app.querySelector("#new-date").value,
      active: true,
      drawings: [],
    };
    if (data.tickets.some((candidate) => candidate.id === ticket.id)) {
      showToast("A ticket with that name already exists.");
      return;
    }
    data.tickets.push(ticket);
    addAudit(user.id, `Added new ticket type ${ticket.name}.`);
    saveData(data);
    showToast("Ticket added.");
    renderManageTickets();
  });
}

function renderDrawNumbers() {
  const user = requireRole(["admin"]);
  if (!user) return;
  renderNav();
  const ticket = ticketById(state.adminTicketId) || data.tickets[0];
  state.adminTicketId = ticket.id;
  app.innerHTML = `
    <section class="stack">
      <div>
        <h1>Enter Winning Numbers</h1>
        <p class="lead">Admins enter official weekly numbers. The system recalculates winning orders and sends customer notifications automatically.</p>
      </div>
      <form id="draw-form" class="panel form">
        <div class="grid two">
          <div class="field">
            <label for="draw-ticket">Ticket</label>
            <select id="draw-ticket">${data.tickets.map((candidate) => `<option value="${candidate.id}" ${candidate.id === ticket.id ? "selected" : ""}>${escapeHtml(candidate.name)}</option>`).join("")}</select>
          </div>
          <div class="field">
            <label for="draw-date">Drawing date</label>
            <input id="draw-date" type="date" value="${escapeHtml(ticket.nextDrawingDate)}" required>
          </div>
        </div>
        <div class="field">
          <label>Winning numbers</label>
          ${numberInputs(0)}
        </div>
        <button class="button" type="submit">Save Winning Numbers</button>
      </form>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Ticket</th><th>Date</th><th>Numbers</th><th>Entered By</th></tr></thead>
          <tbody>${data.tickets.flatMap((candidate) => candidate.drawings.map((drawing) => ({ candidate, drawing }))).map(({ candidate, drawing }) => `
            <tr><td>${escapeHtml(candidate.name)}</td><td>${escapeHtml(drawing.date)}</td><td>${formatNumbers(drawing.numbers)}</td><td>${escapeHtml(userById(drawing.enteredBy)?.name || "Admin")}</td></tr>
          `).join("")}</tbody>
        </table>
      </div>
    </section>
  `;
  app.querySelector("#draw-ticket").addEventListener("change", (event) => {
    state.adminTicketId = event.target.value;
    renderDrawNumbers();
  });
  app.querySelector("#draw-form").addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const selectedTicket = ticketById(app.querySelector("#draw-ticket").value);
      const drawingDate = app.querySelector("#draw-date").value;
      const numbers = parseNumberInputs(app.querySelector("[data-line='0']"));
      const existing = drawingFor(selectedTicket, drawingDate);
      if (existing) {
        existing.numbers = numbers;
        existing.enteredBy = user.id;
      } else {
        selectedTicket.drawings.unshift({ date: drawingDate, numbers, enteredBy: user.id });
      }
      if (drawingDate === selectedTicket.nextDrawingDate) {
        const next = new Date(`${drawingDate}T00:00:00`);
        next.setDate(next.getDate() + 7);
        selectedTicket.nextDrawingDate = next.toISOString().slice(0, 10);
      }
      addAudit(user.id, `Saved winning numbers for ${selectedTicket.name} on ${drawingDate}.`);
      notifyWinners(selectedTicket.id, drawingDate);
      saveData(data);
      showToast("Winning numbers saved and customer notifications generated.");
      renderDrawNumbers();
    } catch (error) {
      showToast(error.message);
    }
  });
}

function renderAudit() {
  requireRole(["admin"]);
  renderNav();
  app.innerHTML = `
    <section class="stack">
      <div>
        <h1>Administrative Audit Trail</h1>
        <p class="lead">All major ticket, drawing, claim, and reporting actions are captured for accountability.</p>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Actor</th><th>Action</th></tr></thead>
          <tbody>${data.auditLog.map((entry) => `
            <tr><td>${escapeHtml(entry.date)}</td><td>${escapeHtml(userById(entry.actorId)?.name || "System")}</td><td>${escapeHtml(entry.action)}</td></tr>
          `).join("")}</tbody>
        </table>
      </div>
    </section>
  `;
}

function findTicketLine(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;
  for (const order of data.orders) {
    for (const line of order.lines) {
      if (line.confirmationNumber.toLowerCase() === normalized || line.ticketNumber.toLowerCase() === normalized) {
        return { order, line, result: evaluateLine(order, line), ticket: ticketById(order.ticketId), customer: userById(order.userId) };
      }
    }
  }
  return null;
}

function verificationPanel(found) {
  if (!found) {
    return state.verificationQuery ? `<div class="notice warn">No ticket matched that ticket number or confirmation number.</div>` : "";
  }
  const { order, line, result, ticket, customer } = found;
  const canVerify = result.prize >= 600 && line.claimStatus !== "center_verified";
  return `
    <div class="panel stack">
      <div class="spread">
        <div>
          <h2>${escapeHtml(ticket.name)} Verification</h2>
          <p class="muted">Customer: ${escapeHtml(customer.name)} | Order: ${escapeHtml(order.id)}</p>
        </div>
        <span class="badge ${result.prize > 0 ? "good" : result.status === "Pending" ? "warn" : ""}">${escapeHtml(result.status)}</span>
      </div>
      <div class="grid two">
        <div class="notice"><strong>Ticket</strong><p>${escapeHtml(line.ticketNumber)}</p><p>${escapeHtml(line.confirmationNumber)}</p></div>
        <div class="notice"><strong>Prize</strong><p>${result.matches} matches</p><p>${money(result.prize)}</p></div>
      </div>
      <p>Your numbers: ${formatNumbers(line.numbers)}</p>
      <p>Winning numbers: ${result.drawingNumbers ? formatNumbers(result.drawingNumbers) : "Pending weekly drawing"}</p>
      <p class="muted">Claim status: ${escapeHtml(claimLabel(line, result))}</p>
      ${result.prize > 0 && result.prize < 600 ? `<div class="notice">This prize is below $600 and should be claimed online by the customer.</div>` : ""}
      ${canVerify ? `<button class="secondary-button" type="button" data-verify="${line.id}">Verify Prize and Create Regulatory Report</button>` : ""}
    </div>
  `;
}

function renderVerify() {
  const user = requireRole(["claimingCenter", "admin"]);
  if (!user) return;
  renderNav();
  const found = findTicketLine(state.verificationQuery);
  app.innerHTML = `
    <section class="stack">
      <div>
        <h1>Claiming Center Verification</h1>
        <p class="lead">For prizes of $600 or more, staff verify the electronic ticket and create a regulatory report for tax and prize-verification records.</p>
      </div>
      <div class="panel form">
        <div class="field">
          <label for="verify-query">Ticket number or confirmation number</label>
          <input id="verify-query" value="${escapeHtml(state.verificationQuery)}" placeholder="Try CN-PB-1001 or PB-7G4K2">
        </div>
        <button class="button" type="button" data-search-claim>Search Ticket</button>
      </div>
      ${verificationPanel(found)}
    </section>
  `;
  app.querySelector("[data-search-claim]").addEventListener("click", () => {
    state.verificationQuery = app.querySelector("#verify-query").value;
    renderVerify();
  });
  app.querySelector("#verify-query").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      state.verificationQuery = event.target.value;
      renderVerify();
    }
  });
  const verifyButton = app.querySelector("[data-verify]");
  if (verifyButton && found) {
    verifyButton.addEventListener("click", () => {
      found.line.claimStatus = "center_verified";
      const report = {
        id: makeId("RPT"),
        date: TODAY,
        ticketNumber: found.line.ticketNumber,
        confirmationNumber: found.line.confirmationNumber,
        customerId: found.customer.id,
        prizeAmount: found.result.prize,
        status: "Prepared",
        verifiedBy: user.id,
      };
      data.reports.unshift(report);
      addMessage(found.customer.id, "Claiming Center verification complete", `${found.line.ticketNumber} was verified for ${money(found.result.prize)}. A regulatory report was prepared.`);
      addAudit(user.id, `Verified ${found.line.ticketNumber} and prepared regulatory report ${report.id}.`);
      saveData(data);
      showToast("Prize verified and regulatory report created.");
      renderVerify();
    });
  }
}

function renderReports() {
  const user = requireRole(["regulator", "admin"]);
  if (!user) return;
  renderNav();
  app.innerHTML = `
    <section class="stack">
      <div>
        <h1>Regulatory Reports</h1>
        <p class="lead">Reports for prizes of $600 or more are visible to the regulatory agency for tax reporting and compliance review.</p>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Report</th><th>Date</th><th>Customer</th><th>Ticket</th><th>Confirmation</th><th>Prize</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>${data.reports.map((report) => `
            <tr>
              <td>${escapeHtml(report.id)}</td>
              <td>${escapeHtml(report.date)}</td>
              <td>${escapeHtml(userById(report.customerId)?.name || "Unknown")}</td>
              <td>${escapeHtml(report.ticketNumber)}</td>
              <td>${escapeHtml(report.confirmationNumber)}</td>
              <td>${money(report.prizeAmount)}</td>
              <td><span class="badge ${report.status === "Accepted" ? "good" : "warn"}">${escapeHtml(report.status)}</span></td>
              <td>${report.status !== "Accepted" ? `<button class="secondary-button" type="button" data-accept-report="${report.id}">Accept</button>` : "Complete"}</td>
            </tr>
          `).join("") || `<tr><td colspan="8">No regulatory reports have been prepared yet. Verify CN-PB-1001 from the Claiming Center page to create one.</td></tr>`}</tbody>
        </table>
      </div>
    </section>
  `;
  app.querySelectorAll("[data-accept-report]").forEach((button) => {
    button.addEventListener("click", () => {
      const report = data.reports.find((candidate) => candidate.id === button.dataset.acceptReport);
      report.status = "Accepted";
      report.acceptedBy = user.id;
      report.acceptedDate = TODAY;
      addAudit(user.id, `Accepted regulatory report ${report.id}.`);
      saveData(data);
      showToast("Regulatory report accepted.");
      renderReports();
    });
  });
}

function render() {
  const user = currentUser();
  const currentRoute = route();
  if (!user && currentRoute !== "login") {
    go("login");
    return;
  }

  if (currentRoute === "login") renderAuth();
  else if (currentRoute === "home") renderHome();
  else if (currentRoute === "browse") renderBrowse();
  else if (currentRoute === "search") renderSearch();
  else if (currentRoute === "purchase") renderPurchase();
  else if (currentRoute === "orders") renderOrders();
  else if (currentRoute === "previous") renderPreviousNumbers();
  else if (currentRoute === "profile") renderProfile();
  else if (currentRoute === "admin") renderAdminDashboard();
  else if (currentRoute === "manage") renderManageTickets();
  else if (currentRoute === "draw") renderDrawNumbers();
  else if (currentRoute === "audit") renderAudit();
  else if (currentRoute === "verify") renderVerify();
  else if (currentRoute === "reports") renderReports();
  else go(user.role === "admin" ? "admin" : user.role === "claimingCenter" ? "verify" : user.role === "regulator" ? "reports" : "home");
}

window.addEventListener("hashchange", render);
render();
