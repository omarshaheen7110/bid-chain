// ============================================================
// QUOTE REQUEST PAGE LOGIC
// ============================================================

const MAX_FILE_MB = 25;
const ALLOWED_EXT = ['dxf', 'dwg', 'pdf'];

let selectedFiles = [];
let currentSession = null;

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const fileListEl = document.getElementById('fileList');
const form = document.getElementById('quoteForm');
const submitBtn = document.getElementById('submitBtn');
const formAlert = document.getElementById('formAlert');
const authGateNote = document.getElementById('authGateNote');
const sessionBar = document.getElementById('sessionBar');
const sessionEmail = document.getElementById('sessionEmail');
const logoutBtn = document.getElementById('logoutBtn');

// ---------- Session gating ----------
(async function initSession() {
  currentSession = await getCurrentSession();

  if (!currentSession) {
    authGateNote.style.display = 'flex';
    submitBtn.disabled = true;
    submitBtn.title = 'Log in to submit a quote request';
  } else {
    sessionBar.style.display = 'flex';
    sessionEmail.textContent = currentSession.user.email;
  }
})();

logoutBtn.addEventListener('click', logoutUser);

// ---------- File handling ----------
dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('drag-over');
  handleFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

function handleFiles(fileListRaw) {
  hideAlert(formAlert);
  const files = Array.from(fileListRaw);

  for (const file of files) {
    const ext = file.name.split('.').pop().toLowerCase();

    if (!ALLOWED_EXT.includes(ext)) {
      showAlert(formAlert, `"${file.name}" is not a supported file type. Allowed: DXF, DWG, PDF.`, 'error');
      continue;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      showAlert(formAlert, `"${file.name}" is larger than ${MAX_FILE_MB} MB.`, 'error');
      continue;
    }

    selectedFiles.push({ file, id: crypto.randomUUID(), ext });
  }

  renderFileList();
  fileInput.value = '';
}

function renderFileList() {
  fileListEl.innerHTML = '';
  selectedFiles.forEach(({ file, id, ext }) => {
    const row = document.createElement('div');
    row.className = 'file-row';
    row.id = 'file-' + id;
    row.innerHTML = `
      <div class="file-meta">
        <span class="file-ext">${ext.toUpperCase()}</span>
        <span class="file-name">${file.name}</span>
      </div>
      <div style="display:flex;align-items:center;">
        <span class="file-size">${formatSize(file.size)}</span>
        <button type="button" class="file-remove" data-id="${id}">✕</button>
      </div>
    `;
    fileListEl.appendChild(row);
  });

  fileListEl.querySelectorAll('.file-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedFiles = selectedFiles.filter(f => f.id !== btn.dataset.id);
      renderFileList();
    });
  });
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ---------- Submit ----------
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert(formAlert);

  if (!currentSession) {
    window.location.href = 'login.html';
    return;
  }

  const material = document.getElementById('material').value.trim();
  const quantity = document.getElementById('quantity').value;
  const deadline = document.getElementById('deadline').value || null;
  const message = document.getElementById('message').value.trim();

  clearFieldError(document.getElementById('field-material'));
  clearFieldError(document.getElementById('field-quantity'));

  let valid = true;
  if (material.length < 2) { setFieldError(document.getElementById('field-material'), 'Tell us what material this part needs.'); valid = false; }
  if (!quantity || Number(quantity) < 1) { setFieldError(document.getElementById('field-quantity'), 'Enter a quantity of 1 or more.'); valid = false; }
  if (selectedFiles.length === 0) {
    showAlert(formAlert, 'Attach at least one CAD drawing file.', 'error');
    valid = false;
  }
  if (!valid) return;

  setButtonLoading(submitBtn, true);

  try {
    const uploadedPaths = [];
    const userId = currentSession.user.id;

    for (const { file, id } of selectedFiles) {
      const path = `${userId}/${Date.now()}-${id}-${file.name}`;
      const { error: uploadError } = await supabaseClient
        .storage
        .from('quote-files')
        .upload(path, file);

      if (uploadError) throw uploadError;
      uploadedPaths.push(path);
    }

    const { error: insertError } = await supabaseClient
      .from('quote_requests')
      .insert([{
        user_id: userId,
        material: material,
        quantity: Number(quantity),
        deadline: deadline,
        message: message,
        file_paths: uploadedPaths,
        status: 'submitted'
      }]);

    if (insertError) throw insertError;

    showAlert(formAlert, 'Quote request submitted. We\u2019ll be in touch shortly with pricing.', 'success');
    form.reset();
    selectedFiles = [];
    renderFileList();

  } catch (err) {
    showAlert(formAlert, err.message || 'Something went wrong submitting your request.', 'error');
  } finally {
    setButtonLoading(submitBtn, false);
  }
});
