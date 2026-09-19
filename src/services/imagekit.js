import ImageKit from "@imagekit/nodejs";
import fs from "fs";
import path from "path";
import { getCredentials } from "./keyring.js";
import { buildTransformQuery, applyTransformToUrl } from "../utils/formatters.js";

/**
 * Creates an ImageKit client with the given credentials.
 * @param {{ privateKey: string, publicKey?: string, urlEndpoint?: string }} creds 
 * @returns {ImageKit}
 */
export function createImageKitClient(creds) {
  if (!creds?.privateKey) {
    throw new Error("ImageKit privateKey is required.");
  }

  return new ImageKit({
    privateKey: creds.privateKey,
  });
}

/**
 * Gets an ImageKit client initialized with stored credentials.
 * @returns {ImageKit}
 */
export function getImageKitClient() {
  const creds = getCredentials();
  if (!creds.privateKey) {
    throw new Error(
      "ImageKit credentials not found. Please run 'img init' or 'img auth login' to authenticate."
    );
  }
  return createImageKitClient(creds);
}

/**
 * Tests connection with ImageKit API to verify if credentials are valid.
 * @param {{ privateKey: string, publicKey?: string, urlEndpoint?: string }} [creds] 
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
export async function testConnection(creds) {
  try {
    const client = creds ? createImageKitClient(creds) : getImageKitClient();
    await client.assets.list({ limit: 1 });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      message: err.message || "Failed to authenticate with ImageKit API.",
    };
  }
}

/**
 * Uploads a local image file to ImageKit.
 * @param {Object} params 
 * @param {string} [params.filePath]
 * @param {Buffer} [params.fileBuffer]
 * @param {string} [params.fileName]
 * @param {Array<string>|string} [params.tags]
 * @param {string} [params.folder]
 * @returns {Promise<any>}
 */
export async function uploadImage({
  filePath,
  fileBuffer,
  fileName,
  tags = [],
  folder,
}) {
  const client = getImageKitClient();

  let buffer = fileBuffer;
  let finalFileName = fileName;

  if (filePath) {
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`File does not exist: ${resolved}`);
    }
    if (!buffer) {
      buffer = fs.readFileSync(resolved);
    }
    if (!finalFileName) {
      finalFileName = path.basename(resolved);
    }
  }

  if (!buffer) {
    throw new Error("No image buffer or file path provided for upload.");
  }

  if (!finalFileName) {
    finalFileName = `upload_${Date.now()}.png`;
  }

  // Convert buffer to Web File instance for @imagekit/nodejs form serialization
  const fileObj = await ImageKit.toFile(buffer, finalFileName);
  const formattedTags = Array.isArray(tags) ? tags : [tags].filter(Boolean);

  const payload = {
    file: fileObj,
    fileName: finalFileName,
    tags: formattedTags,
    useUniqueFileName: false,
  };

  if (folder && folder !== "/" && folder.trim()) {
    const trimmed = folder.trim();
    payload.folder = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  }

  const result = await client.files.upload(payload);
  return result;
}

/**
 * Lists uploaded assets from ImageKit (sorted newest first).
 * @param {Object} [params] 
 * @param {number} [params.limit=50]
 * @param {number} [params.skip=0]
 * @param {string} [params.tags]
 * @param {string} [params.path]
 * @param {string} [params.searchQuery]
 * @param {string} [params.sort="DESC_CREATED"]
 * @returns {Promise<Array<any>>}
 */
export async function listAssets(params = {}) {
  const client = getImageKitClient();
  const query = {
    limit: params.limit || 50,
    skip: params.skip || 0,
    sort: params.sort || "DESC_CREATED",
  };

  if (params.tags) {
    query.tags = Array.isArray(params.tags) ? params.tags.join(",") : params.tags;
  }
  if (params.path) {
    query.path = params.path;
  }
  if (params.searchQuery) {
    query.searchQuery = params.searchQuery;
  }

  const results = await client.assets.list(query);
  const items = Array.isArray(results) ? results : [];

  // Guarantee newest first
  items.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  return items;
}

/**
 * Searches assets by querying ImageKit cloud search index or matching locally.
 * @param {Object} params 
 * @param {string} [params.query=""] 
 * @param {string|Array<string>} [params.tags]
 * @param {number} [params.limit=100]
 * @returns {Promise<Array<any>>}
 */
export async function searchAssets({ query = "", tags, limit = 100 } = {}) {
  const cleanQuery = typeof query === "string" ? query.trim() : "";
  const cleanTags = tags ? (Array.isArray(tags) ? tags.join(",") : tags) : null;

  // Execute server-side cloud search if query or tag is provided
  if (cleanQuery || cleanTags) {
    const sanitized = cleanQuery.replace(/["\\]/g, "");
    let luceneQuery = "";
    if (sanitized && cleanTags) {
      luceneQuery = `(name : "${sanitized}*" OR tags IN ["${sanitized}"]) AND tags IN ["${cleanTags}"]`;
    } else if (sanitized) {
      luceneQuery = `name : "${sanitized}*" OR tags IN ["${sanitized}"]`;
    }

    try {
      const cloudResults = await listAssets({
        searchQuery: luceneQuery || undefined,
        tags: cleanTags || undefined,
        limit,
      });

      if (cloudResults && cloudResults.length > 0) {
        return cloudResults;
      }
    } catch {
      // If Lucene expression fails, continue to fallback
    }
  }

  // Fallback: list assets and filter client-side
  const allFiles = await listAssets({ limit, tags: cleanTags || undefined });
  if (!cleanQuery) {
    return allFiles;
  }

  const term = cleanQuery.toLowerCase();
  return allFiles.filter((file) => {
    const inName = (file.name || "").toLowerCase().includes(term);
    const inTags = (file.tags || []).some((t) => (t || "").toLowerCase().includes(term));
    const inFilePath = (file.filePath || "").toLowerCase().includes(term);
    return inName || inTags || inFilePath;
  });
}

/**
 * Deletes an asset by file ID or exact name.
 * @param {string} identifier 
 * @returns {Promise<{ success: boolean, fileId: string, name?: string }>}
 */
export async function deleteAsset(identifier) {
  const client = getImageKitClient();
  let targetId = identifier;
  let targetName = identifier;

  // If identifier is not a standard 24-char ObjectId, search by name
  if (!/^[a-f0-9]{24}$/i.test(identifier)) {
    const files = await listAssets({ limit: 100 });
    const matched = files.find(
      (f) => f.name === identifier || f.fileId === identifier || f.filePath === identifier
    );
    if (!matched) {
      throw new Error(`No image found matching '${identifier}'`);
    }
    targetId = matched.fileId;
    targetName = matched.name;
  }

  await client.files.delete(targetId);
  return { success: true, fileId: targetId, name: targetName };
}

/**
 * Gets asset details by file ID.
 * @param {string} fileId 
 * @returns {Promise<any>}
 */
export async function getAssetDetails(fileId) {
  const client = getImageKitClient();
  return await client.files.get(fileId);
}
