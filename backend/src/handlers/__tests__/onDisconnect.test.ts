import { handler } from "../onDisconnect";

const mockGetItem = jest.fn();
const mockPutItem = jest.fn();
const mockDeleteItem = jest.fn();
const mockBroadcast = jest.fn();

jest.mock("../../shared/dynamo.js", () => ({
  getItem: (...args: unknown[]) => mockGetItem(...args),
  putItem: (...args: unknown[]) => mockPutItem(...args),
  deleteItem: (...args: unknown[]) => mockDeleteItem(...args),
  connectionKey: (id: string) => ({ PK: `CONN#${id}`, SK: "CONN" }),
  roomKey: (code: string) => ({ PK: `ROOM#${code}`, SK: "META" }),
  playerKey: (code: string, pid: string) => ({ PK: `ROOM#${code}`, SK: `PLAYER#${pid}` }),
}));

jest.mock("../../shared/broadcast.js", () => ({
  broadcast: (...args: unknown[]) => mockBroadcast(...args),
}));

const makeEvent = (connectionId: string) =>
  ({ requestContext: { connectionId } }) as any;

beforeEach(() => jest.clearAllMocks());

describe("onDisconnect", () => {
  it("returns 200 if no connection record", async () => {
    mockGetItem.mockResolvedValueOnce(undefined);
    const result = await handler(makeEvent("conn-1"), {} as any, () => {});
    expect(result).toEqual({ statusCode: 200, body: "" });
  });

  it("deletes connection and removes player from room", async () => {
    mockGetItem.mockResolvedValueOnce({
      PK: "CONN#conn-1", SK: "CONN", roomCode: "ABCD", playerId: "p1",
    });
    mockGetItem.mockResolvedValueOnce({
      PK: "ROOM#ABCD", SK: "META", roomCode: "ABCD", hostPlayerId: "p1",
      status: "active", players: [
        { connectionId: "conn-1", playerId: "p1", name: "Alice" },
        { connectionId: "conn-2", playerId: "p2", name: "Bob" },
      ],
      buzzState: { locked: false, buzzes: [] }, ttl: 123,
    });

    await handler(makeEvent("conn-1"), {} as any, () => {});

    expect(mockDeleteItem).toHaveBeenCalledWith({ PK: "CONN#conn-1", SK: "CONN" });
    expect(mockPutItem).toHaveBeenCalled();
    const savedRoom = mockPutItem.mock.calls[0][0];
    expect(savedRoom.players).toHaveLength(1);
    expect(savedRoom.hostPlayerId).toBe("p2");
    expect(mockBroadcast).toHaveBeenCalledWith(
      ["conn-2"],
      expect.objectContaining({ action: "playerLeft" })
    );
  });

  it("deletes room when last player disconnects", async () => {
    mockGetItem.mockResolvedValueOnce({
      PK: "CONN#conn-1", SK: "CONN", roomCode: "ABCD", playerId: "p1",
    });
    mockGetItem.mockResolvedValueOnce({
      PK: "ROOM#ABCD", SK: "META", roomCode: "ABCD", hostPlayerId: "p1",
      status: "active", players: [
        { connectionId: "conn-1", playerId: "p1", name: "Alice" },
      ],
      buzzState: { locked: false, buzzes: [] }, ttl: 123,
    });

    await handler(makeEvent("conn-1"), {} as any, () => {});

    expect(mockDeleteItem).toHaveBeenCalledWith({ PK: "ROOM#ABCD", SK: "META" });
    expect(mockBroadcast).not.toHaveBeenCalled();
  });
});
