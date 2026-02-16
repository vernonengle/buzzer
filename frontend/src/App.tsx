import { useReducer, useCallback } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import { Lobby } from "./components/Lobby";
import { BuzzerScreen } from "./components/BuzzerScreen";
import { HostControls } from "./components/HostControls";
import type { AppState, AppAction, ServerMessage } from "./types";

const initialState: AppState = {
  screen: "lobby",
  roomCode: null,
  playerId: null,
  playerName: null,
  hostPlayerId: null,
  players: [],
  buzzState: { open: false, buzzes: [] },
  buzzerOpenedAt: null,
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "ROOM_CREATED":
      return {
        ...state,
        screen: "room",
        roomCode: action.roomCode,
        playerId: action.playerId,
        hostPlayerId: action.playerId,
        players: action.players,
        buzzState: { open: false, buzzes: [] },
        buzzerOpenedAt: null,
      };
    case "ROOM_JOINED":
      return {
        ...state,
        screen: "room",
        roomCode: action.roomCode,
        playerId: action.playerId,
        hostPlayerId: action.hostPlayerId,
        players: action.players,
        buzzState: action.buzzState,
        buzzerOpenedAt: action.buzzState.open ? Date.now() : null,
      };
    case "PLAYER_JOINED":
      return { ...state, players: action.players };
    case "PLAYER_LEFT":
      return { ...state, players: action.players, hostPlayerId: action.hostPlayerId };
    case "BUZZER_OPEN":
      return {
        ...state,
        buzzState: { open: true, buzzes: [] },
        buzzerOpenedAt: Date.now(),
      };
    case "BUZZED":
      return { ...state, buzzState: { ...state.buzzState, buzzes: action.buzzes } };
    case "BUZZER_RESET":
      return { ...state, buzzState: { open: false, buzzes: [] }, buzzerOpenedAt: null };
    case "ROOM_STATE":
      return {
        ...state,
        screen: "room",
        roomCode: action.roomCode,
        playerId: action.playerId,
        hostPlayerId: action.hostPlayerId,
        players: action.players,
        buzzState: action.buzzState,
        buzzerOpenedAt: action.buzzState.open ? Date.now() : null,
      };
    case "SET_NAME":
      return { ...state, playerName: action.name };
    default:
      return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const onMessage = useCallback((msg: ServerMessage) => {
    switch (msg.action) {
      case "roomCreated":
        dispatch({ type: "ROOM_CREATED", roomCode: msg.roomCode, playerId: msg.playerId, players: msg.players });
        break;
      case "roomJoined":
        dispatch({ type: "ROOM_JOINED", roomCode: msg.roomCode, playerId: msg.playerId, players: msg.players, hostPlayerId: msg.hostPlayerId, buzzState: msg.buzzState });
        break;
      case "playerJoined":
        dispatch({ type: "PLAYER_JOINED", player: msg.player, players: msg.players });
        break;
      case "playerLeft":
        dispatch({ type: "PLAYER_LEFT", playerId: msg.playerId, players: msg.players, hostPlayerId: msg.hostPlayerId });
        break;
      case "buzzerOpen":
        dispatch({ type: "BUZZER_OPEN" });
        break;
      case "buzzed":
        dispatch({ type: "BUZZED", buzzes: msg.buzzes });
        break;
      case "buzzerReset":
        dispatch({ type: "BUZZER_RESET" });
        break;
      case "roomState":
        dispatch({ type: "ROOM_STATE", roomCode: msg.roomCode, playerId: msg.playerId, players: msg.players, hostPlayerId: msg.hostPlayerId, buzzState: msg.buzzState });
        break;
      case "error":
        console.error("Server error:", msg.message);
        break;
    }
  }, []);

  const onReconnect = useCallback(() => {
    if (state.roomCode && state.playerId) {
      sendMessage("rejoinRoom", { roomCode: state.roomCode, playerId: state.playerId });
    }
  }, [state.roomCode, state.playerId]);

  const { sendMessage, connectionStatus } = useWebSocket({ onMessage, onReconnect });

  const isHost = state.playerId === state.hostPlayerId;

  if (state.screen === "lobby") {
    return (
      <Lobby
        connectionStatus={connectionStatus}
        onCreateRoom={(name) => {
          dispatch({ type: "SET_NAME", name });
          sendMessage("createRoom", { name });
        }}
        onJoinRoom={(roomCode, name) => {
          dispatch({ type: "SET_NAME", name });
          sendMessage("joinRoom", { roomCode, name });
        }}
      />
    );
  }

  return (
    <div className="room">
      <div className="room-header">
        <span className="room-code">Room: {state.roomCode}</span>
        <span className="player-count">{state.players.length} player{state.players.length !== 1 ? "s" : ""}</span>
      </div>

      <BuzzerScreen
        buzzState={state.buzzState}
        playerId={state.playerId!}
        buzzerOpenedAt={state.buzzerOpenedAt}
        onBuzz={(reactionTime) => sendMessage("buzz", { reactionTime })}
      />

      {isHost && (
        <HostControls
          players={state.players}
          playerId={state.playerId!}
          buzzerOpen={state.buzzState.open}
          hasBuzzes={state.buzzState.buzzes.length > 0}
          onOpenBuzzer={() => sendMessage("openBuzzer")}
          onReset={() => sendMessage("reset")}
        />
      )}
    </div>
  );
}
