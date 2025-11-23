# 🐍 Arabic Learning Snakes & Ladders

![Python](https://img.shields.io/badge/Python-3.8%2B-blue) ![Flask](https://img.shields.io/badge/Flask-2.0%2B-green) ![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--time-orange)

A real-time, multiplayer web-based board game designed to make learning Arabic vocabulary fun and interactive. This project combines the classic mechanics of **Snakes and Ladders** with educational quizzes, featuring a unique **Teacher-Student dual interface**.

![Game Screenshot](https://via.placeholder.com/800x400?text=Add+Your+Game+Screenshot+Here)
*(Note: Replace the link above with a screenshot of your actual game)*

## 🌟 Key Features

*   **Real-Time Multiplayer:** Powered by **Socket.IO**, allowing seamless interaction between multiple devices without page refreshes.
*   **Dual-Role System:**
    *   **Student Mode:** Displays the board, pawns, dice, and questions.
    *   **Teacher Mode:** A dedicated control panel to view answers and validate student responses (Correct/Incorrect).
*   **Educational Twist:**
    *   Landing on a **Ladder**: Answer a question correctly to climb up; otherwise, stay put.
    *   Landing on a **Snake**: Answer correctly to stay safe; answer incorrectly and slide down.
*   **Interactive Animations:** Smooth pawn movements (step-by-step), sprite animations, and 3D-style dice rolling.
*   **Customizable Question Bank:** Questions are stored in a simple JSON file (`soal.json`), making it easy to update the curriculum.

## 🛠️ Tech Stack

*   **Backend:** Python, Flask, Flask-SocketIO, Eventlet.
*   **Frontend:** HTML5, CSS3 (Animations & Sprites), JavaScript (ES6+).
*   **Communication:** WebSocket (Socket.IO).
*   **Deployment:** Compatible with Render, Replit, or Heroku.

## 📂 Project Structure

```
├── static/
│   ├── css/           # Stylesheets
│   ├── js/            # Frontend logic (Socket.IO client)
│   └── images/        # Game assets (Board, Pawns, Dice)
├── templates/
│   ├── index.html     # Lobby page
│   └── game_view.html # Main game board page
├── app.py             # Main Flask application & Socket.IO events
├── soal.json          # Database of Arabic questions
└── requirements.txt   # Python dependencies
```

## 🚀 How to Run Locally

Follow these steps to run the game on your local machine:

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-username/your-repo-name.git
    cd your-repo-name
    ```

2.  **Create a Virtual Environment**
    ```bash
    # Windows
    python -m venv venv
    .\venv\Scripts\activate

    # macOS/Linux
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **Install Dependencies**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Run the Application**
    ```bash
    python app.py
    ```

5.  **Play!**
    Open your browser and go to `http://127.0.0.1:5000`.

## 🎮 How to Play

1.  **Create a Room (Teacher):**
    *   Open the app and select the number of players.
    *   Click "Create Room".
    *   Share the generated **Room Code** with your students.

2.  **Join a Room (Students):**
    *   Open the app on a separate device (or tab).
    *   Enter the **Room Code** provided by the teacher.
    *   Click "Join".

3.  **Gameplay:**
    *   Students take turns rolling the dice.
    *   If a student lands on a Snake or Ladder, a question pops up.
    *   **Teacher's Role:** The teacher sees the correct answer on their screen and must click **"CORRECT"** or **"WRONG"** based on the student's verbal answer.
    *   The first player to reach square 100 wins!

## ☁️ Deployment

This project is ready to be deployed on platforms like **Replit** or **Render**.

**For Replit:**
1.  Import this repository.
2.  In `.replit` file (or run command), use: `gunicorn app:socketio --worker-class eventlet -w 1 --bind 0.0.0.0:8080`.

## 📝 License

This project is open-source and available under the [MIT License](LICENSE).

---

**Created with ❤️ for Arabic Education.**