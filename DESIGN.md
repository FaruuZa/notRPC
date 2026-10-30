---
name: Element Clash
description: Realtime multiplayer tactical element card game
colors:
  primary: "#a68058"
  bg-felt: "#121620"
  bg-surface: "#181c26"
  bg-subsurface: "#141720"
  border-subtle: "rgba(255, 255, 255, 0.08)"
  border-focus: "#a68058"
  text-primary: "#f8fafc"
  text-secondary: "#94a3b8"
  text-dark: "#0f172a"
  fire: "#d93838"
  fire-matte: "#2c1616"
  water: "#2c7be5"
  water-matte: "#16202c"
  nature: "#2d9a59"
  nature-matte: "#162c1e"
  neutral: "#64748b"
  neutral-matte: "#20242c"
  chaos: "#8e44ad"
  chaos-matte: "#25162c"
  shield: "#00bcd4"
typography:
  display:
    fontFamily: "'Anton', sans-serif"
    fontWeight: 700
    lineHeight: 1.1
  title:
    fontFamily: "'Anton', sans-serif"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "'Archivo', sans-serif"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: "'Anton', sans-serif"
    fontWeight: 700
    letterSpacing: "0.06em"
rounded:
  none: "0px"
  circle: "50%"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.none}"
    padding: "10px 22px"
  button-secondary:
    backgroundColor: "{colors.bg-surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.none}"
    padding: "8px 18px"
---

# Design System: Element Clash

## Overview

**Creative North Star: "Tumpukan Geometri Dasar (Pure Geometric Stacking)"**

Element Clash mengadopsi bahasa visual **geometri murni yang ditumpuk-tumpuk**:
- **Bentuk tegas tanpa kompromi**: Jika kotak, maka benar-benar bersudut siku murni (`border-radius: 0px`). Jika lingkaran, maka benar-benar lingkaran sempurna (`border-radius: 50%` untuk indikator titik/poin/avatar). Tidak ada sudut tanggung (rounded 2px-8px ataupun bentuk oval/pill).
- **Border yang tenang & menyatu (Low-Contrast Framing)**: Mengurangi border kontras tebal atau garis neon mencolok. Hirarki visual dibangun melalui **penumpukan bidang geometri** dengan perbedaan gelap-terang latar (tonal stacking), border tipis berdensitas rendah (`rgba(255, 255, 255, 0.08)` atau tonal match), dan aksen warna hanya pada status kritis atau interaktif aktif.
- **Integritas Kartu**: Kartu duel tetap mempertahankan proporsi dan desain standarnya tanpa diubah.

---

## Aturan Geometri & Bentuk

1. **Kotak Siku Murni (`0px radius`)**:
   - Play slot arena (drop zone): kontainer dibuat transparan murni (`background: transparent !important`) dengan border putus-putus halus, sehingga teks coretan di background terlihat tembus pandang tanpa terhalang kotak solid. Jarak pemisah antar-kartu dibuat lapang (`gap: clamp(8rem, 20vw, 16rem)` desktop, `clamp(4.5rem, 14vw, 8rem)` mobile).
   - Tombol aksi (Inventory kanan bawah, Menu Dropdown items)
   - HP Bar container & meter diperbesar (`22px` desktop, `16px` mobile) dengan outline bersih tanpa kotak objek latar belakang tebal (penghapusan kotak latar agar tidak mendistraksi pandangan).
   - Drawer, Modal, & Dialog container
2. **Peniadaan Box Container pada HUD, Relik, & Status**:
   - Panel HUD pemain dan musuh mengapung bebas (*free-floating*) tanpa kotak/bingkai latar (*no box container*), tanpa efek glow membungkus bekas box container lama.
   - HP Bar tampil bersih tanpa objek geometri latar belakang tebal (`::before` dihapus agar tidak mendistraksi pandangan).
   - HUD Musuh dicerminkan (*mirrored*): posisi dimulai dari sisi kanan, pengurangan HP mengalir ke kanan, deretan relik & status rata kanan.
   - Relik dan efek status mengapung langsung dengan ikon bernuansa warna kelangkaan/status & bayangan tipis (*drop-shadow*), tanpa pembungkus kotak balok.
   - Shield indicator tampil bersih langsung bersama ikon dan nilai numeriknya tanpa box framing.
3. **Peniadaan Tombol Lock & Text VS: Coretan Latar Belakang Masif (Flat Watermark Backdrop)**:
   - Teks VS dan tombol lock di tengah arena dihilangkan sepenuhnya.
   - Pemilihan kartu dilakukan murni langsung melalui kartu di tangan: klik sekali untuk memilih/melihat efek kartu, klik kembali pada kartu yang dipilih atau klik dua kali untuk mengonfirmasi (*lock in*).
   - Indikator status pertarungan tampil sebagai "coretan" tipografi masif atmosferik (`clamp(3.8rem, 9.5vw, 7.5rem)` di PC, `clamp(3.2rem, 11vw, 5.2rem)` di mobile — mencakup ~70-75% lebar layar mobile tanpa overflow) dengan `position: absolute; z-index: 0;` di layer paling bawah di belakang slot arena dan kartu:
     - Bentuk dibuat miring/diagonal (`transform: translate(-50%, -50%) rotate(-7deg)`).
     - Pure flat 1 warna polos tanpa glow, tanpa bayangan teks (*text-shadow: none*), dan tanpa animasi/gerakan berdenyut (*pure static watermark*).
     - Status tetap bertahan pada sudut pandang pemain (`CHOOSE CARD` saat memilih kartu, `WAITING` saat menunggu musuh).
     - Bahasa Inggris: `CHOOSE CARD`, `WAITING`, `SUPERIOR`, `TIE`, `INFERIOR`.
4. **Lingkaran Murni & Semi-Lingkaran (Arch)**:
   - Titik ronde / skor (`.point-dot`) yang mengapit sayap kiri/kanan di widget tengah atas dicerminkan simetris mulai dari tengah (`flex-direction: row-reverse` pada pemain): poin ronde 1 menyala dari titik terdekat dengan arch menuju ke luar.
   - Semi-circle Arch (`.hub-arch-container`) di tengah atas: outline visual dengan transisi warna dinamis halus (Hijau saat penuh -> Kuning saat separuh -> Merah saat kritis) tanpa angka numerik, dan menghilang total saat durasi 0 detik tanpa sisa cap SVG. Tombol menu dropdown berada di pusat busur (`CLASH LOG`, `SURRENDER`).
   - Indikator stack relik (`.relic-stack-indicator`).
   - Hand tracker kartu musuh di HUD dihilangkan sepenuhnya agar area status musuh bersih.
5. **Bahasa Inggris Standar (English UI)**:
   - Semua elemen antarmuka duel menggunakan Bahasa Inggris standar yang ringkas dan profesional:
     - Slot arena: `YOUR PLAY`, `OPPONENT PLAY`.
     - Tombol & Menu: `INVENTORY`, `CLASH LOG`, `SURRENDER`, `CLOSE`, `CANCEL`, `YES, SURRENDER`.
     - Tab & Koleksi: `MY CARDS`, `MY RELICS`, `PURIFY TOKENS`.
     - Label Status HUD: `You`, `Opponent`, `No active quest`.
6. **Quest Tracker Ultra-Kompak**:
   - Tampilan bersih menggunakan lempengan slate transparan gelap.
   - Saat di-collapse, mengecil secara drastis menjadi tab minimalis di tepi kiri (`< 85px`) yang hanya menampilkan ikon scroll dan progres mini (`0/0`). Info reward disembunyikan.
7. **Major Rework Layar Penuh Inventory (Zero Layout Shift & Super Ringan)**:
   - Arsitektur antarmuka inventory (`#deck-modal .inventory-shell`) dirancang murni layar penuh (`100vw x 100dvh`), tidak lagi mengecil atau bergeser ketika jumlah kartu sedikit maupun kosong (*strict zero layout shift*).
   - Viewport kartu/relik mengisi sisa ruang layar secara penuh (`flex: 1 1 0; height: 100%; min-height: 0;`).
   - Header terstruktur: judul minimal, tab kartu & relik dengan garis bawah aktif, tag Purify Token polos tanpa background box (`background: none; border: none;`), dan tombol Close tunggal di kanan atas (tombol back/close bawah dihilangkan agar tidak redundan).
   - Viewport kartu/relik mengisi ruang layar secara penuh hingga tepi bawah (`flex: 1 1 0; height: 100%; min-height: 0;`).
   - Optimasi performa: `DocumentFragment` batching, caching hash deck (menghindari rebuild DOM saat tab aktif), CSS `content-visibility: auto; contain: content;` pada grid dan `contain: layout style paint;` pada kartu.
8. **Clash History Log Bersih & Tanpa Kotak Latar Belakang Item**:
   - Menghapus seluruh background kotak dan outline berlebih pada entri dan badge log (`.clash-outcome-badge.inferior`, `.clash-outcome-badge.superior`, `.stat-pill`, `.clash-log-entry`).
   - Format duel minimalis 2 baris berbasis warna teks murni: badge putaran (`R1·T2`), teks status berwarna tegas, nama kartu terpotong elipsis, serta angka damage & shield tanpa kotak pembungkus.
9. **Popup & Dialog Minimalis**:
   - Semua modal/popup (`surrender-modal`, `quest-pool-modal`) menggunakan kontainer `.minimal-popup-card`: latar belakang gelap pekat (`#0d111a`), single border halus `1px solid rgba(255, 255, 255, 0.09)`, tanpa border kuning/brass tebal di bagian atas, dan tanpa tumpukan outline yang mengganggu.
10. **Komponen Kartu Tunggal & Kanonikal (Single Canonical Card Component - Scale Only)**:
   - Kartu adalah satu objek tunggal imutabel dengan dimensi dasar `140px × 196px` (rasio aspek 5:7).
   - Seluruh sub-elemen internal kartu (`.card-face`, `.card-header`, `.card-name`, `.card-middle`, `.card-element-icon`, `.card-desc`, `.card-footer`, `.card-element-name`) didefinisikan satu kali secara eksklusif di `battle.css`.
   - **Larangan mutlak mengubah ukuran font, padding, tinggi, atau margin internal kartu** di media query atau file CSS lainnya.
   - Pengecilan/pembesaran ukuran kartu di mana pun (hand, slot arena, inventori landscape, kompendium, draft) dilakukan strictly menggunakan `transform: scale(...)` sehingga seluruh tipografi, border, dan proporsi internal terskala secara vektor murni (100% presisi dan tidak pernah gepeng/melar).
   - Tampilan koleksi kartu di Inventori dan Kompendium menggunakan `display: flex; flex-wrap: wrap; justify-content: center; gap: 1.25rem;` alih-alih CSS Grid kolom `1fr`, memastikan kartu selalu mempertahankan bentuk aslinya berapapun jumlah kartu yang dimiliki.
11. **Wordmark Main Menu & Gate Screen**:
   - Mempertahankan identitas wordmark vertikal bertumpuk khas Atlus/Persona di Main Menu (`ELEMENT` / `CLASH` merah, subteks `Realtime Card Duel`, dan spektrum 5 elemen) serta tampilan layar awal gate yang bersih (`AUTHENTICATING COMBATANT` / `ELEMENT CLASH`).
12. **Quest Tier Selection (Pure Rectangular Geometry & No-Box Tokens/Rewards)**:
   - Kartu Quest Tier (`.quest-tier-card`, `.quest-card`, `.quest-revealed-card`) murni bersudut siku (`border-radius: 0px`) dengan border tunggal netral rendah-kontras (`rgba(255, 255, 255, 0.08)`), tanpa aksen garis tebal di sisi atas box (`border-top: none`).
   - Removal Token ditampilkan sebagai teks polos bergaya flat (`color: #ff9d66`) bersama ikon api tanpa kotak outline/background.
   - Daftar Rewards/Perks mengalir langsung di latar belakang kartu tanpa kotak pembungkus (`background: none; border: none; padding: 0`).
   - Tombol pemilihan tier (`CHOOSE EASY/MEDIUM/HARD`) berbentuk blok penuh bersudut siku murni (`0px radius`).
   - Tombol dan popup pool details dihilangkan sepenuhnya demi kesederhanaan dan kebersihan tampilan visual.

---

## Palet Warna & Permukaan

- **Base Felt (`#121620`)**: Permukaan meja duel terluar.
- **Bidang Permukaan (`#181c26`)**: Blok dasar untuk panel HUD, tray, dan drawer.
- **Bidang Tumpukan Atas (`#1e2330` / `#232938`)**: Elemen yang ditumpuk di atas blok dasar (slot HP, tombol, dsb).
- **Border Rendah Kontras (`rgba(255, 255, 255, 0.08)` / `#232a3b`)**: Pemisah antar-blok yang elegan tanpa garis mencolok.
- **Aksen Tonal (Fokus)**:
   - Antique Brass (`#a68058`): Tombol aktif, giliran aktif.
   - Fire (`#d93838`), Water (`#2c7be5`), Nature (`#2d9a59`), Chaos (`#8e44ad`), Neutral (`#64748b`), Shield (`#00bcd4`).

---

## Tipografi

- **Display & Headings**: `'Anton', sans-serif` — Geometri font kokoh dan tegas.
- **Body & Rules**: `'Archivo', sans-serif` — Pembacaan jernih dan netral.
- **Card Titles**: `'Space Grotesk', 'Archivo', sans-serif` — Standar kartu pertempuran.


---

## Interaksi Kartu & Fisika Pertempuran

1. **Drag-and-Drop ke Play Slot**:
   - Kartu di tangan dapat ditarik (*drag*) langsung menuju `#player-play-slot`.
   - Ketika mendekati slot, slot memicu status `.snap-active` dengan efek magnetic highlight dan pembesaran halus.
   - Melepas kartu di atas slot memicu konfirmasi kartu (*play card*).
   - Melepas di luar slot mengembalikan kartu secara mulus (*snap back*) ke formasi kipas tangan menggunakan kurva `easeOutQuad`.
   - Tap tunggal dan *double-tap* tetap didukung secara penuh untuk kenyamanan pemain di perangkat layar sentuh dan desktop.

2. **Fisika Animasi Pembalikan Kartu (Corner Hinge Peel & Flip)**:
   - Kartu tidak berputar simetris di tengah (*in-place*), melainkan menirukan dealer kartu fisik:
   - Sumbu rotasi (*transform-origin*) berada di pojok kiri bawah (`0% 100%`).
   - Kartu bergeser ke samping (`translateX`), sedikit terangkat dari meja (`translateY` & `scale`), dan berputar melewati sumbu sudut kiri sebelum mendarat mantap dengan easing `easeOutBack`.

3. **Proporsi Skala Kartu Arena di Mobile**:
   - Kontainer arena slot menggunakan skala fisik terpusat (`transform: scale(0.55)`), dengan kartu di dalamnya mengisi 100% dimensi slot.
   - Posisi `.arena-zone` dinaikkan ke `top: 36%` untuk menghindari tumpang tindih dengan kipas kartu tangan.
   - Atribut CSS `!important` dilarang digunakan pada `transform` elemen kartu agar anime.js dapat mengeksekusi animasi transformatif secara bebas.
