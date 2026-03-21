/**
 * WebAuthn / Passkey Integration
 * Provides registration and authentication flows using the Web Authentication API
 */

import { api } from '../services/api';

export const isWebAuthnSupported = (): boolean => {
  return !!(navigator.credentials && window.PublicKeyCredential);
};

export const isPlatformAuthenticatorAvailable = async (): Promise<boolean> => {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
};

// ─── Registration ─────────────────────────────────────────────────────────────

export const registerPasskey = async (): Promise<{ success: boolean; error?: string }> => {
  if (!isWebAuthnSupported()) {
    return { success: false, error: 'WebAuthn not supported in this browser' };
  }

  try {
    // 1. Get registration options from server
    const { data: optionsResponse } = await api.post('/auth/webauthn/register/options');
    const options = optionsResponse.data;

    // 2. Decode base64url encoded values
    const publicKeyOptions: PublicKeyCredentialCreationOptions = {
      ...options,
      challenge: base64URLToBuffer(options.challenge),
      user: {
        ...options.user,
        id: base64URLToBuffer(options.user.id),
      },
      excludeCredentials: options.excludeCredentials?.map((c: any) => ({
        ...c,
        id: base64URLToBuffer(c.id),
      })) ?? [],
    };

    // 3. Create credential
    const credential = await navigator.credentials.create({
      publicKey: publicKeyOptions,
    }) as PublicKeyCredential;

    if (!credential) return { success: false, error: 'Credential creation cancelled' };

    const response = credential.response as AuthenticatorAttestationResponse;

    // 4. Send to server for verification
    await api.post('/auth/webauthn/register/verify', {
      id: credential.id,
      rawId: bufferToBase64URL(credential.rawId),
      response: {
        clientDataJSON: bufferToBase64URL(response.clientDataJSON),
        attestationObject: bufferToBase64URL(response.attestationObject),
      },
      type: credential.type,
    });

    return { success: true };
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      return { success: false, error: 'Passkey creation was cancelled or timed out' };
    }
    return { success: false, error: err.message ?? 'Registration failed' };
  }
};

// ─── Authentication ───────────────────────────────────────────────────────────

export const authenticateWithPasskey = async (email: string): Promise<{
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
}> => {
  if (!isWebAuthnSupported()) {
    return { success: false, error: 'WebAuthn not supported in this browser' };
  }

  try {
    // 1. Get authentication options from server
    const { data: optionsResponse } = await api.post('/auth/webauthn/authenticate/options', { email });
    const options = optionsResponse.data;

    // 2. Decode
    const publicKeyOptions: PublicKeyCredentialRequestOptions = {
      ...options,
      challenge: base64URLToBuffer(options.challenge),
      allowCredentials: options.allowCredentials?.map((c: any) => ({
        ...c,
        id: base64URLToBuffer(c.id),
      })) ?? [],
    };

    // 3. Get assertion
    const credential = await navigator.credentials.get({
      publicKey: publicKeyOptions,
    }) as PublicKeyCredential;

    if (!credential) return { success: false, error: 'Authentication cancelled' };

    const response = credential.response as AuthenticatorAssertionResponse;

    // 4. Verify with server
    const { data: authResult } = await api.post('/auth/webauthn/authenticate/verify', {
      id: credential.id,
      rawId: bufferToBase64URL(credential.rawId),
      response: {
        clientDataJSON: bufferToBase64URL(response.clientDataJSON),
        authenticatorData: bufferToBase64URL(response.authenticatorData),
        signature: bufferToBase64URL(response.signature),
        userHandle: response.userHandle ? bufferToBase64URL(response.userHandle) : null,
      },
      type: credential.type,
    });

    return {
      success: true,
      accessToken: authResult.data.accessToken,
      refreshToken: authResult.data.refreshToken,
    };
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      return { success: false, error: 'Authentication was cancelled or timed out' };
    }
    return { success: false, error: err.message ?? 'Authentication failed' };
  }
};

// ─── Push Notifications ───────────────────────────────────────────────────────

export const subscribeToPushNotifications = async (): Promise<boolean> => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  try {
    const sw = await navigator.serviceWorker.ready;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!VAPID_PUBLIC_KEY) return false;

    const subscription = await sw.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as ArrayBuffer,
    });

    // Send subscription to server
    await api.post('/notifications/push/subscribe', {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: bufferToBase64URL(subscription.getKey('p256dh') as ArrayBuffer),
        auth: bufferToBase64URL(subscription.getKey('auth') as ArrayBuffer),
      },
    });

    return true;
  } catch {
    return false;
  }
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function base64URLToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
  const binary = atob(padded);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buffer;
}

function bufferToBase64URL(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
}
