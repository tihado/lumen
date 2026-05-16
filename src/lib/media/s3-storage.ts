import "server-only";

import { createHash, createHmac } from "node:crypto";
import type { AppEnv } from "@/lib/env";

type UploadInput = {
  bytes: ArrayBuffer;
  contentType: string;
  key: string;
  env: AppEnv;
};

type RemoteAsset = {
  url: string;
  mime: string;
  width?: number;
  height?: number;
};

type StoredAsset = RemoteAsset & {
  storageKey?: string;
};

function sha256Hex(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key: string | Buffer, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

function hmacHex(key: string | Buffer, value: string) {
  return createHmac("sha256", key).update(value).digest("hex");
}

function amzDates(now = new Date()) {
  const iso = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return {
    amzDate: iso,
    dateStamp: iso.slice(0, 8),
  };
}

function cleanKeyPart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function extensionFromMime(mime: string) {
  if (mime.includes("jpeg")) {
    return "jpg";
  }
  if (mime.includes("png")) {
    return "png";
  }
  if (mime.includes("webp")) {
    return "webp";
  }
  if (mime.includes("mp4")) {
    return "mp4";
  }
  if (mime.includes("mpeg")) {
    return "mp3";
  }
  if (mime.includes("wav")) {
    return "wav";
  }
  return "bin";
}

function normalizePrefix(prefix: string | undefined) {
  return (prefix ?? "lesson-media")
    .split("/")
    .map(cleanKeyPart)
    .filter(Boolean)
    .join("/");
}

function canonicalUriForKey(key: string) {
  return `/${key.split("/").map(encodeURIComponent).join("/")}`;
}

function forcePathStyle(env: AppEnv) {
  return env.S3_FORCE_PATH_STYLE === "1" || env.S3_FORCE_PATH_STYLE === "true";
}

function endpointFor(env: AppEnv) {
  const bucket = env.S3_BUCKET;
  const region = env.AWS_REGION ?? "us-east-1";
  if (!bucket) {
    throw new Error("S3_BUCKET missing");
  }

  if (env.S3_ENDPOINT_URL) {
    const base = new URL(env.S3_ENDPOINT_URL);
    if (forcePathStyle(env)) {
      return {
        base,
        urlForKey: (key: string) =>
          new URL(`/${bucket}${canonicalUriForKey(key)}`, base),
        publicUrlForKey: (key: string) =>
          env.S3_PUBLIC_BASE_URL
            ? `${env.S3_PUBLIC_BASE_URL.replace(/\/+$/, "")}/${key}`
            : new URL(`/${bucket}${canonicalUriForKey(key)}`, base).toString(),
      };
    }
    return {
      base,
      urlForKey: (key: string) => {
        const url = new URL(canonicalUriForKey(key), base);
        url.hostname = `${bucket}.${url.hostname}`;
        return url;
      },
      publicUrlForKey: (key: string) =>
        env.S3_PUBLIC_BASE_URL
          ? `${env.S3_PUBLIC_BASE_URL.replace(/\/+$/, "")}/${key}`
          : (() => {
              const url = new URL(canonicalUriForKey(key), base);
              url.hostname = `${bucket}.${url.hostname}`;
              return url.toString();
            })(),
    };
  }

  const base = new URL(`https://${bucket}.s3.${region}.amazonaws.com`);
  return {
    base,
    urlForKey: (key: string) => new URL(canonicalUriForKey(key), base),
    publicUrlForKey: (key: string) =>
      env.S3_PUBLIC_BASE_URL
        ? `${env.S3_PUBLIC_BASE_URL.replace(/\/+$/, "")}/${key}`
        : new URL(canonicalUriForKey(key), base).toString(),
  };
}

export function isS3StorageConfigured(env: AppEnv) {
  return Boolean(
    env.S3_BUCKET &&
      env.AWS_ACCESS_KEY_ID &&
      env.AWS_SECRET_ACCESS_KEY &&
      (env.AWS_REGION || env.S3_ENDPOINT_URL)
  );
}

export function mediaStorageKey(input: {
  lessonId: string;
  nodeId: string;
  mime: string;
  prefix?: string;
}) {
  const ext = extensionFromMime(input.mime);
  return [
    normalizePrefix(input.prefix),
    cleanKeyPart(input.lessonId),
    `${cleanKeyPart(input.nodeId)}-${Date.now()}.${ext}`,
  ]
    .filter(Boolean)
    .join("/");
}

export async function uploadToS3(input: UploadInput) {
  const {
    AWS_ACCESS_KEY_ID: accessKeyId,
    AWS_SECRET_ACCESS_KEY: secretAccessKey,
    AWS_SESSION_TOKEN: sessionToken,
  } = input.env;
  const region = input.env.AWS_REGION ?? "us-east-1";
  if (!(accessKeyId && secretAccessKey)) {
    throw new Error("AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are required");
  }

  const body = Buffer.from(input.bytes);
  const payloadHash = sha256Hex(body);
  const { amzDate, dateStamp } = amzDates();
  const endpoint = endpointFor(input.env);
  const putUrl = endpoint.urlForKey(input.key);
  const host = putUrl.host;
  const tokenHeader = sessionToken
    ? `x-amz-security-token:${sessionToken}\n`
    : "";
  const signedHeaders = sessionToken
    ? "content-type;host;x-amz-content-sha256;x-amz-date;x-amz-security-token"
    : "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalHeaders =
    `content-type:${input.contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n` +
    tokenHeader;
  const canonicalRequest = [
    "PUT",
    putUrl.pathname,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const dateRegionKey = hmac(dateKey, region);
  const dateRegionServiceKey = hmac(dateRegionKey, "s3");
  const signingKey = hmac(dateRegionServiceKey, "aws4_request");
  const signature = hmacHex(signingKey, stringToSign);

  const res = await fetch(putUrl, {
    method: "PUT",
    headers: {
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      "Content-Type": input.contentType,
      "X-Amz-Content-Sha256": payloadHash,
      "X-Amz-Date": amzDate,
      ...(sessionToken ? { "X-Amz-Security-Token": sessionToken } : {}),
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`S3 upload HTTP ${res.status}: ${text.slice(0, 240)}`);
  }

  return {
    url: endpoint.publicUrlForKey(input.key),
    key: input.key,
  };
}

export async function mirrorRemoteAssetToS3(input: {
  asset: RemoteAsset;
  lessonId: string;
  nodeId: string;
  env: AppEnv;
}): Promise<StoredAsset> {
  if (!isS3StorageConfigured(input.env)) {
    return input.asset;
  }

  const res = await fetch(input.asset.url);
  if (!res.ok) {
    throw new Error(`Media download HTTP ${res.status}`);
  }
  const contentType = res.headers.get("content-type") ?? input.asset.mime;
  const key = mediaStorageKey({
    lessonId: input.lessonId,
    nodeId: input.nodeId,
    mime: contentType,
    prefix: input.env.S3_PREFIX,
  });
  const stored = await uploadToS3({
    bytes: await res.arrayBuffer(),
    contentType,
    key,
    env: input.env,
  });
  return {
    ...input.asset,
    url: stored.url,
    mime: contentType,
    storageKey: stored.key,
  };
}

export async function uploadGeneratedBytesToS3(input: {
  bytes: ArrayBuffer;
  contentType: string;
  lessonId: string;
  nodeId: string;
  env: AppEnv;
}): Promise<{ url: string; key?: string } | null> {
  if (!isS3StorageConfigured(input.env)) {
    return null;
  }
  const key = mediaStorageKey({
    lessonId: input.lessonId,
    nodeId: input.nodeId,
    mime: input.contentType,
    prefix: input.env.S3_PREFIX,
  });
  return uploadToS3({
    bytes: input.bytes,
    contentType: input.contentType,
    key,
    env: input.env,
  });
}
