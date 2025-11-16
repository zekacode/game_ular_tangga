// Inisialisasi koneksi socket
const socket = io();

// Ambil elemen form
const createForm = document.getElementById('create-form');
const joinForm = document.getElementById('join-form');
const playerCountSelect = document.getElementById('player_count');
const roomCodeInput = document.getElementById('room_code');

// Event listener untuk form membuat room
createForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const playerCount = playerCountSelect.value;
    socket.emit('create_room', { player_count: parseInt(playerCount) });
});

// Event listener untuk form bergabung ke room
joinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const roomCode = roomCodeInput.value.toUpperCase();
    if (roomCode) {
        sessionStorage.setItem('room_code', roomCode);
        sessionStorage.setItem('role', 'murid');
        window.location.href = `/game/${roomCode}`;
    }
});

// --- Mendengarkan Event dari Server ---
socket.on('room_created', (data) => {
    console.log(`Room berhasil dibuat: ${data.room_code}`);
    sessionStorage.setItem('room_code', data.room_code);
    sessionStorage.setItem('role', 'guru');
    window.location.href = `/game/${data.room_code}`;
});

socket.on('error', (data) => {
    console.error('Error dari server:', data.message);
    alert(`Error: ${data.message}`);
});