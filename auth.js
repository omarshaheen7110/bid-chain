// ============================================================
// AUTH HELPERS
// Shared by register.html, login.html and quote.html
// ============================================================

/**
 * Registers a new user in Supabase Auth. The extra profile fields
 * (name, phone, company) are passed as user metadata, and a
 * database trigger (see sql/fix_profile_trigger.sql) automatically
 * copies them into the "profiles" table the instant the account
 * is created — this works whether or not email confirmation is on.
 */
async function registerUser({ name, email, phone, company, password }) {
  const { data, error } = await supabaseClient.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        full_name: name,
        phone: phone,
        company_name: company
      }
    }
  });

  return { data, error };
}

async function loginUser({ email, password }) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password
  });
  return { data, error };
}

async function logoutUser() {
  await supabaseClient.auth.signOut();
  window.location.href = 'login.html';
}

async function getCurrentSession() {
  const { data } = await supabaseClient.auth.getSession();
  return data.session; // null if not logged in
}

/**
 * Call at the top of any page that should show session-aware UI
 * (e.g. the quote page's "Log in to submit" banner vs. the form).
 */
async function requireSessionOrRedirect(redirectTo = 'login.html') {
  const session = await getCurrentSession();
  if (!session) {
    window.location.href = redirectTo;
    return null;
  }
  return session;
}

function setButtonLoading(btn, isLoading) {
  btn.disabled = isLoading;
  btn.classList.toggle('loading', isLoading);
}

function showAlert(el, message, type = 'error') {
  el.textContent = message;
  el.className = `alert show alert-${type}`;
}

function hideAlert(el) {
  el.className = 'alert';
}

function setFieldError(fieldEl, message) {
  fieldEl.classList.add('has-error');
  const errEl = fieldEl.querySelector('.field-error');
  if (errEl) errEl.textContent = message;
}

function clearFieldError(fieldEl) {
  fieldEl.classList.remove('has-error');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  return /^[+\d][\d\s().-]{6,}$/.test(phone);
}
