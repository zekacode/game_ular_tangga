import random
import string
import json # Tambahkan ini untuk membaca file soal
from flask import Flask, render_template, request
from flask_socketio import SocketIO, join_room, leave_room, emit

app = Flask(__name__)
app.config['SECRET_KEY'] = 'kunci_rahasia_yang_sangat_aman!'
socketio = SocketIO(app)

# --- State Management & Game Logic ---
game_rooms = {}
snakes = {16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78}
ladders = {1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100}
WINNING_POSITION = 100

# Muat bank soal dari file JSON saat server dimulai
with open('soal.json', 'r', encoding='utf-8') as f:
    questions = json.load(f)

def get_random_question():
    """Mengambil satu soal acak dari daftar."""
    return random.choice(questions)

def generate_room_code(length=4):
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))
        if code not in game_rooms:
            return code

# --- HTTP Routes ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/game/<room_code>')
def game_view(room_code):
    return render_template('game_view.html', room_code=room_code)

# --- Socket.IO Event Handlers ---

@socketio.on('create_room')
def handle_create_room(data):
    player_count = data.get('player_count', 2)
    room_code = generate_room_code()
    game_rooms[room_code] = {
        'player_count': player_count,
        'players': [{'id': i, 'position': 1, 'name': f'Pemain {i+1}'} for i in range(player_count)],
        'current_turn': 0,
        'game_state': 'waiting', # waiting -> playing -> question -> finished
        'winner': None,
        'pending_move': None, # Untuk menyimpan info pergerakan saat menunggu jawaban
        'last_dice_roll': None
    }
    join_room(room_code)
    print(f"Room {room_code} dibuat.")
    emit('room_created', {'room_code': room_code})

@socketio.on('join_room')
def handle_join_room(data):
    room_code = data.get('room_code')
    if room_code in game_rooms:
        join_room(room_code)
        print(f"Client bergabung ke room {room_code}")
        emit('game_update', game_rooms[room_code], to=room_code)
    else:
        emit('error', {'message': 'Room tidak ditemukan.'})

@socketio.on('roll_dice')
def handle_roll_dice(data):
    room_code = data.get('room_code')
    if room_code not in game_rooms: return

    game = game_rooms[room_code]
    if game['game_state'] == 'question': return

    if game['game_state'] == 'waiting':
        game['game_state'] = 'playing'

    player_index = game['current_turn']
    player = game['players'][player_index]
    dice_roll = random.randint(1, 6)
    
    game['last_dice_roll'] = dice_roll

    temp_position = player['position'] + dice_roll
    if temp_position > WINNING_POSITION:
        temp_position = player['position']
    
    player['position'] = temp_position

    move_type = None
    if temp_position in ladders or temp_position in snakes:
        # Tambahkan flag SEMENTARA sebelum mengirim update
        game['move_will_be_interrupted'] = True
    
    # Kirim update awal bahwa pion sedang bergerak
    emit('game_update', game, to=room_code)

    # Hapus flag setelah dikirim agar tidak tersimpan di state
    if 'move_will_be_interrupted' in game:
        del game['move_will_be_interrupted']

    # Cek apakah perlu ada pertanyaan (logika ini tetap sama)
    final_position_if_correct = temp_position
    final_position_if_incorrect = temp_position

    if temp_position in ladders:
        move_type = 'tangga'
        final_position_if_correct = ladders[temp_position]
    elif temp_position in snakes:
        move_type = 'ular'
        final_position_if_incorrect = snakes[temp_position]

    if move_type:
        # Berhenti! Munculkan pertanyaan. (logika ini tetap sama)
        game['game_state'] = 'question'
        question_data = get_random_question()
        game['pending_move'] = {
            'player_id': player['id'],
            'correct_pos': final_position_if_correct,
            'incorrect_pos': final_position_if_incorrect
        }
        emit('show_question', {
            'question': question_data['pertanyaan'],
            'answer': question_data['jawaban'],
            'move_type': move_type
        }, to=room_code)
    else:
        # Jika tidak ada soal, langsung ganti giliran (logika ini tetap sama)
        if temp_position == WINNING_POSITION:
            game['game_state'] = 'finished'
            game['winner'] = player['id']
        else:
            game['current_turn'] = (player_index + 1) % game['player_count']
        
        socketio.sleep(1)
        emit('game_update', game, to=room_code)

@socketio.on('submit_verdict')
def handle_submit_verdict(data):
    """Event handler untuk menerima keputusan dari guru."""
    room_code = data.get('room_code')
    is_correct = data.get('is_correct')
    if room_code not in game_rooms: return

    game = game_rooms[room_code]
    pending_move = game.get('pending_move')

    if not pending_move: return

    player_id = pending_move['player_id']
    player = next((p for p in game['players'] if p['id'] == player_id), None)

    if player:
        if is_correct:
            player['position'] = pending_move['correct_pos']
        else:
            player['position'] = pending_move['incorrect_pos']

    # Reset state dan ganti giliran
    game['pending_move'] = None
    game['game_state'] = 'playing'
    
    # Cek kemenangan setelah pergerakan final
    if player['position'] == WINNING_POSITION:
        game['game_state'] = 'finished'
        game['winner'] = player['id']
    else:
        game['current_turn'] = (game['current_turn'] + 1) % game['player_count']
        
    # Kirim state game terbaru ke semua client
    emit('game_update', game, to=room_code)


if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', allow_unsafe_werkzeug=True)