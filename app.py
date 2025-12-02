# app.py (Final & Direkomendasikan)
import random
import string
import json
from flask import Flask, render_template, request
from flask_socketio import SocketIO, join_room, leave_room, emit

app = Flask(__name__)
app.config['SECRET_KEY'] = 'kunci_rahasia_yang_sangat_aman!'
socketio = SocketIO(app)

# --- State & Game Logic ---
game_rooms = {}
snakes = {16: 7, 59: 17, 63: 19, 67: 30, 87: 24, 93: 69, 95: 75, 99: 77}
ladders = {9: 27, 18: 37, 25: 54, 28: 51, 56: 64, 68: 88, 76: 97, 79: 100}
WINNING_POSITION = 100
with open('soal.json', 'r', encoding='utf-8') as f:
    questions = json.load(f)
def get_random_question(): return random.choice(questions)
def generate_room_code(length=4):
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))
        if code not in game_rooms: return code

# --- HTTP Routes ---
@app.route('/')
def index(): return render_template('index.html')
@app.route('/game/<room_code>')
def game_view(room_code): return render_template('game_view.html', room_code=room_code)

# --- Socket.IO Event Handlers ---

@socketio.on('create_room')
def handle_create_room(data):
    player_count = data.get('player_count', 2)
    room_code = generate_room_code()
    players_list = [{'id': i, 'position': 1, 'name': f'Pemain {i+1}'} for i in range(player_count)]
    game_rooms[room_code] = {
        'player_count': player_count, 'players': players_list, 'current_turn': 0, 'game_state': 'waiting', 
        'winner': None, 'pending_move': None, 'last_dice_roll': None
    }
    join_room(room_code)
    emit('room_created', {'room_code': room_code})

@socketio.on('join_room')
def handle_join_room(data):
    room_code = data.get('room_code')
    if room_code in game_rooms:
        join_room(room_code)
        emit('game_update', game_rooms[room_code], to=room_code)
    else:
        emit('error', {'message': 'Room tidak ditemukan.'})

@socketio.on('roll_dice')
def handle_roll_dice(data):
    room_code = data.get('room_code')
    if room_code not in game_rooms: return
    game = game_rooms[room_code]
    # Mencegah klik ganda saat aksi sedang diproses
    if game['game_state'] != 'playing' and game['game_state'] != 'waiting': return

    if game['game_state'] == 'waiting':
        game['game_state'] = 'playing'

    player_index = game['current_turn']
    player = game['players'][player_index]
    dice_roll = random.randint(1, 6)
    game['last_dice_roll'] = dice_roll
    
    # Hitung posisi baru
    temp_position = player['position'] + dice_roll
    if temp_position > WINNING_POSITION:
        temp_position = player['position']
    
    player['position'] = temp_position
    
    # Kirim update pertama agar frontend bisa menganimasikan dadu dan pergerakan pion
    emit('game_update', game, to=room_code)

    socketio.sleep(1.5)

    # Setelah pion berhenti, baru kita cek apakah ada soal
    move_type = None
    if temp_position in ladders or temp_position in snakes:
        move_type = 'question_incoming'

    if move_type:
        # Jika ada soal, ubah state dan kirim event 'show_question'
        game['game_state'] = 'question'
        question_data = get_random_question()
        game['pending_move'] = {
            'player_id': player['id'],
            'correct_pos': ladders.get(temp_position, temp_position),
            'incorrect_pos': snakes.get(temp_position, temp_position)
        }
        # Penting: Kirim 'game_update' lagi agar frontend tahu state berubah menjadi 'question'
        emit('game_update', game, to=room_code) 
        emit('show_question', {
            'type': question_data.get('type', 'text'), # Default ke text jika tidak ada
            'question': question_data['pertanyaan'],
            'media': question_data.get('media'),       # Bisa None jika soal teks
            'answer': question_data['jawaban'],
            'move_type': move_type
        }, to=room_code)
    else:
        # Jika tidak ada soal, ganti giliran seperti biasa
        if temp_position == WINNING_POSITION:
            game['game_state'] = 'finished'
        else:
            game['current_turn'] = (player_index + 1) % game['player_count']
        
        # Kirim update final untuk giliran ini
        emit('game_update', game, to=room_code)

@socketio.on('submit_verdict')
def handle_submit_verdict(data):
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

    game['pending_move'] = None
    game['game_state'] = 'playing'
    if player['position'] == WINNING_POSITION:
        game['game_state'] = 'finished'
    else:
        game['current_turn'] = (game['current_turn'] + 1) % game['player_count']
    emit('game_update', game, to=room_code)

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', allow_unsafe_werkzeug=True)