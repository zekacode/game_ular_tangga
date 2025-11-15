# app.py

#  Inisialisasi Aplikasi Flask dan Manajemen State

import random
import string
from flask import Flask, jsonify, request

app = Flask(__name__)

# Ini akan bertindak sebagai 'database' sementara kita untuk menyimpan
# state dari semua room permainan yang aktif.
# Format: { 'KODE_ROOM': { 'players': [], 'turn': 0, ... } }
game_rooms = {}

# Konfigurasi papan permainan (ular dan tangga)
# Format: { 'posisi_awal': 'posisi_akhir' }
snakes = {
    16: 6,
    47: 26,
    49: 11,
    56: 53,
    62: 19,
    64: 60,
    87: 24,
    93: 73,
    95: 75,
    98: 78
}
ladders = {
    1: 38,
    4: 14,
    9: 31,
    21: 42,
    28: 84,
    36: 44,
    51: 67,
    71: 91,
    80: 100
}
WINNING_POSITION = 100

def generate_room_code(length=4):
    """Menghasilkan kode room acak yang unik."""
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))
        if code not in game_rooms:
            return code

# ============================================================================================================
# Endpoint untuk Membuat dan Bergabung ke Room

@app.route('/create_room', methods=['POST'])
def create_room():
    """Endpoint untuk guru membuat room baru."""
    # Menerima data JSON, misalnya: { "player_count": 3 }
    data = request.get_json()
    player_count = data.get('player_count', 2) # Default 2 pemain jika tidak ditentukan

    room_code = generate_room_code()
    
    # Inisialisasi state untuk room baru
    game_rooms[room_code] = {
        'player_count': player_count,
        'players': [{'id': i, 'position': 1, 'name': f'Pemain {i+1}'} for i in range(player_count)],
        'current_turn': 0, # Index pemain yang sedang giliran
        'game_state': 'waiting', # waiting -> playing -> finished
        'winner': None
    }
    
    print(f"Room {room_code} dibuat. State: {game_rooms[room_code]}")
    return jsonify({'message': 'Room berhasil dibuat', 'room_code': room_code}), 201


@app.route('/join_room', methods=['POST'])
def join_room():
    """Endpoint untuk murid (atau siapa saja) memeriksa apakah room ada."""
    data = request.get_json()
    room_code = data.get('room_code')

    if room_code in game_rooms:
        return jsonify({
            'message': 'Berhasil bergabung ke room',
            'room_code': room_code,
            'game_state': game_rooms[room_code]
        }), 200
    else:
        return jsonify({'error': 'Room tidak ditemukan'}), 404

# ============================================================================================================
# Endpoint untuk Logika Inti Permainan: Melempar Dadu

@app.route('/roll_dice', methods=['POST'])
def roll_dice():
    """Endpoint untuk menjalankan satu giliran permainan."""
    data = request.get_json()
    room_code = data.get('room_code')

    if room_code not in game_rooms:
        return jsonify({'error': 'Room tidak ditemukan'}), 404

    game = game_rooms[room_code]
    player_index = game['current_turn']
    player = game['players'][player_index]

    # 1. Lemparkan dadu
    dice_roll = random.randint(1, 6)
    
    # 2. Hitung posisi baru
    new_position = player['position'] + dice_roll

    if new_position > WINNING_POSITION:
        # Jika lemparan melebihi 100, pemain tetap di tempat (aturan umum)
        new_position = player['position']
    else:
        # 3. Cek apakah mendarat di tangga atau ular
        if new_position in ladders:
            new_position = ladders[new_position]
        elif new_position in snakes:
            new_position = snakes[new_position]

    # 4. Update posisi pemain
    player['position'] = new_position
    
    # 5. Cek kondisi kemenangan
    if new_position == WINNING_POSITION:
        game['game_state'] = 'finished'
        game['winner'] = player['id']
    else:
        # 6. Ganti giliran ke pemain selanjutnya
        game['current_turn'] = (player_index + 1) % game['player_count']

    print(f"Room {room_code} diupdate. State: {game}")
    return jsonify({
        'message': f"{player['name']} melempar dadu dan mendapat {dice_roll}",
        'dice_roll': dice_roll,
        'new_state': game
    }), 200

# ============================================================================================================
# ... (if __name__ == '__main__':) ...

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')