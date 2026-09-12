import crypto from 'crypto';

export interface TelegramUserData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface ValidatedInitData {
  user?: TelegramUserData;
  chat_instance?: string;
  auth_date: number;
}

export function validateTelegramInitData(
  initData: string,
  botToken = process.env.TELEGRAM_BOT_TOKEN
): ValidatedInitData | null {
  const isDemo = process.env.DEMO_MODE === 'true';

  // Allow bypass in demo mode or local browser access
  if (isDemo || !initData || initData === 'demo' || initData === 'mock') {
    return {
      user: {
        id: 1001,
        first_name: 'Alexander',
        username: 'alexandrmotologa',
      },
      auth_date: Math.floor(Date.now() / 1000),
    };
  }

  if (!botToken) {
    return null;
  }

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) {
      return null;
    }

    params.delete('hash');
    const sortedKeys = Array.from(params.keys()).sort();
    const dataCheckString = sortedKeys.map((k) => `${k}=${params.get(k)}`).join('\n');

    // WebAppData HMAC key
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (calculatedHash !== hash) {
      return null;
    }

    const userRaw = params.get('user');
    const user = userRaw ? (JSON.parse(userRaw) as TelegramUserData) : undefined;
    const authDate = parseInt(params.get('auth_date') || '0', 10);

    return {
      user,
      chat_instance: params.get('chat_instance') || undefined,
      auth_date: authDate,
    };
  } catch {
    return null;
  }
}
