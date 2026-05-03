const SYSTEM_PROMPT = `Kamu adalah SAIF — Smart AI Formatting, mesin pengubah prompt mentah menjadi prompt kelas dunia.

PERANMU
Setiap kali user mengirim draft prompt yang asal-asalan, tugasmu adalah menganalisis niat di baliknya dan menghasilkan prompt yang sudah direkayasa secara optimal — setara cara kerja prompt engineer terbaik di dunia.

PROSES KERJAMU
1. Identifikasi: Apa sebenarnya yang diinginkan dari prompt itu? (intent, bukan kata-kata)
2. Diagnosis: Apa yang kurang? (konteks, peran, constraint, format output, negative space)
3. Rekonstruksi: Bangun ulang prompt dengan struktur optimal
4. Serahkan: Output HANYA berupa prompt final yang siap digunakan

OUTPUT FORMAT
Selalu keluarkan dalam struktur ini persis:

---
[PROMPT FINAL]
(prompt yang sudah dioptimasi, siap copy-paste)
---

[CATATAN SINGKAT]
- Apa yang diubah dan mengapa (maksimal 3 poin, masing-masing 1 kalimat)
---

PRINSIP PROMPT ENGINEERING
- Peran spesifik dan berdimensi
- Konteks situasional yang cukup — siapa audiensnya, apa tujuan akhirnya
- Constraint positif DAN negatif
- Format output eksplisit
- Chain-of-thought trigger jika task kompleks

ATURAN KERAS
- Jangan pernah bertanya balik sebelum memberikan hasil
- Jangan tambahkan disclaimer atau basa-basi
- Jika intent ambigu, pilih interpretasi paling kuat dan jalankan — sebutkan asumsi di Catatan Singkat
- Output harus langsung bisa digunakan tanpa editing`;

// State
let apiKey = localStorage.getItem('qalam_groq_key') || '';
let isLoading = false;
let fullOutput = '';
const HISTORY_KEY = 'qalam_history';
const HISTORY_MAX = 20;

// Init
updateKeyStatus();
restoreDraft();
renderHistory();

// Stats counter + auto-save
document.getElementById('raw-input').addEventListener('input', function() {
updateStats(this.value);
localStorage.setItem('qalam_draft', this.value);
showDraftSavedToast();
});

let draftSaveTimeout;
function showDraftSavedToast() {
  clearTimeout(draftSaveTimeout);
  draftSaveTimeout = setTimeout(() => showToast('Draft saved'), 800);
}

function updateStats(text) {
const words = text.trim() ? text.trim().split(/\s+/).length : 0;
const tokens = Math.ceil(text.length / 4); // rough estimate
document.getElementById('char-count').textContent = words + ' kata · ~' + tokens + ' token';
}

function restoreDraft() {
const saved = localStorage.getItem('qalam_draft') || '';
if (saved) {
  document.getElementById('raw-input').value = saved;
  updateStats(saved);
}
}

function clearAll() {
document.getElementById('raw-input').value = '';
localStorage.removeItem('qalam_draft');
updateStats('');
fullOutput = '';
document.getElementById('output-inner').style.display = 'none';
document.getElementById('output-skeleton').style.display = 'none';
document.getElementById('placeholder').style.display = 'flex';
document.getElementById('output-box').classList.remove('has-content');
document.getElementById('notes-section').classList.remove('visible');
hideError();
}

function updateKeyStatus() {
const dot = document.getElementById('key-dot');
const label = document.getElementById('key-label');
if (apiKey) {
  dot.classList.add('active');
  label.textContent = 'gsk-···' + apiKey.slice(-4);
} else {
  dot.classList.remove('active');
  label.textContent = 'set api key';
}
}

function openModal() {
document.getElementById('api-key-input').value = apiKey;
document.getElementById('modal').classList.add('open');
setTimeout(() => document.getElementById('api-key-input').focus(), 100);
}

function closeModal() {
document.getElementById('modal').classList.remove('open');
}

function saveKey() {
const val = document.getElementById('api-key-input').value.trim();
if (val) {
  apiKey = val;
  localStorage.setItem('qalam_groq_key', val);
  updateKeyStatus();
}
closeModal();
}

document.getElementById('modal').addEventListener('click', function(e) {
if (e.target === this) closeModal();
});

document.getElementById('api-key-input').addEventListener('keydown', function(e) {
if (e.key === 'Enter') saveKey();
if (e.key === 'Escape') closeModal();
});

// ESC to close modal from anywhere when modal is open
document.addEventListener('keydown', function(e) {
if (e.key === 'Escape' && document.getElementById('modal').classList.contains('open')) {
  closeModal();
}
});

function showError(msg) {
const el = document.getElementById('error-msg');
el.textContent = msg;
el.classList.add('visible');
}

function hideError() {
document.getElementById('error-msg').classList.remove('visible');
}

function copyOutput() {
if (!fullOutput) return;
navigator.clipboard.writeText(fullOutput).then(() => {
  const btn = document.getElementById('copy-btn');
  btn.textContent = 'copied!';
  btn.classList.add('ok');
  setTimeout(() => { btn.textContent = 'copy'; btn.classList.remove('ok'); }, 1500);
  showToast('Copied!');
});
}

async function forge() {
const raw = document.getElementById('raw-input').value.trim();
if (!raw) return;
if (!apiKey) { openModal(); return; }
if (isLoading) return;

isLoading = true;
hideError();
fullOutput = '';

const btn = document.getElementById('forge-btn');
btn.classList.add('loading');
btn.disabled = true;

const placeholder = document.getElementById('placeholder');
const outputInner = document.getElementById('output-inner');
const outputSkeleton = document.getElementById('output-skeleton');
const outputBox = document.getElementById('output-box');
const notesSection = document.getElementById('notes-section');

placeholder.style.display = 'none';
outputInner.style.display = 'none';
outputSkeleton.style.display = 'flex';
outputBox.classList.remove('has-content');
notesSection.classList.remove('visible');

try {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1500,
      stream: true,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: raw }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'API error ' + response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') break;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          if (outputSkeleton.style.display !== 'none') {
            outputSkeleton.style.display = 'none';
            outputInner.style.display = 'block';
            outputInner.innerHTML = '<span class="cursor"></span>';
          }
          fullOutput += delta;
          renderOutput(fullOutput);
        }
      } catch {}
    }
  }

  // Final render without cursor
  renderOutput(fullOutput, true);
  outputBox.classList.add('has-content');
  parseAndShowNotes(fullOutput);

  // Save successful forge to history
  saveToHistory(raw, fullOutput);

} catch (err) {
  outputInner.style.display = 'none';
  outputSkeleton.style.display = 'none';
  placeholder.style.display = 'flex';
  showError('Error: ' + err.message);
} finally {
  isLoading = false;
  btn.classList.remove('loading');
  btn.disabled = false;
}
}

function renderOutput(text, final = false) {
const outputInner = document.getElementById('output-inner');
// Extract just the prompt final part for display
const promptMatch = text.match(/\[PROMPT FINAL\]([\s\S]*?)(?=\[CATATAN SINGKAT\]|$)/);
let display = text;
if (promptMatch) {
  display = text.split('[CATATAN SINGKAT]')[0];
}
const escaped = display.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
outputInner.innerHTML = escaped + (final ? '' : '<span class="cursor"></span>');
}

function parseAndShowNotes(text) {
const match = text.match(/\[CATATAN SINGKAT\]([\s\S]*?)(?:---|$)/);
if (match) {
  const notes = match[1].trim();
  document.getElementById('notes-content').textContent = notes;
  document.getElementById('notes-section').classList.add('visible');
}
}

// Keyboard shortcut
document.addEventListener('keydown', function(e) {
if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') forge();
if (e.key === 'Escape' && document.getElementById('history-drawer').classList.contains('open')) {
  toggleHistory();
}
});

/* ─────────── History ─────────── */

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch { return []; }
}

function saveHistoryList(list) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}

function saveToHistory(raw, refined) {
  const list = loadHistory();
  const item = {
    id: Date.now(),
    raw: raw,
    refined: refined,
    date: new Date().toISOString()
  };
  list.unshift(item);
  if (list.length > HISTORY_MAX) list.length = HISTORY_MAX;
  saveHistoryList(list);
  renderHistory();
}

function deleteHistoryItem(id) {
  const list = loadHistory().filter(item => item.id !== id);
  saveHistoryList(list);
  renderHistory();
}

function deleteAllHistory() {
  if (!confirm('Hapus seluruh riwayat prompt? Tindakan ini tidak bisa dibatalkan.')) return;
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
  showToast('History cleared');
}

function loadHistoryItem(id) {
  const item = loadHistory().find(h => h.id === id);
  if (!item) return;
  document.getElementById('raw-input').value = item.raw;
  updateStats(item.raw);
  localStorage.setItem('qalam_draft', item.raw);
  fullOutput = item.refined;
  renderOutput(fullOutput, true);
  document.getElementById('placeholder').style.display = 'none';
  document.getElementById('output-skeleton').style.display = 'none';
  document.getElementById('output-inner').style.display = 'block';
  document.getElementById('output-box').classList.add('has-content');
  parseAndShowNotes(fullOutput);
  toggleHistory();
}

function toggleHistory() {
  const drawer = document.getElementById('history-drawer');
  const backdrop = document.getElementById('history-backdrop');
  const isOpen = drawer.classList.contains('open');
  if (isOpen) {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
  } else {
    drawer.classList.add('open');
    backdrop.classList.add('open');
  }
}

function formatHistoryDate(isoString) {
  const d = new Date(isoString);
  const pad = n => String(n).padStart(2, '0');
  return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function renderHistory() {
  const listEl = document.getElementById('history-list');
  const list = loadHistory();
  if (!list.length) {
    listEl.innerHTML = '<div class="history-empty">Belum ada riwayat</div>';
    document.getElementById('btn-delete-all').style.display = 'none';
    return;
  }
  document.getElementById('btn-delete-all').style.display = 'block';
  listEl.innerHTML = list.map(item => {
    const preview = item.raw.replace(/\s+/g, ' ').trim().slice(0, 40) + (item.raw.length > 40 ? '…' : '');
    const dateStr = formatHistoryDate(item.date);
    return (
      '<div class="history-item" onclick="loadHistoryItem(' + item.id + ')">' +
        '<div class="history-meta">' +
          '<span class="history-date">' + dateStr + '</span>' +
          '<button class="history-delete" onclick="event.stopPropagation(); deleteHistoryItem(' + item.id + ')" title="Hapus">✕</button>' +
        '</div>' +
        '<div class="history-preview">' + escapeHtml(preview) + '</div>' +
      '</div>'
    );
  }).join('');
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ─────────── Toast ─────────── */

function showToast(message) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);

  // Trigger reflow for animation
  void toast.offsetWidth;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('hide');
    toast.addEventListener('transitionend', () => toast.remove());
  }, 2000);
}
