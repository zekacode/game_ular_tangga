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
        const pionSize = 65; // Sesuaikan dengan ukuran pion di CSS
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
    console.log("Peta Koordinat Papan berhasil dibuat.");
}

// --- Elemen DOM ---
const board = document.getElementById('game-board');
const roomCodeDisplay = document.getElementById('room-code-display');
const turnInfo = document.getElementById('turn-info');
const diceInfo = document.getElementById('dice-info');
const rollDiceBtn = document.getElementById('roll-dice-btn');
const guruControls = document.getElementById('guru-controls');
const btnCorrect = document.getElementById('btn-correct');
const btnIncorrect = document.getElementById('btn-incorrect');
const questionModal = document.getElementById('question-modal');
const questionText = document.getElementById('question-text');
const answerText = document.getElementById('answer-text');
const diceImg = document.getElementById('dice-img');

// --- State Lokal ---
let myRole = sessionStorage.getItem('role');
let roomCode = sessionStorage.getItem('room_code');
let isAnimating = false;
let localState = {}; // Menyimpan state terakhir

// --- Fungsi Helper Animasi ---

async function movePionStepByStep(pionElement, startPos, endPos) {
    pionElement.classList.add('is-moving');
    const step = startPos < endPos ? 1 : -1;

    for (let i = startPos; i !== endPos; i += step) {
        const nextSquareIndex = i + step;
        const squareData = boardCoordinates[nextSquareIndex - 1];
        if (squareData) {
            pionElement.style.left = `${squareData.x}px`;
            pionElement.style.top = `${squareData.y}px`;

            if (squareData.direction === -1) {
                pionElement.classList.add('facing-left');
            } else {
                pionElement.classList.remove('facing-left');
            }
        }
        await new Promise(resolve => setTimeout(resolve, 200)); // Kecepatan gerak per kotak
    }
    
    pionElement.classList.remove('is-moving');
}

function animateDiceAndShowResult(finalRoll) {
    return new Promise(resolve => {
        let spinCount = 0;
        const maxSpins = 10; // Berputar ~1.5 detik
        
        const animationInterval = setInterval(() => {
            const randomFace = Math.floor(Math.random() * 6) + 1;
            diceImg.src = `/static/images/dice/dice (${randomFace}).png`;
            
            spinCount++;
            if (spinCount >= maxSpins) {
                clearInterval(animationInterval);
                diceImg.src = `/static/images/dice/dice (${finalRoll}).png`; // Tampilkan hasil akhir
                setTimeout(resolve, 500); // Jeda 0.5 detik untuk melihat hasil
            }
        }, 150);
    });
}

// --- Fungsi Utama untuk Merender Game ---

async function renderGameState(state) {
    if (isAnimating) return;
    isAnimating = true;

    try {
        console.log("Menerima update:", state);
        
        const oldState = localState;
        localState = state; // Simpan state baru

        questionModal.classList.add('hidden');
        roomCodeDisplay.textContent = roomCode;
        turnInfo.textContent = `Giliran: ${state.players[state.current_turn].name}`;
        if (state.game_state !== 'question') {
            diceInfo.textContent = `Total Pemain: ${state.player_count}`;
        }

        // Cek apakah ini adalah hasil dari lemparan dadu
        if (state.last_dice_roll && oldState.last_dice_roll !== state.last_dice_roll) {
            await animateDiceAndShowResult(state.last_dice_roll);
        }

        await Promise.all(state.players.map(async (player) => {
            let pionElement = document.getElementById(`pion-${player.id}`);
            if (!pionElement) {
                pionElement = document.createElement('div');
                pionElement.id = `pion-${player.id}`;
                pionElement.className = `pion pion-${player.id}`;
                pionElement.dataset.position = '1';
                board.appendChild(pionElement);
                const coords = boardCoordinates[0];
                if(coords) {
                    pionElement.style.left = `${coords.x}px`;
                    pionElement.style.top = `${coords.y}px`;
                }
            } else {
                const oldPos = parseInt(pionElement.dataset.position, 10);
                const newPos = player.position;
                if (oldPos !== newPos) {
                    await movePionStepByStep(pionElement, oldPos, newPos);
                    pionElement.dataset.position = newPos;
                }
            }
        }));

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
            diceInfo.innerHTML = "Permainan Selesai!";
        }
    } finally {
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

    rollDiceBtn.addEventListener('click', () => {
        if (!rollDiceBtn.disabled) {
            rollDiceBtn.disabled = true;
            socket.emit('roll_dice', { room_code: roomCode });
        }
    });
    
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

    socket.on('game_update', renderGameState);
    
    socket.on('show_question', (data) => {
        console.log("Menerima pertanyaan:", data);
        
        // Memperbarui state lokal agar renderGameState tahu statusnya 'question'
        if (localState.game_state) {
            localState.game_state = 'question';
        }

        if (myRole === 'guru') {
            turnInfo.textContent = `Pertanyaan untuk giliran ini`;
            diceInfo.innerHTML = `<div style="text-align: left; font-size: 14px;"><strong>Soal:</strong> ${data.question}<br><strong>Jawaban:</strong> ${data.answer}</div>`;
            btnCorrect.disabled = false;
            btnIncorrect.disabled = false;
        } else { // Untuk Murid
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