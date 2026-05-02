# qalam — Panduan Penggunaan

## Apa itu qalam?

**qalam** adalah mesin prompt engineering yang mengubah draft prompt mentah menjadi prompt elite-grade — siap pakai untuk Groq, Claude, ChatGPT, atau model LLM lainnya.

Cara kerjanya sederhana: **masukkan draft asal-asalan → dapat prompt yang sudah direkayasa secara optimal.**

---

## Cara Pakai

### 1. Masukkan API Key
- Klik **"set api key"** di pojok kanan atas.
- Masukkan Groq API Key kamu (gratis di [console.groq.com/keys](https://console.groq.com/keys)).
- Key disimpan **hanya di browser kamu** (localStorage), tidak dikirim ke server manapun selain Groq.

### 2. Tulis Draft Prompt
- Di kolom **Input**, tulis ide prompt kamu sebebas mungkin.
- Tidak perlu rapi. Bahasa campur-campur, singkat, atau bahkan cuma keyword — semua bisa diproses.

### 3. Forge
- Klik tombol **"Forge Prompt ↗"** atau tekan `Ctrl + Enter` / `Cmd + Enter`.
- Tunggu 3-10 detik. Output akan muncul secara streaming.

### 4. Copy & Pakai
- Klik **"copy"** di pojok kanan atas kolom Output.
- Paste ke LLM favorit kamu.

---

## Tips Hasil Maksimal

| Jika Draft Kamu... | Hasil Akan... |
|-------------------|---------------|
| Satu kalimat singkat | Tetap terstruktur, tapi konteks terbatas |
| Beberapa poin + intent | Lebih kaya constraint dan persona |
| Bahasa gaul / campur | Diterjemahkan ke bahasa profesional |
| Ada contoh kasus | Prompt akan lebih situasional |

**Rule of thumb:** Semakin spesifik intent kamu, semakin presisi outputnya.

---

## Keyboard Shortcuts

| Shortcut | Aksi |
|----------|------|
| `Ctrl / Cmd + Enter` | Forge prompt |
| `Esc` | Tutup modal API key |

---

## Keamanan & Privasi

### API Key
- API Key Groq kamu disimpan di **localStorage browser**.
- Tidak ada backend qalam yang menyimpan atau membaca key ini.
- Request API dikirim langsung dari browser ke `api.groq.com`.

### Data Input & Output
- Draft prompt dan hasil output **tidak tersimpan di server**.
- Untuk kenyamanan, draft otomatis tersimpan di localStorage browser kamu saja.
- Klik **Clear** untuk menghapus draft dan output dari layar sekaligus localStorage.

### Analytics
- Saat ini tidak ada analytics atau tracking pihak ketiga.
- Tidak ada cookie yang digunakan.

### Kontak
Jika ada pertanyaan keamanan atau privasi, hubungi: **ridlo@saif.co.id**

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| "Error: Invalid API Key" | Periksa key di [console.groq.com](https://console.groq.com/keys). Pastikan key belum expired. |
| "Error: Rate limit exceeded" | Groq free tier memiliki limit. Tunggu 1-2 menit lalu coba lagi. |
| Output kosong / tidak muncul | Cek koneksi internet. Refresh halaman dan coba ulang. |
| Modal tidak bisa ditutup | Klik area gelap di luar modal, atau tekan `Esc`. |

---

## Filosofi

> "A prompt is only as good as the clarity behind it. qalam does not add magic — it surfaces what you already know."

qalam tidak membuat prompt dari nol. Ia mengekstrak niat terbaik dari pikiran kamu, lalu menyusunnya dengan struktur optimal.

---

*Built by [Ridlo Abelian](https://ridlo.id) · Waqf × AI × Indonesia*
