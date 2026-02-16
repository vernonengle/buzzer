import type { BuzzState } from "../types";

interface BuzzerScreenProps {
  buzzState: BuzzState;
  playerId: string;
  buzzerOpenedAt: number | null;
  onBuzz: (reactionTime: number) => void;
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function BuzzerScreen({ buzzState, playerId, buzzerOpenedAt, onBuzz }: BuzzerScreenProps) {
  const hasBuzzed = buzzState.buzzes.some((b) => b.playerId === playerId);
  const winner = buzzState.buzzes[0];
  const isWinner = winner?.playerId === playerId;

  const handleBuzz = () => {
    if (!buzzerOpenedAt || hasBuzzed) return;
    const reactionTime = Date.now() - buzzerOpenedAt;
    onBuzz(reactionTime);
  };

  // Buzzer not open yet — waiting state
  if (!buzzState.open) {
    if (buzzState.buzzes.length > 0) {
      // Show final results after buzzer closed
      return (
        <div className="buzzer-screen">
          <div className="buzz-result">
            <div className={`winner-banner ${isWinner ? "you-won" : ""}`}>
              {isWinner ? "You were fastest!" : `${winner.name} was fastest!`}
            </div>
            <ol className="buzz-order">
              {buzzState.buzzes.map((b, i) => (
                <li key={b.playerId} className={b.playerId === playerId ? "you" : ""}>
                  {i + 1}. {b.name} — {formatTime(b.reactionTime)} {b.playerId === playerId ? "(you)" : ""}
                </li>
              ))}
            </ol>
          </div>
        </div>
      );
    }

    return (
      <div className="buzzer-screen">
        <div className="waiting-message">Waiting for host to open buzzer...</div>
      </div>
    );
  }

  // Buzzer is open — show results if any buzzes came in
  if (buzzState.buzzes.length > 0) {
    return (
      <div className="buzzer-screen">
        <div className="buzz-result">
          <div className={`winner-banner ${isWinner ? "you-won" : ""}`}>
            {isWinner ? "You were fastest!" : `${winner.name} was fastest!`}
          </div>
          <ol className="buzz-order">
            {buzzState.buzzes.map((b, i) => (
              <li key={b.playerId} className={b.playerId === playerId ? "you" : ""}>
                {i + 1}. {b.name} — {formatTime(b.reactionTime)} {b.playerId === playerId ? "(you)" : ""}
              </li>
            ))}
          </ol>
          {!hasBuzzed && (
            <button className="buzz-button small" onClick={handleBuzz}>
              BUZZ!
            </button>
          )}
        </div>
      </div>
    );
  }

  // Buzzer is open, no buzzes yet — show big buzz button
  return (
    <div className="buzzer-screen">
      <button
        className={`buzz-button ${hasBuzzed ? "buzzed" : ""}`}
        onClick={handleBuzz}
        disabled={hasBuzzed}
      >
        {hasBuzzed ? "BUZZED!" : "BUZZ!"}
      </button>
    </div>
  );
}
