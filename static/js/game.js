// Inisialisasi koneksi socket
const socket = io();

// --- Konfigurasi dan Peta Koordinat Papan ---
const boardCoordinates = [];
const TOTAL_BOXES = 100;

function generateCoordinates() {
    const boardElement = document.getElementById('game-board');
    const boardSize = boardElement.clientWidth;
    
    // --- PENGATURAN OFFSET ---
    // Ubah angka ini sampai pas di tengah kotak
    const OFFSET_X = 15; // Geser ke KANAN (pixel) untuk menghindari border kiri
    const OFFSET_Y = 20; // Geser ke ATAS (pixel) untuk menghindari border bawah
    
    // Kurangi ukuran papan efektif dengan total border kiri+kanan agar kalkulasi kotak lebih akurat
    // Misal border kiri 15px, kanan 15px, total 30px.
    const EFFECTIVE_BOARD_SIZE = boardSize - (OFFSET_X * 2); 
    
    const BOXES_PER_ROW = 10;
    // Hitung ukuran kotak berdasarkan area yang tersisa (setelah dikurangi border)
    const boxSize = EFFECTIVE_BOARD_SIZE / BOXES_PER_ROW;

    // Set titik awal
    let startX = OFFSET_X; 
    let startY = (boardSize - boxSize) - OFFSET_Y; // Naik ke atas sedikit

    let currentX = startX;
    let currentY = startY;
    let direction = 1;

    for (let i = 0; i < TOTAL_BOXES; i++) {
        // Sesuaikan ukuran pion (misal 50px)
        const pionSize = 50; 
        
        // Rumus centering tetap sama
        const centeredX = currentX + (boxSize / 2) - (pionSize / 2);
        const centeredY = currentY + (boxSize / 2) - (pionSize / 2);
        
        boardCoordinates.push({ x: centeredX, y: centeredY, direction: direction });
        
        currentX += boxSize * direction;
        if ((i + 1) % BOXES_PER_ROW === 0) {
            currentY -= boxSize;
            direction *= -1;
            currentX += boxSize * direction;
        }
    }
    console.log("Peta Koordinat Papan berhasil dibuat dengan Offset.");
}

// --- Elemen DOM ---
const board = document.getElementById('game-board');
const roomCodeDisplay = document.getElementById('room-code-display');
const turnInfo = document.getElementById('turn-info');
const diceInfo = document.getElementById('dice-info');
const rollDiceBtn = document.getElementById('roll-dice-btn');
const muridControls = document.getElementById('murid-controls');
const guruControls = document.getElementById('guru-controls');
const btnCorrect = document.getElementById('btn-correct');
const btnIncorrect = document.getElementById('btn-incorrect');
const questionModal = document.getElementById('question-modal');
const questionText = document.getElementById('question-text');
const answerText = document.getElementById('answer-text');
const diceImg = document.getElementById('dice-img');

// Elemen Audio
const audioWrapper = document.getElementById('audio-wrapper');
const hiddenAudio = document.getElementById('hidden-audio');
const audioSource = document.getElementById('audio-source');
const playAudioBtn = document.getElementById('play-audio-btn');

// --- State Lokal ---
let myRole = sessionStorage.getItem('role');
let roomCode = sessionStorage.getItem('room_code');
let isAnimating = false; // Flag untuk mencegah update saat animasi berjalan
let localState = {};     // Menyimpan state terakhir untuk perbandingan

// --- Fungsi Helper Animasi ---

// Animasi Pion Berjalan Langkah demi Langkah
async function movePionStepByStep(pionElement, startPos, endPos) {
    pionElement.classList.add('is-moving'); // Bisa digunakan untuk CSS effect
    const step = startPos < endPos ? 1 : -1;

    // Loop dari posisi sekarang ke posisi tujuan
    for (let i = startPos; i !== endPos; i += step) {
        const nextSquareIndex = i + step;
        const squareData = boardCoordinates[nextSquareIndex - 1];
        
        if (squareData) {
            pionElement.style.left = `${squareData.x}px`;
            pionElement.style.top = `${squareData.y}px`;
            
            // Opsional: Tambahkan class jika bergerak ke kiri (untuk membalik gambar pion)
            if (squareData.direction === -1) {
                pionElement.classList.add('facing-left');
            } else {
                pionElement.classList.remove('facing-left');
            }
        }
        // Tunggu 200ms sebelum langkah berikutnya (kecepatan jalan)
        await new Promise(resolve => setTimeout(resolve, 200)); 
    }
    
    pionElement.classList.remove('is-moving');
}

// Animasi Dadu Berputar
function animateDiceAndShowResult(finalRoll) {
    return new Promise(resolve => {
        let spinCount = 0;
        const maxSpins = 10; // Berputar sekitar 1.5 detik
        
        const animationInterval = setInterval(() => {
            const randomFace = Math.floor(Math.random() * 6) + 1;
            // Pastikan path gambar sesuai dengan folder Anda
            diceImg.src = `/static/images/dice/dice (${randomFace}).png`; 
            
            spinCount++;
            if (spinCount >= maxSpins) {
                clearInterval(animationInterval);
                // Tampilkan hasil akhir
                diceImg.src = `/static/images/dice/dice (${finalRoll}).png`; 
                setTimeout(resolve, 500); // Jeda sebentar sebelum pion jalan
            }
        }, 100); // Ganti gambar setiap 100ms
    });
}

// --- Fungsi Utama untuk Merender Game ---

async function renderGameState(state) {
    // Jika sedang animasi, jangan proses update baru dulu agar tidak glitch
    if (isAnimating) return;
    isAnimating = true;

    try {
        console.log("Menerima update:", state);
        
        const oldState = localState;
        localState = state; // Update state lokal

        // Reset tampilan dasar
        questionModal.classList.add('hidden'); // Sembunyikan modal jika game lanjut
        roomCodeDisplay.textContent = roomCode;
        turnInfo.textContent = `Giliran: ${state.players[state.current_turn].name}`;
        
        if (state.game_state !== 'question') {
            diceInfo.textContent = `Total Pemain: ${state.player_count}`;
        }

        // 1. Cek Animasi Dadu
        // Jika ada hasil dadu baru yang berbeda dari sebelumnya
        if (state.last_dice_roll && oldState.last_dice_roll !== state.last_dice_roll) {
            await animateDiceAndShowResult(state.last_dice_roll);
        }

        // 2. Render / Animasi Pion
        // Kita gunakan Promise.all agar semua pion diproses (meski biasanya cuma 1 yg gerak)
        await Promise.all(state.players.map(async (player) => {
            let pionElement = document.getElementById(`pion-${player.id}`);
            
            // Jika pion belum ada, buat baru
            if (!pionElement) {
                pionElement = document.createElement('div');
                pionElement.id = `pion-${player.id}`;
                pionElement.className = `pion pion-${player.id}`; // Class khusus per player
                pionElement.textContent = player.id + 1;
                // Set warna default jika tidak pakai gambar
                pionElement.style.backgroundColor = [player.id]; 
                pionElement.dataset.position = '1';
                board.appendChild(pionElement);
                
                // Set posisi awal
                const coords = boardCoordinates[0];
                if(coords) {
                    pionElement.style.left = `${coords.x}px`;
                    pionElement.style.top = `${coords.y}px`;
                }
            } else {
                // Jika pion sudah ada, cek apakah posisinya berubah
                const oldPos = parseInt(pionElement.dataset.position, 10);
                const newPos = player.position;
                
                if (oldPos !== newPos) {
                    // Jalankan animasi langkah demi langkah
                    await movePionStepByStep(pionElement, oldPos, newPos);
                    pionElement.dataset.position = newPos;
                }
            }
        }));

        // 3. Update Kontrol Tombol
        const isPlayable = state.game_state === 'playing' || state.game_state === 'waiting';
        
        if (myRole === 'murid') {
            // Tombol aktif jika role murid DAN game sedang playable
            rollDiceBtn.disabled = !isPlayable;
            muridControls.classList.remove('hidden');
        }
        
        if (myRole === 'guru') {
            guruControls.classList.remove('hidden');
            // Tombol guru hanya aktif saat mode pertanyaan
            btnCorrect.disabled = state.game_state !== 'question';
            btnIncorrect.disabled = state.game_state !== 'question';
        }

        // 4. Cek Game Selesai
        if (state.game_state === 'finished') {
            turnInfo.textContent = `Pemenang: ${state.players[state.winner].name}!`;
            rollDiceBtn.disabled = true;
            diceInfo.innerHTML = "Permainan Selesai! <br> Refresh untuk main lagi.";
        }

    } catch (error) {
        console.error("Error rendering game state:", error);
    } finally {
        // Lepaskan lock animasi
        isAnimating = false;
    }
}

// --- Event Listeners & Inisialisasi ---

window.onload = () => {
    generateCoordinates();

    if (!roomCode || !myRole) {
        alert("Informasi room tidak ditemukan! Silakan kembali ke lobby.");
        window.location.href = '/';
        return;
    }
    
    socket.emit('join_room', { room_code: roomCode });

    // Listener Tombol Dadu
    rollDiceBtn.addEventListener('click', () => {
        if (!rollDiceBtn.disabled) {
            // Disable segera untuk mencegah double click
            rollDiceBtn.disabled = true; 
            socket.emit('roll_dice', { room_code: roomCode });
        }
    });
    
    // Listener Tombol Guru
    btnCorrect.addEventListener('click', () => {
        if (!btnCorrect.disabled) {
            socket.emit('submit_verdict', { room_code: roomCode, is_correct: true });
        }
    });

    btnIncorrect.addEventListener('click', () => {
        if (!btnIncorrect.disabled) {
            socket.emit('submit_verdict', { room_code: roomCode, is_correct: false });
        }
    });

    // Listener Tombol Audio (Play Manual)
    if (playAudioBtn) {
        playAudioBtn.addEventListener('click', () => {
            hiddenAudio.currentTime = 0;
            hiddenAudio.play().catch(error => {
                console.error("Gagal memutar audio:", error);
                alert("Gagal memutar audio. Pastikan file ada di folder static/audio/");
            });
        });
    }

    // --- Socket Events ---

    socket.on('game_update', renderGameState);
    
    // Event untuk menandai Ular & Tangga di Papan (Visual Cues)
    socket.on('board_setup', (map) => {
        console.log("Setup Papan:", map);
        document.querySelectorAll('.special-marker').forEach(el => el.remove());

        const snakes = map.snakes;
        const ladders = map.ladders;

        // Tandai Ular (Merah)
        for (const startPos in snakes) {
            const coords = boardCoordinates[startPos - 1];
            if (coords) {
                const marker = document.createElement('div');
                marker.className = 'special-marker snake-head';
                marker.style.left = `${coords.x}px`;
                marker.style.top = `${coords.y}px`;
                board.appendChild(marker);
            }
        }
        // Tandai Tangga (Hijau)
        for (const startPos in ladders) {
            const coords = boardCoordinates[startPos - 1];
            if (coords) {
                const marker = document.createElement('div');
                marker.className = 'special-marker ladder-bottom';
                marker.style.left = `${coords.x}px`;
                marker.style.top = `${coords.y}px`;
                board.appendChild(marker);
            }
        }
    });

    // Event Saat Soal Muncul
    socket.on('show_question', (data) => {
        console.log("Menerima pertanyaan:", data);
        
        // Update state lokal manual agar logika render tidak menimpa
        if (localState.game_state) {
            localState.game_state = 'question';
        }

        // Reset Audio
        audioWrapper.classList.add('hidden');
        hiddenAudio.pause();
        hiddenAudio.currentTime = 0;

        // Cek Tipe Audio
        if (data.type === 'audio' && data.media) {
            audioWrapper.classList.remove('hidden');
            audioSource.src = `/static/audio/${data.media}`;
            hiddenAudio.load();
        }

        // Tampilan Berdasarkan Role
        if (myRole === 'guru') {
            // Tampilan Guru: Panel Info, Tombol Aktif, Tanpa Modal
            turnInfo.textContent = `Pertanyaan ${data.type === 'audio' ? '(AUDIO)' : '(TEKS)'}`;
            
            let contentHTML = `<div style="text-align: left; font-size: 14px;"><strong>Soal:</strong> ${data.question}<br>`;
            if (data.type === 'audio') {
                contentHTML += `<em>(File: ${data.media})</em><br>`;
            }
            contentHTML += `<strong>Jawaban:</strong> ${data.answer}</div>`;
            
            diceInfo.innerHTML = contentHTML;
            btnCorrect.disabled = false;
            btnIncorrect.disabled = false;

        } else { 
            // Tampilan Murid: Modal Muncul
            questionText.textContent = data.question;
            answerText.textContent = "(Jawaban ada di layar guru)";
            questionModal.classList.remove('hidden');
        }
    });

    socket.on('error', (data) => {
        alert(`Error: ${data.message}`);
        window.location.href = '/';
    });
};