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

// Init
updateKeyStatus();
restoreDraft();

// Stats counter + auto-save
document.getElementById('raw-input').addEventListener('input', function() {
updateStats(this.value);
localStorage.setItem('qalam_draft', this.value);
});

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
const outputBox = document.getElementById('output-box');
const notesSection = document.getElementById('notes-section');

placeholder.style.display = 'none';
outputInner.style.display = 'block';
outputInner.innerHTML = '<span class="cursor"></span>';
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

} catch (err) {
  outputInner.style.display = 'none';
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
});
