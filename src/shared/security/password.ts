import argon2 from 'argon2';

const HASH_OPTIONS: argon2.Options & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1
};

export async function hashPassword(rawPassword: string): Promise<string> {
  return argon2.hash(rawPassword, HASH_OPTIONS);
}

export async function verifyPassword(hash: string, rawPassword: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, rawPassword);
  } catch {
    return false;
  }
}
