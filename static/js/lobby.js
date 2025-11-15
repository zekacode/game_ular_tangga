// Inisialisasi koneksi socket ke server
const socket = io();

// Ambil elemen form
const createForm = document.getElementById('create-form');
const joinForm = document.getElementById('join-form');
const playerCountSelect = document.getElementById('player_count');
const roomCodeInput = document.getElementById('room_code');

// Event listener untuk form membuat room
createForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Mencegah form mengirim request HTTP biasa
    const playerCount = playerCountSelect.value;
    console.log('Mengirim event create_room...');
    socket.emit('create_room', { player_count: parseInt(playerCount) });
});

// Event listener untuk form bergabung ke room
joinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const roomCode = roomCodeInput.value.toUpperCase();
    if (roomCode) {
        console.log(`Mencoba bergabung ke room ${roomCode}...`);
        // Di sini kita hanya menyimpan kode room untuk digunakan di halaman selanjutnya
        sessionStorage.setItem('room_code', roomCode);
        sessionStorage.setItem('role', 'murid'); // Menandai diri sebagai murid
        window.location.href = `/game/${roomCode}`;
    }
});

// --- Mendengarkan Event dari Server ---

// Dipanggil setelah server berhasil membuat room
socket.on('room_created', (data) => {
    console.log(`Room berhasil dibuat: ${data.room_code}`);
    // Simpan kode room dan peran di session storage
    sessionStorage.setItem('room_code', data.room_code);
    sessionStorage.setItem('role', 'guru'); // Menandai diri sebagai guru
    // Pindahkan guru ke halaman permainan
    window.location.href = `/game/${data.room_code}`;
});

// Dipanggil jika ada error (misal: room tidak ditemukan)
socket.on('error', (data) => {
    console.error('Error dari server:', data.message);
    alert(`Error: ${data.message}`);
});

// Untuk debugging
socket.on('connect', () => {
    console.log('Terhubung ke server Socket.IO dengan ID:', socket.id);
});