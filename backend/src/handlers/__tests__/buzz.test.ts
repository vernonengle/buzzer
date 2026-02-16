import { handler } from "../buzz";

const mockGetItem = jest.fn();
const mockUpdateItem = jest.fn();
const mockSendToPlayer = jest.fn();
const mockBroadcast = jest.fn();

jest.mock("../../shared/dynamo.js", () => ({
  getItem: (...args: unknown[]) => mockGetItem(...args),
  updateItem: (...args: unknown[]) => mockUpdateItem(...args),
  connectionKey: (id: string) => ({ PK: `CONN#${id}`, SK: "CONN" }),
  roomKey: (code: string) => ({ PK: `ROOM#${code}`, SK: "META" }),
}));

jest.mock("../../shared/broadcast.js", () => ({
  sendToPlayer: (...args: unknown[]) => mockSendToPlayer(...args),
  broadcast: (...args: unknown[]) => mockBroadcast(...args),
}));

const makeEvent = (connectionId: string, body: Record<string, unknown> = {}) =>
  ({ requestContext: { connectionId }, body: JSON.stringify(body) }) as any;

beforeEach(() => jest.clearAllMocks());

describe("buzz", () => {
  it("records buzz with reactionTime and broadcasts sorted results", async () => {
    mockGetItem.mockResolvedValueOnce({ roomCode: "ABCD", playerId: "p1" });
    mockGetItem.mockResolvedValueOnce({
      PK: "ROOM#ABCD", SK: "META", roomCode: "ABCD", hostPlayerId: "p1",
      status: "active", players: [
        { connectionId: "conn-1", playerId: "p1", name: "Alice" },
        { connectionId: "conn-2", playerId: "p2", name: "Bob" },
      ],
      buzzState: { open: true, buzzes: [] }, ttl: 123,
    });
    // After atomic append, read back returns updated state
    mockGetItem.mockResolvedValueOnce({
      buzzState: { open: true, buzzes: [{ playerId: "p1", name: "Alice", reactionTime: 350 }] },
    });

    const result = await handler(makeEvent("conn-1", { reactionTime: 350 }), {} as any, () => {});

    expect(result).toEqual({ statusCode: 200, body: "" });
    expect(mockUpdateItem).toHaveBeenCalledWith(
      { PK: "ROOM#ABCD", SK: "META" },
      "SET buzzState.buzzes = list_append(buzzState.buzzes, :newBuzz)",
      { ":newBuzz": [{ playerId: "p1", name: "Alice", reactionTime: 350 }] },
    );
    expect(mockBroadcast).toHaveBeenCalledWith(
      ["conn-1", "conn-2"],
      { action: "buzzed", buzzes: [{ playerId: "p1", name: "Alice", reactionTime: 350 }] }
    );
  });

  it("broadcasts buzzes sorted by reactionTime", async () => {
    mockGetItem.mockResolvedValueOnce({ roomCode: "ABCD", playerId: "p2" });
    mockGetItem.mockResolvedValueOnce({
      PK: "ROOM#ABCD", SK: "META", roomCode: "ABCD", hostPlayerId: "p1",
      status: "active", players: [
        { connectionId: "conn-1", playerId: "p1", name: "Alice" },
        { connectionId: "conn-2", playerId: "p2", name: "Bob" },
      ],
      buzzState: { open: true, buzzes: [{ playerId: "p1", name: "Alice", reactionTime: 500 }] },
      ttl: 123,
    });
    // After append, p2 (faster) + p1 (slower)
    mockGetItem.mockResolvedValueOnce({
      buzzState: {
        open: true,
        buzzes: [
          { playerId: "p1", name: "Alice", reactionTime: 500 },
          { playerId: "p2", name: "Bob", reactionTime: 200 },
        ],
      },
    });

    await handler(makeEvent("conn-2", { reactionTime: 200 }), {} as any, () => {});

    const broadcastCall = mockBroadcast.mock.calls[0][1];
    expect(broadcastCall.buzzes[0].playerId).toBe("p2"); // Bob is faster
    expect(broadcastCall.buzzes[1].playerId).toBe("p1");
  });

  it("rejects buzz when buzzer is not open", async () => {
    mockGetItem.mockResolvedValueOnce({ roomCode: "ABCD", playerId: "p1" });
    mockGetItem.mockResolvedValueOnce({
      PK: "ROOM#ABCD", SK: "META", roomCode: "ABCD", hostPlayerId: "p1",
      status: "active", players: [
        { connectionId: "conn-1", playerId: "p1", name: "Alice" },
      ],
      buzzState: { open: false, buzzes: [] }, ttl: 123,
    });

    const result = await handler(makeEvent("conn-1", { reactionTime: 100 }), {} as any, () => {});

    expect(result).toEqual({ statusCode: 400, body: "" });
    expect(mockUpdateItem).not.toHaveBeenCalled();
  });

  it("rejects duplicate buzz from same player", async () => {
    mockGetItem.mockResolvedValueOnce({ roomCode: "ABCD", playerId: "p1" });
    mockGetItem.mockResolvedValueOnce({
      PK: "ROOM#ABCD", SK: "META", roomCode: "ABCD", hostPlayerId: "p1",
      status: "active", players: [
        { connectionId: "conn-1", playerId: "p1", name: "Alice" },
      ],
      buzzState: { open: true, buzzes: [{ playerId: "p1", name: "Alice", reactionTime: 300 }] },
      ttl: 123,
    });

    const result = await handler(makeEvent("conn-1", { reactionTime: 100 }), {} as any, () => {});

    expect(result).toEqual({ statusCode: 400, body: "" });
    expect(mockUpdateItem).not.toHaveBeenCalled();
  });

  it("rejects missing reactionTime", async () => {
    const result = await handler(makeEvent("conn-1", {}), {} as any, () => {});
    expect(result).toEqual({ statusCode: 400, body: "" });
  });

  it("rejects negative reactionTime", async () => {
    const result = await handler(makeEvent("conn-1", { reactionTime: -1 }), {} as any, () => {});
    expect(result).toEqual({ statusCode: 400, body: "" });
  });
});
