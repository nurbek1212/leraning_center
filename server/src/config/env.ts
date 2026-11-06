import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 5000),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'oquv_markaz',
  },
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  // Payme Business kassasi (kalit va merchant id kabinetdan olinadi)
  payme: {
    merchantId: process.env.PAYME_MERCHANT_ID || '',
    key: process.env.PAYME_KEY || '',
    // Sandbox uchun: https://test.paycom.uz
    checkoutUrl: (process.env.PAYME_CHECKOUT_URL || 'https://checkout.paycom.uz').replace(/\/+$/, ''),
  },
  // Click Merchant kabineti
  click: {
    serviceId: process.env.CLICK_SERVICE_ID || '',
    merchantId: process.env.CLICK_MERCHANT_ID || '',
    secretKey: process.env.CLICK_SECRET_KEY || '',
  },
};

export const paymeEnabled = Boolean(env.payme.merchantId && env.payme.key);
export const clickEnabled = Boolean(env.click.serviceId && env.click.merchantId && env.click.secretKey);

if (!env.jwtSecret) {
  throw new Error(".env faylida JWT_SECRET ko'rsatilmagan (.env.example'dan nusxa oling)");
}
