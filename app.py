import random
import string
from flask import Flask, render_template, request
from flask_socketio import SocketIO, join_room, leave_room, emit

app = Flask(__name__)
app.config['SECRET_KEY'] = 'kunci_rahasia_yang_sangat_aman!' # Diperlukan oleh SocketIO
socketio = SocketIO(app)

# --- State Management & Game Logic (Sama seperti sebelumnya) ---
game_rooms = {}
snakes = {16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78}
ladders = {1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100}
WINNING_POSITION = 100

def generate_room_code(length=4):
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))
        if code not in game_rooms:
            return code

# --- HTTP Routes (Hanya untuk menayangkan halaman HTML) ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/game/<room_code>')
def game_view(room_code):
    return render_template('game_view.html', room_code=room_code)


# --- Socket.IO Event Handlers (Logika Inti Real-time) ---

@socketio.on('connect')
def handle_connect():
    """Dipanggil ketika seorang pengguna membuka koneksi."""
    print(f"Client terhubung dengan id: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    """Dipanggil ketika seorang pengguna menutup koneksi."""
    print(f"Client terputus: {request.sid}")
    # Di masa depan, kita bisa menambahkan logika untuk menghapus pemain jika dia disconnect
    
@socketio.on('create_room')
def handle_create_room(data):
    """Event handler untuk membuat room baru."""
    player_count = data.get('player_count', 2)
    room_code = generate_room_code()
    
    game_rooms[room_code] = {
        'player_count': player_count,
        'players': [{'id': i, 'position': 1, 'name': f'Pemain {i+1}'} for i in range(player_count)],
        'current_turn': 0,
        'game_state': 'waiting',
        'winner': None,
        'clients': {} # Untuk menyimpan sid guru dan murid
    }
    
    join_room(room_code)
    game_rooms[room_code]['clients']['guru'] = request.sid
    
    print(f"Room {room_code} dibuat oleh Guru {request.sid}")
    # Kirim kembali kode room hanya ke pembuatnya (guru)
    emit('room_created', {'room_code': room_code})

@socketio.on('join_room')
def handle_join_room(data):
    """Event handler untuk murid bergabung ke room."""
    room_code = data.get('room_code')
    
    if room_code in game_rooms:
        join_room(room_code)
        game_rooms[room_code]['clients']['murid'] = request.sid
        
        print(f"Murid {request.sid} bergabung ke room {room_code}")
        # Kirim status game ke semua orang di room (termasuk guru)
        emit('game_update', game_rooms[room_code], to=room_code)
    else:
        # Kirim error hanya ke klien yang mencoba bergabung
        emit('error', {'message': 'Room tidak ditemukan.'})

@socketio.on('roll_dice')
def handle_roll_dice(data):
    """Event handler untuk melempar dadu."""
    room_code = data.get('room_code')
    if room_code not in game_rooms:
        return

    game = game_rooms[room_code]
    
    # Hanya izinkan melempar dadu jika permainan sedang berjalan
    if game['game_state'] != 'playing':
        game['game_state'] = 'playing' # Otomatis mulai game saat dadu pertama dilempar

    player_index = game['current_turn']
    player = game['players'][player_index]

    dice_roll = random.randint(1, 6)
    new_position = player['position'] + dice_roll

    if new_position > WINNING_POSITION:
        new_position = player['position']
    else:
        # PENTING: Untuk sekarang, kita langsung pindah.
        # Nanti kita akan tambahkan logika soal di sini.
        if new_position in ladders:
            new_position = ladders[new_position]
        elif new_position in snakes:
            new_position = snakes[new_position]
    
    player['position'] = new_position
    
    if new_position == WINNING_POSITION:
        game['game_state'] = 'finished'
        game['winner'] = player['id']
    else:
        game['current_turn'] = (player_index + 1) % game['player_count']

    # Broadcast state game yang baru ke SEMUA client di room ini
    emit('game_update', game, to=room_code)
    
# --- Main Runner ---
if __name__ == '__main__':
    # Gunakan socketio.run() bukan app.run()
    socketio.run(app, debug=True, host='0.0.0.0', allow_unsafe_werkzeug=True)