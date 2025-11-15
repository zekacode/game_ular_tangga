// Inisialisasi koneksi socket
const socket = io();

// --- Konfigurasi dan Peta Koordinat Papan ---
const boardCoordinates = [];
const TOTAL_BOXES = 100;

function generateCoordinates() {
    const boardElement = document.getElementById('game-board');
    const boardSize = boardElement.clientWidth;
    const BOXES_PER_ROW = 10;
    const boxSize = boardSize / BOXES_PER_ROW;
    let startX = 0;
    let startY = boardSize - boxSize;
    let currentX = startX;
    let currentY = startY;
    let direction = 1;

    for (let i = 0; i < TOTAL_BOXES; i++) {
        const pionSize = boxSize * 0.6;
        const centeredX = currentX + (boxSize / 2) - (pionSize / 2);
        const centeredY = currentY + (boxSize / 2) - (pionSize / 2);
        boardCoordinates.push({ x: centeredX, y: centeredY });
        currentX += boxSize * direction;
        if ((i + 1) % BOXES_PER_ROW === 0) {
            currentY -= boxSize;
            direction *= -1;
            currentX += boxSize * direction;
        }
    }
    console.log("Peta Koordinat Papan berhasil dibuat.");
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

// --- State Lokal ---
let myRole = sessionStorage.getItem('role');
let roomCode = sessionStorage.getItem('room_code');

// --- Fungsi Utama untuk Merender Game ---
function renderGameState(state) {
    console.log("Menerima game update:", state);

    questionModal.classList.add('hidden');
    
    roomCodeDisplay.textContent = roomCode;
    turnInfo.textContent = `Giliran: ${state.players[state.current_turn].name}`;
    // PERBAIKAN: Bersihkan info dadu setelah pertanyaan dijawab
    diceInfo.textContent = `Total Pemain: ${state.player_count}`;
    
    state.players.forEach(player => {
        let pionElement = document.getElementById(`pion-${player.id}`);
        if (!pionElement) {
            pionElement = document.createElement('div');
            pionElement.id = `pion-${player.id}`;
            pionElement.className = 'pion';
            pionElement.textContent = player.id + 1;
            pionElement.style.backgroundColor = ['#ff4136', '#0074d9', '#2ecc40', '#ffdc00'][player.id];
            board.appendChild(pionElement);
        }
        const coords = boardCoordinates[player.position - 1];
        if (coords) {
            pionElement.style.left = `${coords.x}px`;
            pionElement.style.top = `${coords.y}px`;
        }
    });

    const isPlayable = state.game_state === 'playing' || state.game_state === 'waiting';
    
    if (myRole === 'murid') {
        rollDiceBtn.disabled = !isPlayable;
    }

    if (myRole === 'guru') {
        guruControls.classList.remove('hidden');
        btnCorrect.disabled = state.game_state !== 'question';
        btnIncorrect.disabled = state.game_state !== 'question';
    }

    if (state.game_state === 'finished') {
        turnInfo.textContent = `Pemenang: ${state.players[state.winner].name}!`;
        rollDiceBtn.disabled = true;
        diceInfo.innerHTML = "Permainan Selesai! <br> Refresh untuk main lagi.";
    }
}

// --- Event Listeners untuk Interaksi Pengguna ---
rollDiceBtn.addEventListener('click', () => {
    socket.emit('roll_dice', { room_code: roomCode });
});

btnCorrect.addEventListener('click', () => {
    socket.emit('submit_verdict', { room_code: roomCode, is_correct: true });
});

btnIncorrect.addEventListener('click', () => {
    socket.emit('submit_verdict', { room_code: roomCode, is_correct: false });
});

// --- Menghubungkan ke Server ---
window.onload = () => {
    generateCoordinates();

    if (!roomCode || !myRole) {
        alert("Informasi room tidak ditemukan!");
        window.location.href = '/';
        return;
    }
    
    socket.emit('join_room', { room_code: roomCode });

    // --- Mendengarkan Event dari Server ---
    socket.on('game_update', renderGameState);

    // ==========================================================
    // INI BAGIAN UTAMA YANG DIPERBAIKI
    // ==========================================================
    socket.on('show_question', (data) => {
        console.log("Menerima pertanyaan:", data);

        if (myRole === 'guru') {
            // Untuk GURU: jangan tampilkan modal, cukup aktifkan tombol dan ubah teks panel
            turnInfo.textContent = `Pertanyaan untuk giliran ini`;
            diceInfo.innerHTML = `<div style="text-align: left; font-size: 14px;"><strong>Soal:</strong> ${data.question}<br><strong>Jawaban:</strong> ${data.answer}</div>`;
            btnCorrect.disabled = false;
            btnIncorrect.disabled = false;

        } else { // Untuk MURID
            // Untuk MURID: tampilkan modal seperti biasa
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