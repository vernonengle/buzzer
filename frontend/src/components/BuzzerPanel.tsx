import { useReducer, useCallback, useEffect, useRef } from "react";
import { BuzzerScreen } from "./BuzzerScreen";
import { HostControls } from "./HostControls";
import type { ServerMessage, PlayerInfo, BuzzState, Buzz } from "../types";

interface BuzzerPanelProps {
  wsUrl: string;
  roomCode: string;
  playerId: string;
  playerName: string;
  isHost: boolean;
}

interface PanelState {
  connected: boolean;
  players: PlayerInfo[];
  buzzState: BuzzState;
  buzzerOpenedAt: number | null;
}

type PanelAction =
  | { type: "CONNECTED" }
  | { type: "DISCONNECTED" }
  | { type: "PLAYERS_UPDATED"; players: PlayerInfo[] }
  | { type: "BUZZER_OPEN" }
  | { type: "BUZZED"; buzzes: Buzz[] }
  | { type: "BUZZER_RESET" }
  | { type: "ROOM_STATE"; players: PlayerInfo[]; buzzState: BuzzState };

function reducer(state: PanelState, action: PanelAction): PanelState {
  switch (action.type) {
    case "CONNECTED":
      return { ...state, connected: true };
    case "DISCONNECTED":
      return { ...state, connected: false };
    case "PLAYERS_UPDATED":
      return { ...state, players: action.players };
    case "BUZZER_OPEN":
      return { ...state, buzzState: { open: true, buzzes: [] }, buzzerOpenedAt: Date.now() };
    case "BUZZED":
      return { ...state, buzzState: { ...state.buzzState, buzzes: action.buzzes } };
    case "BUZZER_RESET":
      return { ...state, buzzState: { open: false, buzzes: [] }, buzzerOpenedAt: null };
    case "ROOM_STATE":
      return {
        ...state,
        players: action.players,
        buzzState: action.buzzState,
        buzzerOpenedAt: action.buzzState.open ? Date.now() : null,
      };
    default:
      return state;
  }
}

export function BuzzerPanel({ wsUrl, roomCode, playerId, playerName, isHost }: BuzzerPanelProps) {
  const [state, dispatch] = useReducer(reducer, {
    connected: false,
    players: [],
    buzzState: { open: false, buzzes: [] },
    buzzerOpenedAt: null,
  });

  const wsRef = useRef<WebSocket | null>(null);

  const sendMessage = useCallback((action: string, payload: Record<string, unknown> = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action, ...payload }));
    }
  }, []);

  useEffect(() => {
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      dispatch({ type: "CONNECTED" });
      ws.send(JSON.stringify({
        action: "joinRoom",
        roomCode,
        name: playerName,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as ServerMessage;
        switch (msg.action) {
          case "roomJoined":
          case "roomState":
            dispatch({ type: "ROOM_STATE", players: msg.players, buzzState: msg.buzzState });
            break;
          case "playerJoined":
          case "playerLeft":
            dispatch({ type: "PLAYERS_UPDATED", players: msg.players });
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
        }
      } catch {
        console.error("Failed to parse message:", event.data);
      }
    };

    ws.onclose = () => {
      dispatch({ type: "DISCONNECTED" });
    };

    ws.onerror = () => ws.close();

    wsRef.current = ws;

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [wsUrl, roomCode, playerName]);

  if (!state.connected) {
    return <div className="buzzer-panel connecting">Connecting to buzzer...</div>;
  }

  return (
    <div className="buzzer-panel">
      <BuzzerScreen
        buzzState={state.buzzState}
        playerId={playerId}
        buzzerOpenedAt={state.buzzerOpenedAt}
        onBuzz={(reactionTime) => sendMessage("buzz", { reactionTime })}
      />
      {isHost && (
        <HostControls
          players={state.players}
          playerId={playerId}
          buzzerOpen={state.buzzState.open}
          hasBuzzes={state.buzzState.buzzes.length > 0}
          onOpenBuzzer={() => sendMessage("openBuzzer")}
          onReset={() => sendMessage("reset")}
        />
      )}
    </div>
  );
}
