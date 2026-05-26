/**
 * Utility for generating Asset Codes and Asset Tags.
 */

export interface AssetCodeGenContext {
  companyCode?: string | null;
  companyName: string;
  purchasedFromCode?: string | null;
  purchasedFromName?: string | null;
  categoryCode?: string | null;
  categoryName: string;
  sequence: number;
}

function sanitize(text: string | null | undefined, length: number = 3): string {
  if (!text) return "UNK";
  // Remove special characters and uppercase
  const sanitized = text
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
  return sanitized.substring(0, length);
}

function formatSequence(seq: number): string {
  return seq.toString().padStart(3, "0");
}

export function generateAssetCode(ctx: AssetCodeGenContext): string {
  const owner = ctx.companyCode || sanitize(ctx.companyName);
  const purchasedFrom = ctx.purchasedFromCode || sanitize(ctx.purchasedFromName);
  const category = ctx.categoryCode || sanitize(ctx.categoryName, 2);
  const sequence = formatSequence(ctx.sequence);

  return `${owner}-${purchasedFrom}-${category}-${sequence}`;
}

export function generateAssetTag(ctx: AssetCodeGenContext): string {
  const owner = ctx.companyCode || sanitize(ctx.companyName);
  const purchasedFrom = ctx.purchasedFromCode || sanitize(ctx.purchasedFromName);
  const sequence = formatSequence(ctx.sequence);

  return `AST-${purchasedFrom}-${owner}-${sequence}`;
}
