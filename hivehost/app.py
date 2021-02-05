import json
import logging
import uuid
from datetime import datetime

from flask import Flask, render_template, request, session
from flask_socketio import SocketIO, emit, join_room

from brain.alphabeta import alphabeta
from hivemind.state import *
from mcts.node import MonteCarloTreeSearchNode
from mcts.search import MonteCarloTreeSearch

app = Flask(__name__)
app.secret_key = uuid.uuid4().hex
app.config['SESSION_TYPE'] = 'filesystem'
socketio = SocketIO(app)

logging.basicConfig(
    filename="app.log", filemode="w", format="%(name)s - %(levelname)s - %(message)s"
)

# TODO: standardize JSON de-/serialization
# TODO: send moveable pieces (one-hive) with state
# In future threading/async

# TODO make enum
AI = 0
SELF = 1
MULTI = 2

class Room:

    def __init__(self, name, mode=2):
        self.name = name
        self.gid = str(int(uuid.uuid1()))
        self._time = datetime.now()
        self.time = self._time.strftime("%H:%M:%S")
        self._connections = 1
        self._mode = mode

# TODO create room logic

@app.route("/")
@app.route("/index")
def index():
    return render_template("index.html")


@app.route("/play")
def play():
    session["gid"] = request.args.get("gid")
    return render_template("play.html")


@app.route("/lobby")
def lobby():
    return render_template("lobby.html", rooms=rooms)

sessions = {}
games = {}
rooms = {
    Room("a"),
    Room("b"),
    Room("c"),
    Room("d"),
    }

def emit_state(gid):
    json_state = games[gid].to_json()
    print(f"Sending state to {gid}")
    emit("sendstate", json_state, room=gid)


@socketio.on("connect")
def connect_handler():
    gid = session.get("gid")
    sessions[request.sid] = gid
    print(f"{gid} connected")
    # Only if game does not exist yet
    join_room(gid)
    games[gid] = State()
    emit_state(gid)



@socketio.on("disconnect")
def disconnect_handler():
    gid = sessions[request.sid]
    # Delete the game
    del games[gid]
    print(f"{request.sid} disconnected")


@socketio.on("ai_action")
def ai_action_handler():
    gid = sessions[request.sid]
    state = games[gid]
    games[gid] = state.next_state()

    # action = alphabeta(state, depth=2)
    # games[request.sid] = state + action
    # node = MonteCarloTreeSearchNode(state)
    # search = MonteCarloTreeSearch(node)
    # r = search.best_action(100)
    # games[request.sid] = r.state
    emit_state(gid)


@socketio.on("auto_action")
def auto_action_handler():
    gid = sessions[request.sid]
    for i in range(50):
        games[gid] = games[gid].next_state()
        emit_state(gid)
        socketio.sleep(0.02)


@socketio.on("reset")
def reset_handler():
    gid = sessions[request.sid]
    games[gid] = State()
    emit_state(gid)


@socketio.on("action")
def action_handler(data):
    gid = sessions[request.sid]
    state = games[gid]
    print(f"Action: {data}")
    action_type = data["type"]
    first = data["first"]
    destination = Hex(data["destination"]["q"], data["destination"]["r"])
    if action_type == "move":
        origin = Hex(first["q"], first["r"])
        action = Move(origin, destination)
    elif action_type == "drop":
        insect = Insect(int(first))
        action = Drop(Stone(insect, state.current_team), destination)
    games[gid] = state + action
    emit_state(gid)
    return True


@socketio.on("options")
def options_handler(data):
    gid = sessions[request.sid]
    state = games[gid]
    print(f"Options: {data}")
    action_type = data["type"]
    first = data["first"]
    if action_type == "move":
        origin = Hex(first["q"], first["r"])
        opts = []
        for action in state.possible_actions:
            if isinstance(action, Move):
                if action.origin == origin:
                    opts.append(action.destination)
        return json.dumps(
            [{"q": h.q, "r": h.r, "h": state.hive.height(h)} for h in opts]
        )

    if action_type == "drop":
        insect = Insect(int(first))
        opts = [a.destination for a in state.possible_actions if isinstance(a, Drop)]
        # Reducible
        return json.dumps([{"q": h.q, "r": h.r, "h": 0} for h in opts])
    else:
        raise Exception(f"Invalid Actiontype {action_type}")


def main():
    socketio.run(app, host="0.0.0.0", debug=True)


if __name__ == "__main__":
    main()
