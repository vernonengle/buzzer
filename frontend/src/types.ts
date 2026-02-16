export interface PlayerInfo {
  playerId: string;
  name: string;
}

export interface Buzz {
  playerId: string;
  name: string;
  timestamp: number;
}

export interface BuzzState {
  locked: boolean;
  buzzes: Buzz[];
}

// Server → Client messages
export type ServerMessage =
  | { action: "roomCreated"; roomCode: string; playerId: string; players: PlayerInfo[] }
  | { action: "roomJoined"; roomCode: string; playerId: string; players: PlayerInfo[]; hostPlayerId: string; buzzState: BuzzState }
  | { action: "playerJoined"; player: PlayerInfo; players: PlayerInfo[] }
  | { action: "playerLeft"; playerId: string; players: PlayerInfo[]; hostPlayerId: string }
  | { action: "buzzed"; buzzes: Buzz[]; locked: boolean }
  | { action: "buzzerReset" }
  | { action: "roomState"; roomCode: string; playerId: string; players: PlayerInfo[]; hostPlayerId: string; buzzState: BuzzState }
  | { action: "error"; message: string };

export type Screen = "lobby" | "room";

export interface AppState {
  screen: Screen;
  roomCode: string | null;
  playerId: string | null;
  playerName: string | null;
  hostPlayerId: string | null;
  players: PlayerInfo[];
  buzzState: BuzzState;
}

export type AppAction =
  | { type: "ROOM_CREATED"; roomCode: string; playerId: string; players: PlayerInfo[] }
  | { type: "ROOM_JOINED"; roomCode: string; playerId: string; players: PlayerInfo[]; hostPlayerId: string; buzzState: BuzzState }
  | { type: "PLAYER_JOINED"; player: PlayerInfo; players: PlayerInfo[] }
  | { type: "PLAYER_LEFT"; playerId: string; players: PlayerInfo[]; hostPlayerId: string }
  | { type: "BUZZED"; buzzes: Buzz[]; locked: boolean }
  | { type: "BUZZER_RESET" }
  | { type: "ROOM_STATE"; roomCode: string; playerId: string; players: PlayerInfo[]; hostPlayerId: string; buzzState: BuzzState }
  | { type: "SET_NAME"; name: string };
