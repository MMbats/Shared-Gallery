import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { Readable } from "node:stream";
import { basename, extname } from "node:path";

import { createSupabaseAdmin } from "@/lib/server/supabase-admin";
import {
  createGoogleDriveClient,
  decryptRefreshToken,
} from "@/lib/server/google-drive";

type BackupJob = {
  photo_id: string;
  attempts: number;
};

type PhotoRecord = {
  id: string;
  file_path: string;
};

function authorized(request: Request) {
  const expected = process.env.GOOGLE_DRIVE_WORKER_SECRET;
  const supplied = request.headers.get("authorization") ?? "";

  if (!expected || !supplied.startsWith("Bearer ")) {
    return false;
  }

  const actual = supplied.slice(7);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

function mimeTypeFor(filePath: string) {
  const extension = extname(filePath).toLowerCase();

  const types: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".heic": "image/heic",
  };

  return types[extension] ?? "application/octet-stream";
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const supabase = createSupabaseAdmin();

    // Load the existing encrypted Google Drive connection.
    const { data: connection, error: connectionError } = await supabase
      .from("google_drive_connections")
      .select("encrypted_refresh_token, drive_folder_id")
      .eq("id", 1)
      .single();

    if (connectionError || !connection) {
      throw new Error("Google Drive connection was not found.");
    }

    const refreshToken = decryptRefreshToken(
      connection.encrypted_refresh_token
    );

    const drive = createGoogleDriveClient(refreshToken);

    // Atomically claim up to five jobs.
    const { data: claimedJobs, error: claimError } = await supabase.rpc(
      "claim_photo_drive_backups",
      { batch_size: 5 }
    );

    if (claimError) {
      throw new Error(`Could not claim backup jobs: ${claimError.message}`);
    }

    const jobs = (claimedJobs ?? []) as BackupJob[];

    if (jobs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No photos are waiting for backup.",
        processed: 0,
        results: [],
      });
    }

    const results: Array<{
      photoId: string;
      status: "backed_up" | "failed";
      message?: string;
    }> = [];

    for (const job of jobs) {
      try {
        const { data: photo, error: photoError } = await supabase
          .from("photos")
          .select("id, file_path")
          .eq("id", job.photo_id)
          .single();

        if (photoError || !photo) {
          throw new Error("The photo record could not be found.");
        }

        const photoRecord = photo as PhotoRecord;

        // Download the original from the Supabase event-photos bucket.
        const { data: imageBlob, error: downloadError } = await supabase
          .storage
          .from("event-photos")
          .download(photoRecord.file_path);

        if (downloadError || !imageBlob) {
          throw new Error(
            `Could not download the original photo: ${downloadError?.message ?? "File missing"}`
          );
        }

        // Search Drive first, so a retry does not create another copy.
        const existing = await drive.files.list({
          q: `appProperties has { key='shared_gallery_photo_id' and value='${job.photo_id}' } and trashed=false`,
          pageSize: 1,
          fields: "files(id,name,webViewLink)",
        });

        let driveFile = existing.data.files?.[0];

        if (!driveFile?.id) {
          const buffer = Buffer.from(await imageBlob.arrayBuffer());
          const originalName = basename(photoRecord.file_path);
          const safeName = `photo-${job.photo_id}${extname(originalName).toLowerCase()}`;

          const uploaded = await drive.files.create({
            requestBody: {
              name: safeName,
              parents: [connection.drive_folder_id],
              appProperties: {
                shared_gallery_photo_id: job.photo_id,
              },
            },
            media: {
              mimeType: mimeTypeFor(photoRecord.file_path),
              body: Readable.from([buffer]),
            },
            fields: "id,name,webViewLink",
          });

          driveFile = uploaded.data;
        }

        if (!driveFile.id) {
          throw new Error("Google Drive did not return a file ID.");
        }

        const driveUrl =
          driveFile.webViewLink ??
          `https://drive.google.com/file/d/${driveFile.id}/view`;

        const { error: updateError } = await supabase
          .from("photo_backups")
          .update({
            status: "backed_up",
            drive_file_id: driveFile.id,
            drive_file_url: driveUrl,
            backed_up_at: new Date().toISOString(),
            last_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq("photo_id", job.photo_id);

        if (updateError) {
          throw new Error(
            `Drive upload succeeded, but backup status could not be saved: ${updateError.message}`
          );
        }

        results.push({
          photoId: job.photo_id,
          status: "backed_up",
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown backup error";

        await supabase
          .from("photo_backups")
          .update({
            status: "failed",
            last_error: message.slice(0, 1000),
            updated_at: new Date().toISOString(),
          })
          .eq("photo_id", job.photo_id);

        results.push({
          photoId: job.photo_id,
          status: "failed",
          message,
        });
      }
    }

    const successful = results.filter(
      (result) => result.status === "backed_up"
    ).length;

    return NextResponse.json({
      success: successful === results.length,
      processed: results.length,
      backedUp: successful,
      failed: results.length - successful,
      results,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown worker error";

    console.error("Google Drive backup worker failed:", message);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
