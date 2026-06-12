import fs from "fs";
import path from "path";

// Dynamically import Supabase to avoid compile issues if not installed/configured yet
let supabaseClient: any = null;

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseServiceKey) {
    try {
      const { createClient } = require("@supabase/supabase-js");
      supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false,
        },
      });
      return supabaseClient;
    } catch (err) {
      console.warn("Could not initialize Supabase Client, falling back to local storage:", err);
    }
  }
  return null;
}

export class StorageService {
  /**
   * Uploads a file buffer. Returns either the Supabase bucket path or local public asset path.
   */
  static async uploadFile(
    bucketName: string,
    filePath: string,
    body: Buffer,
    contentType: string
  ): Promise<string> {
    const client = getSupabaseClient();

    if (client) {
      console.log(`Uploading to Supabase bucket "${bucketName}" at path "${filePath}"`);
      const { data, error } = await client.storage
        .from(bucketName)
        .upload(filePath, body, {
          contentType,
          upsert: true,
        });

      if (error) {
        console.error("Supabase storage upload error:", error);
        throw new Error(`Failed to upload to Supabase: ${error.message}`);
      }

      // Return the relative path in the bucket (as requested: signatures/{companyId}/{assignmentId}.png)
      return filePath;
    } else {
      // Local storage fallback
      console.log(`Uploading locally to bucket "${bucketName}" at path "${filePath}"`);
      const localDir = path.join(process.cwd(), "public", "uploads", bucketName);
      const fullPath = path.join(localDir, filePath);

      // Ensure directory exists
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, body);

      // Return a relative path that we can resolve
      return filePath;
    }
  }

  /**
   * Deletes a file. Used for rollbacks.
   */
  static async deleteFile(bucketName: string, filePath: string): Promise<void> {
    const client = getSupabaseClient();

    if (client) {
      const { error } = await client.storage.from(bucketName).remove([filePath]);
      if (error) {
        console.error(`Failed to delete from Supabase: ${filePath}`, error);
      }
    } else {
      const localDir = path.join(process.cwd(), "public", "uploads", bucketName);
      const fullPath = path.join(localDir, filePath);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch (err) {
          console.error(`Failed to delete local file: ${fullPath}`, err);
        }
      }
    }
  }

  /**
   * Generates a signed URL or fallback local URL to download files from private buckets.
   */
  static async getSignedUrl(
    bucketName: string,
    filePath: string,
    expiresInSeconds = 3600
  ): Promise<string> {
    const client = getSupabaseClient();

    if (client) {
      const { data, error } = await client.storage
        .from(bucketName)
        .createSignedUrl(filePath, expiresInSeconds);

      if (error) {
        throw new Error(`Failed to get signed URL: ${error.message}`);
      }
      return data.signedUrl;
    } else {
      // Return a local helper route URL
      return `/api/admin/local-storage?bucket=${bucketName}&path=${encodeURIComponent(filePath)}`;
    }
  }
}
