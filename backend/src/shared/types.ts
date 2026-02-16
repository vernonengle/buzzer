export type RoomStatus = "waiting" | "active";

export interface Player {
  connectionId: string;
  playerId: string;
  name: string;
}

export interface Buzz {
  playerId: string;
  name: string;
  reactionTime: number;
}

export interface BuzzState {
  open: boolean;
  buzzes: Buzz[];
}

export interface RoomMeta {
  roomCode: string;
  hostPlayerId: string;
  status: RoomStatus;
  players: Player[];
  buzzState: BuzzState;
}
