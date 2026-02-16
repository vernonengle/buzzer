import type { Buzz } from "../types";

interface BuzzerScreenProps {
  buzzState: { locked: boolean; buzzes: Buzz[] };
  playerId: string;
  onBuzz: () => void;
}

export function BuzzerScreen({ buzzState, playerId, onBuzz }: BuzzerScreenProps) {
  const hasBuzzed = buzzState.buzzes.some((b) => b.playerId === playerId);
  const winner = buzzState.buzzes[0];
  const isWinner = winner?.playerId === playerId;

  return (
    <div className="buzzer-screen">
      {buzzState.locked && winner ? (
        <div className="buzz-result">
          <div className={`winner-banner ${isWinner ? "you-won" : ""}`}>
            {isWinner ? "You buzzed first!" : `${winner.name} buzzed first!`}
          </div>
          {buzzState.buzzes.length > 1 && (
            <ol className="buzz-order">
              {buzzState.buzzes.map((b, i) => (
                <li key={b.playerId} className={b.playerId === playerId ? "you" : ""}>
                  {i + 1}. {b.name} {b.playerId === playerId ? "(you)" : ""}
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : (
        <button
          className={`buzz-button ${hasBuzzed ? "buzzed" : ""}`}
          onClick={onBuzz}
          disabled={hasBuzzed}
        >
          {hasBuzzed ? "BUZZED!" : "BUZZ!"}
        </button>
      )}
    </div>
  );
}
