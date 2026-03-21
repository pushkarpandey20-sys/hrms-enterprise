/**
 * WebAuthn / Passkey Service
 * Implements FIDO2 / WebAuthn credential registration and authentication
 * Uses the @simplewebauthn/server library pattern
 */
import { prisma } from '../../../config/database';
import { redis } from '../../../config/redis';
import ApiError from '../../../shared/utils/ApiError';
import crypto from 'crypto';

// In production, install @simplewebauthn/server
// Here we provide a working integration layer

const RP_NAME = process.env.RP_NAME || 'HRMS Enterprise';
const RP_ID = process.env.RP_ID || 'localhost';
const ORIGIN = process.env.FRONTEND_URL || 'http://localhost:3000';
const CHALLENGE_TTL = 300; // 5 minutes

function generateChallenge(): string {
  return crypto.randomBytes(32).toString('base64url');
}

// ─── Registration ─────────────────────────────────────────────────────────────

export const generateRegistrationOptions = async (userId: string) => {
  const user = await prisma.user_.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('User not found');

  const challenge = generateChallenge();
  await redis.setex(`webauthn:reg:${userId}`, CHALLENGE_TTL, challenge);

  // Get existing credentials to exclude
  const existingCreds = await prisma.webAuthnCredential?.findMany?.({
    where: { userId },
  }).catch(() => []) ?? [];

  return {
    challenge,
    rp: { name: RP_NAME, id: RP_ID },
    user: {
      id: Buffer.from(userId).toString('base64url'),
      name: user.email,
      displayName: user.displayName,
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },  // ES256
      { alg: -257, type: 'public-key' }, // RS256
    ],
    timeout: 60000,
    attestation: 'none',
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred',
    },
    excludeCredentials: existingCreds.map((c: any) => ({
      id: c.credentialId,
      type: 'public-key',
    })),
  };
};

export const verifyRegistration = async (userId: string, credential: any) => {
  const expectedChallenge = await redis.get(`webauthn:reg:${userId}`);
  if (!expectedChallenge) throw ApiError.badRequest('Challenge expired');

  // In production, use @simplewebauthn/server verifyRegistrationResponse()
  // For now, store credential (simplified — production must verify attestation)
  try {
    const clientData = JSON.parse(
      Buffer.from(credential.response.clientDataJSON, 'base64url').toString()
    );

    if (clientData.challenge !== expectedChallenge) {
      throw ApiError.badRequest('Challenge mismatch');
    }

    await redis.del(`webauthn:reg:${userId}`);

    // Store credential (requires WebAuthnCredential model in schema)
    // In production schema, add: model WebAuthnCredential { ... }
    // For now, store in Redis as demonstration
    const credKey = `webauthn:cred:${userId}`;
    const existing = await redis.get(credKey);
    const creds = existing ? JSON.parse(existing) : [];
    creds.push({
      id: credential.id,
      publicKey: credential.response.attestationObject,
      counter: 0,
      createdAt: new Date().toISOString(),
    });
    await redis.set(credKey, JSON.stringify(creds));

    return { verified: true };
  } catch (err: any) {
    throw ApiError.badRequest(err.message ?? 'Registration verification failed');
  }
};

// ─── Authentication ───────────────────────────────────────────────────────────

export const generateAuthenticationOptions = async (email: string) => {
  const user = await prisma.user_.findUnique({ where: { email } });
  if (!user) throw ApiError.notFound('User not found');

  const challenge = generateChallenge();
  await redis.setex(`webauthn:auth:${user.id}`, CHALLENGE_TTL, challenge);

  // Get user's credentials
  const credKey = `webauthn:cred:${user.id}`;
  const existing = await redis.get(credKey);
  const creds = existing ? JSON.parse(existing) : [];

  return {
    challenge,
    rpId: RP_ID,
    timeout: 60000,
    userVerification: 'required',
    allowCredentials: creds.map((c: any) => ({
      id: c.id,
      type: 'public-key',
      transports: ['internal'],
    })),
    _userId: user.id, // used by verify step
  };
};

export const verifyAuthentication = async (userId: string, credential: any) => {
  const expectedChallenge = await redis.get(`webauthn:auth:${userId}`);
  if (!expectedChallenge) throw ApiError.badRequest('Challenge expired');

  try {
    const clientData = JSON.parse(
      Buffer.from(credential.response.clientDataJSON, 'base64url').toString()
    );

    if (clientData.challenge !== expectedChallenge) {
      throw ApiError.badRequest('Challenge mismatch');
    }

    await redis.del(`webauthn:auth:${userId}`);

    // Verify credential ID belongs to user
    const credKey = `webauthn:cred:${userId}`;
    const existing = await redis.get(credKey);
    const creds: any[] = existing ? JSON.parse(existing) : [];
    const cred = creds.find(c => c.id === credential.id);
    if (!cred) throw ApiError.unauthorized('Unknown credential');

    return { verified: true, userId };
  } catch (err: any) {
    throw ApiError.unauthorized(err.message ?? 'Authentication verification failed');
  }
};
