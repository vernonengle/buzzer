import type { PlayerInfo } from "../types";

interface HostControlsProps {
  players: PlayerInfo[];
  playerId: string;
  onReset: () => void;
  buzzLocked: boolean;
}

export function HostControls({ players, playerId, onReset, buzzLocked }: HostControlsProps) {
  return (
    <div className="host-controls">
      <button
        className="btn btn-reset"
        onClick={onReset}
        disabled={!buzzLocked}
      >
        Reset Buzzer
      </button>
      <div className="player-list">
        <h3>Players ({players.length})</h3>
        <ul>
          {players.map((p) => (
            <li key={p.playerId}>
              {p.name} {p.playerId === playerId ? "(you, host)" : ""}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
