"use server";

import { db } from "@/lib/db";
import { ApprovalService } from "@/lib/services/approval-service";
import { ApprovalStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function reviewApprovalAction(
  requestId: string,
  reviewedById: string,
  status: ApprovalStatus,
  reviewNote?: string
) {
  try {
    await ApprovalService.reviewRequest(requestId, reviewedById, status, reviewNote);
    revalidatePath("/approvals");
    revalidatePath("/my-requests");
    return { success: true };
  } catch (error: any) {
    console.error("REVIEW_APPROVAL_ERROR", error);
    return { success: false, error: error.message };
  }
}
