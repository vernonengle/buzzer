import { useState } from "react";

interface LobbyProps {
  onCreateRoom: (name: string) => void;
  onJoinRoom: (roomCode: string, name: string) => void;
  connectionStatus: string;
}

export function Lobby({ onCreateRoom, onJoinRoom, connectionStatus }: LobbyProps) {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");

  const isConnected = connectionStatus === "connected";

  if (mode === "choose") {
    return (
      <div className="lobby">
        <h1>Buzzer</h1>
        <p className="subtitle">First to buzz wins!</p>
        <div className="lobby-buttons">
          <button className="btn btn-primary" onClick={() => setMode("create")}>
            Create Room
          </button>
          <button className="btn btn-secondary" onClick={() => setMode("join")}>
            Join Room
          </button>
        </div>
        {!isConnected && <p className="status">Connecting...</p>}
      </div>
    );
  }

  return (
    <div className="lobby">
      <h1>Buzzer</h1>
      <button className="btn-back" onClick={() => setMode("choose")}>Back</button>

      <div className="lobby-form">
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          autoFocus
        />

        {mode === "join" && (
          <input
            type="text"
            placeholder="Room code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={4}
          />
        )}

        <button
          className="btn btn-primary"
          disabled={!isConnected || !name.trim() || (mode === "join" && roomCode.length < 4)}
          onClick={() => {
            if (mode === "create") {
              onCreateRoom(name.trim());
            } else {
              onJoinRoom(roomCode.trim(), name.trim());
            }
          }}
        >
          {mode === "create" ? "Create Room" : "Join Room"}
        </button>
      </div>

      {!isConnected && <p className="status">Connecting...</p>}
    </div>
  );
}
