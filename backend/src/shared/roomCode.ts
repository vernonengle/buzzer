const VALID_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += VALID_CHARS[Math.floor(Math.random() * VALID_CHARS.length)];
  }
  return code;
}
