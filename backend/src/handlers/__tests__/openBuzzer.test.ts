import { handler } from "../openBuzzer";

const mockGetItem = jest.fn();
const mockPutItem = jest.fn();
const mockSendToPlayer = jest.fn();
const mockBroadcast = jest.fn();

jest.mock("../../shared/dynamo.js", () => ({
  getItem: (...args: unknown[]) => mockGetItem(...args),
  putItem: (...args: unknown[]) => mockPutItem(...args),
  connectionKey: (id: string) => ({ PK: `CONN#${id}`, SK: "CONN" }),
  roomKey: (code: string) => ({ PK: `ROOM#${code}`, SK: "META" }),
}));

jest.mock("../../shared/broadcast.js", () => ({
  sendToPlayer: (...args: unknown[]) => mockSendToPlayer(...args),
  broadcast: (...args: unknown[]) => mockBroadcast(...args),
}));

const makeEvent = (connectionId: string) =>
  ({ requestContext: { connectionId }, body: "{}" }) as any;

beforeEach(() => jest.clearAllMocks());

describe("openBuzzer", () => {
  it("opens buzzer and broadcasts to all", async () => {
    mockGetItem.mockResolvedValueOnce({ roomCode: "ABCD", playerId: "p1" });
    mockGetItem.mockResolvedValueOnce({
      PK: "ROOM#ABCD", SK: "META", roomCode: "ABCD", hostPlayerId: "p1",
      status: "active", players: [
        { connectionId: "conn-1", playerId: "p1", name: "Alice" },
        { connectionId: "conn-2", playerId: "p2", name: "Bob" },
      ],
      buzzState: { open: false, buzzes: [] }, ttl: 123,
    });

    const result = await handler(makeEvent("conn-1"), {} as any, () => {});

    expect(result).toEqual({ statusCode: 200, body: "" });
    const savedRoom = mockPutItem.mock.calls[0][0];
    expect(savedRoom.buzzState).toEqual({ open: true, buzzes: [] });
    expect(mockBroadcast).toHaveBeenCalledWith(
      ["conn-1", "conn-2"],
      { action: "buzzerOpen" }
    );
  });

  it("clears previous buzzes when opening", async () => {
    mockGetItem.mockResolvedValueOnce({ roomCode: "ABCD", playerId: "p1" });
    mockGetItem.mockResolvedValueOnce({
      PK: "ROOM#ABCD", SK: "META", roomCode: "ABCD", hostPlayerId: "p1",
      status: "active", players: [
        { connectionId: "conn-1", playerId: "p1", name: "Alice" },
      ],
      buzzState: { open: false, buzzes: [{ playerId: "p2", name: "Bob", reactionTime: 500 }] },
      ttl: 123,
    });

    await handler(makeEvent("conn-1"), {} as any, () => {});

    const savedRoom = mockPutItem.mock.calls[0][0];
    expect(savedRoom.buzzState.buzzes).toEqual([]);
  });

  it("rejects non-host", async () => {
    mockGetItem.mockResolvedValueOnce({ roomCode: "ABCD", playerId: "p2" });
    mockGetItem.mockResolvedValueOnce({
      PK: "ROOM#ABCD", SK: "META", roomCode: "ABCD", hostPlayerId: "p1",
      status: "active", players: [
        { connectionId: "conn-1", playerId: "p1", name: "Alice" },
        { connectionId: "conn-2", playerId: "p2", name: "Bob" },
      ],
      buzzState: { open: false, buzzes: [] }, ttl: 123,
    });

    const result = await handler(makeEvent("conn-2"), {} as any, () => {});

    expect(result).toEqual({ statusCode: 403, body: "" });
    expect(mockPutItem).not.toHaveBeenCalled();
  });
});
