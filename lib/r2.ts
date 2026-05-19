import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let r2Client: S3Client | null = null;

const r2AccountId = process.env.R2_ACCOUNT_ID;
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const r2BucketName = process.env.R2_BUCKET_NAME;
const r2Endpoint = process.env.R2_ENDPOINT || (r2AccountId ? `https://${r2AccountId}.r2.cloudflarestorage.com` : undefined);

export function isR2Configured() {
  return Boolean(r2Endpoint && r2AccessKeyId && r2SecretAccessKey && r2BucketName && r2SecretAccessKey !== "PASTE_SECRET_HERE");
}

export function getR2BucketName() {
  if (!r2BucketName) {
    throw new Error("R2_BUCKET_NAME is missing.");
  }

  return r2BucketName;
}

export function sanitizeR2Key(key: string) {
  const cleanKey = key.replace(/^\/+/, "");

  if (!cleanKey || cleanKey.includes("..") || cleanKey.includes("\\") || cleanKey.length > 1024) {
    throw new Error("Invalid R2 object key.");
  }

  return cleanKey;
}

export async function createR2UploadUrl(key: string, contentType: string) {
  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: getR2BucketName(),
    Key: sanitizeR2Key(key),
    ContentType: contentType || "application/octet-stream"
  });

  return getSignedUrl(client, command, { expiresIn: 60 * 30 });
}

export async function createR2ReadUrl(key: string) {
  const client = getR2Client();
  const command = new GetObjectCommand({
    Bucket: getR2BucketName(),
    Key: sanitizeR2Key(key)
  });

  return getSignedUrl(client, command, { expiresIn: 60 * 60 * 6 });
}

export async function deleteR2Object(key: string) {
  const client = getR2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: getR2BucketName(),
      Key: sanitizeR2Key(key)
    })
  );
}

function getR2Client() {
  if (!isR2Configured() || !r2Endpoint || !r2AccessKeyId || !r2SecretAccessKey) {
    throw new Error("R2 is not configured.");
  }

  if (r2Client) {
    return r2Client;
  }

  r2Client = new S3Client({
    region: "auto",
    endpoint: r2Endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey
    }
  });

  return r2Client;
}
