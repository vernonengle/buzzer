import type { PlayerInfo } from "../types";

interface HostControlsProps {
  players: PlayerInfo[];
  playerId: string;
  buzzerOpen: boolean;
  hasBuzzes: boolean;
  onOpenBuzzer: () => void;
  onReset: () => void;
}

export function HostControls({ players, playerId, buzzerOpen, onOpenBuzzer, onReset }: HostControlsProps) {
  return (
    <div className="host-controls">
      <div className="host-buttons">
        {!buzzerOpen ? (
          <button className="btn btn-primary" onClick={onOpenBuzzer}>
            Open Buzzer
          </button>
        ) : (
          <button
            className="btn btn-reset"
            onClick={onReset}
          >
            Reset
          </button>
        )}
      </div>
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
