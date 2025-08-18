



// ---------- Supabase ----------
const supabase = window.supabase.createClient(
  "https://hucjmggkasahwpjgnwia.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1Y2ptZ2drYXNhaHdwamdud2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MTI2MDIsImV4cCI6MjA3MDE4ODYwMn0.hxFmoZexaKverih9crJfP9fjWItOTfC_6D_CM7hr_Rg';"



);

let currentUser = null;

// ---------- Tabs ----------
window.showTab = function(name){
  document.querySelectorAll(".tab-content").forEach(p=>{
    p.classList.toggle("active", p.id === `${name}-tab`);
  });
  document.querySelectorAll(".tab-button").forEach(b=>{
    const match = b.textContent.toLowerCase().includes(name.replace("-"," "));
    b.classList.toggle("active", match);
  });
};

// ---------- Auth ----------
async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = "login.html"; return; }
  currentUser = session.user;

  const { data: parent } = await supabase
    .from("parents")
    .select("name")
    .eq("id", currentUser.id)
    .single();

  if (parent?.name) document.getElementById("parent-name").textContent = parent.name;
}

window.logout = async function () {
  await supabase.auth.signOut();
  window.location.href = "login.html";
};

// ---------- Data ----------
async function loadParentData() {
  // Students + latest enrollment + slot time
  const { data: students, error } = await supabase
    .from("students")
    .select(`
      *,
      enrollments!inner(
        status,
        payment_status,
        class_slots(
          day_of_week,
          start_time,
          end_time
        )
      )
    `)
    .eq("parent_id", currentUser.id);

  if (error) { console.error(error); return; }
  renderStudents(students || []);

  // Billing (orders list)
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("parent_id", currentUser.id)
    .order("created_at", { ascending:false });

  if (orders) renderBilling(orders);
}

function renderStudents(students){
  const el = document.getElementById("students-list");
  if (!el) return;

  if (!students.length){
    el.innerHTML = `<p class="muted">No students yet.</p>`;
    return;
  }

  const pad = t => (t || "").slice(0,5);
  const badge = s => {
    const x = (s||"").toLowerCase();
    if (x==="enrolled") return `<span class="badge badge-enrolled">Enrolled</span>`;
    if (x==="pending") return `<span class="badge badge-pending">Pending</span>`;
    if (x==="canceled" || x==="cancelled") return `<span class="badge badge-canceled">Canceled</span>`;
    return "";
  };

  el.innerHTML = students.map(s=>{
    const e = Array.isArray(s.enrollments) && s.enrollments[0] || null;
    const slot = e?.class_slots;
    const line = slot ? `${slot.day_of_week} • ${pad(slot.start_time)}–${pad(slot.end_time)}` : "No class assigned";
    return `
      <div class="student" data-student-id="${s.id}">
        <div>
          <div style="font-weight:700">${s.name}</div>
          <div class="muted">${line}</div>
        </div>
        <div>${e ? badge(e.status) : ""}</div>
      </div>
    `;
  }).join("");
}

function renderBilling(orders){
  const el = document.getElementById("billing-list");
  if (!el) return;
  if (!orders.length){ el.innerHTML = `<p class="muted">No orders yet.</p>`; return; }
  el.innerHTML = orders.map(o=>`
    <div class="student" style="gap:1rem">
      <div>
        <div style="font-weight:700">Order #${o.order_number || o.id.slice(0,8)}</div>
        <div class="muted">${new Date(o.created_at).toLocaleString()}</div>
      </div>
      <div class="muted">$${(o.total_amount||0).toFixed(2)}</div>
      <div>${o.status}</div>
    </div>
  `).join("");
}

// ---------- Boot ----------
document.addEventListener("DOMContentLoaded", () => {
  (async () => {
    await checkAuth();
    await loadParentData();
  })().catch(console.error);
});
