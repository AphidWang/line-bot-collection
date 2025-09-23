const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // e.g. https://<accountid>.r2.cloudflarestorage.com

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_PUBLIC_URL) {
  console.warn('⚠️ R2 configuration missing. File uploads will be skipped.');
}

const s3 = (R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY)
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    })
  : null;

/**
 * Upload a Buffer to R2 and return public URL
 * @param {Buffer|Uint8Array} body
 * @param {string} key
 * @param {string} contentType
 * @returns {Promise<{ url: string, key: string }|null>}
 */
async function uploadBufferToR2(body, key, contentType) {
  if (!s3) return null;
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType || 'application/octet-stream',
    // R2 忽略 ACL，預設私有；以物件層級 Cache-Control 協助瀏覽器快取
    CacheControl: 'public, max-age=31536000, immutable',
  }));

  // 若設定了 R2_PUBLIC_URL，回傳直連；否則只回 key（之後用簽名 URL 取）
  const url = R2_PUBLIC_URL ? `${R2_PUBLIC_URL.replace(/\/$/, '')}/${encodeURIComponent(key)}` : undefined;
  return { url, key };
}

/**
 * 產生簽名 URL（預設 15 分鐘）
 */
async function createSignedGetUrl(key, expiresInSeconds = 900, responseContentDisposition) {
  if (!s3) return null;
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ResponseContentDisposition: responseContentDisposition,
  });
  const signedUrl = await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
  return signedUrl;
}

module.exports = {
  uploadBufferToR2,
  createSignedGetUrl,
};


