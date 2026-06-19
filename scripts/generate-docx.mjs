/**
 * Generates a single .docx file from all documentation markdown files.
 * Usage: node scripts/generate-docx.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  PageBreak,
  ShadingType,
  TabStopPosition,
  TabStopType,
  convertInchesToTwip,
  LevelFormat,
} from "docx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docsDir = path.join(__dirname, "..", "docs");

// Ordered list of doc files to include
const DOC_FILES = [
  { file: "README.md", title: "Project Overview" },
  { file: "ARCHITECTURE.md", title: "Architecture" },
  { file: "LOCAL_SETUP.md", title: "Local Development Setup" },
  { file: "PRODUCTION_SETUP.md", title: "Production Setup" },
  { file: "DATABASE.md", title: "Database Documentation" },
  { file: "MODULES.md", title: "Module Documentation" },
  { file: "ASSET_ACKNOWLEDGEMENT.md", title: "Asset Acknowledgement System" },
  { file: "ENV_VARIABLES.md", title: "Environment Variables" },
  { file: "DEPLOYMENT_WORKFLOW.md", title: "Deployment Workflow" },
  { file: "SECURITY.md", title: "Security Documentation" },
  { file: "TROUBLESHOOTING.md", title: "Troubleshooting Guide" },
  { file: "DEVELOPER_HANDOVER.md", title: "Developer Handover" },
];

// ─── Styling Constants ─────────────────────────────────────────
const COLORS = {
  primary: "1a56db",      // Blue
  heading2: "1e40af",
  heading3: "374151",
  text: "1f2937",
  muted: "6b7280",
  code: "111827",
  codeBg: "f3f4f6",
  tableBorder: "d1d5db",
  tableHeaderBg: "1e3a5f",
  tableHeaderText: "ffffff",
  tableAltBg: "f9fafb",
  warning: "b91c1c",
  link: "2563eb",
};

const FONT = "Calibri";
const CODE_FONT = "Consolas";

// ─── Markdown Parser ────────────────────────────────────────────

function parseMarkdownToDocElements(markdown, sectionTitle) {
  const lines = markdown.split("\n");
  const elements = [];
  let i = 0;
  let listLevel = 0;
  let inCodeBlock = false;
  let codeBlockLines = [];
  let codeBlockLang = "";

  while (i < lines.length) {
    let line = lines[i];

    // ── Code blocks ───────────────────────────────────────────
    if (line.trim().startsWith("```") || line.trim().startsWith("````")) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLang = line.trim().replace(/^`+/, "").trim();
        codeBlockLines = [];
        i++;
        continue;
      } else {
        // End of code block
        inCodeBlock = false;
        elements.push(...createCodeBlock(codeBlockLines.join("\n")));
        codeBlockLines = [];
        i++;
        continue;
      }
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      i++;
      continue;
    }

    // ── Empty lines ──────────────────────────────────────────
    if (line.trim() === "") {
      elements.push(new Paragraph({ spacing: { after: 60 } }));
      i++;
      continue;
    }

    // ── Horizontal rule ──────────────────────────────────────
    if (/^-{3,}$/.test(line.trim()) || /^\*{3,}$/.test(line.trim())) {
      elements.push(
        new Paragraph({
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.tableBorder },
          },
          spacing: { before: 200, after: 200 },
        })
      );
      i++;
      continue;
    }

    // ── Headings ─────────────────────────────────────────────
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = cleanInlineFormatting(headingMatch[2]);
      elements.push(createHeading(text, level));
      i++;
      continue;
    }

    // ── Tables ───────────────────────────────────────────────
    if (line.includes("|") && line.trim().startsWith("|")) {
      const tableLines = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const table = parseTable(tableLines);
      if (table) {
        elements.push(table);
        elements.push(new Paragraph({ spacing: { after: 120 } }));
      }
      continue;
    }

    // ── Blockquotes / Alerts ─────────────────────────────────
    if (line.trim().startsWith(">")) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].replace(/^>\s*/, ""));
        i++;
      }
      const quoteText = quoteLines.join(" ").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\[!.*?\]\s*/g, "⚠️ ");
      elements.push(createBlockquote(quoteText));
      continue;
    }

    // ── Ordered list ─────────────────────────────────────────
    const olMatch = line.match(/^(\s*)(\d+)\.\s+(.+)/);
    if (olMatch) {
      const indent = Math.floor(olMatch[1].length / 2);
      const text = olMatch[3];
      elements.push(createListItem(text, indent, true, parseInt(olMatch[2])));
      i++;
      continue;
    }

    // ── Unordered list (- or *) ──────────────────────────────
    const ulMatch = line.match(/^(\s*)[-*]\s+(.+)/);
    if (ulMatch) {
      const indent = Math.floor(ulMatch[1].length / 2);
      const text = ulMatch[2];
      elements.push(createListItem(text, indent, false));
      i++;
      continue;
    }

    // ── Checkbox list ────────────────────────────────────────
    const checkMatch = line.match(/^[-*]\s+\[([x \/])\]\s+(.+)/);
    if (checkMatch) {
      const checked = checkMatch[1] === "x";
      const inProgress = checkMatch[1] === "/";
      const prefix = checked ? "✅ " : inProgress ? "🔄 " : "☐ ";
      elements.push(createListItem(prefix + checkMatch[2], 0, false));
      i++;
      continue;
    }

    // ── Regular paragraph ────────────────────────────────────
    elements.push(createParagraph(line));
    i++;
  }

  return elements;
}

// ─── Element Creators ───────────────────────────────────────────

function createHeading(text, level) {
  const headingMap = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
    4: HeadingLevel.HEADING_4,
    5: HeadingLevel.HEADING_5,
    6: HeadingLevel.HEADING_6,
  };

  const colorMap = {
    1: COLORS.primary,
    2: COLORS.heading2,
    3: COLORS.heading3,
    4: COLORS.heading3,
    5: COLORS.heading3,
    6: COLORS.heading3,
  };

  const sizeMap = {
    1: 32,
    2: 26,
    3: 22,
    4: 20,
    5: 18,
    6: 16,
  };

  return new Paragraph({
    heading: headingMap[level] || HeadingLevel.HEADING_4,
    spacing: { before: level <= 2 ? 360 : 240, after: 120 },
    children: [
      new TextRun({
        text: cleanInlineFormatting(text),
        bold: true,
        size: sizeMap[level] * 2,
        color: colorMap[level],
        font: FONT,
      }),
    ],
  });
}

function createParagraph(text) {
  return new Paragraph({
    spacing: { after: 100, line: 300 },
    children: parseInlineFormatting(text),
  });
}

function parseInlineFormatting(text) {
  const runs = [];
  // Remove markdown link syntax but keep text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Split by formatting markers
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|__[^_]+__|~~[^~]+~~)/g);

  for (const part of parts) {
    if (!part) continue;

    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(
        new TextRun({
          text: part.slice(2, -2),
          bold: true,
          font: FONT,
          size: 20,
          color: COLORS.text,
        })
      );
    } else if (part.startsWith("`") && part.endsWith("`")) {
      runs.push(
        new TextRun({
          text: part.slice(1, -1),
          font: CODE_FONT,
          size: 18,
          color: COLORS.code,
          shading: { type: ShadingType.CLEAR, fill: COLORS.codeBg },
        })
      );
    } else if (part.startsWith("__") && part.endsWith("__")) {
      runs.push(
        new TextRun({
          text: part.slice(2, -2),
          bold: true,
          font: FONT,
          size: 20,
          color: COLORS.text,
        })
      );
    } else {
      // Clean up any remaining markdown symbols
      const cleaned = part
        .replace(/^#+\s*/, "")
        .replace(/\*\*/g, "")
        .replace(/^\s*[-*]\s+/, "");

      if (cleaned) {
        runs.push(
          new TextRun({
            text: cleaned,
            font: FONT,
            size: 20,
            color: COLORS.text,
          })
        );
      }
    }
  }

  return runs;
}

function cleanInlineFormatting(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[🏗️📋💻🚀🗄️📦✍️🔑📤🔒🔧🤝⚡👥🛠️📚]/gu, "")
    .trim();
}

function createCodeBlock(code) {
  const codeLines = code.split("\n");
  const paragraphs = [];

  for (let i = 0; i < codeLines.length; i++) {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 0, line: 240 },
        shading: { type: ShadingType.CLEAR, fill: "f0f0f0" },
        indent: { left: convertInchesToTwip(0.3), right: convertInchesToTwip(0.3) },
        children: [
          new TextRun({
            text: codeLines[i] || " ",
            font: CODE_FONT,
            size: 16,
            color: COLORS.code,
          }),
        ],
      })
    );
  }

  // Add spacing after code block
  paragraphs.push(new Paragraph({ spacing: { after: 120 } }));

  return paragraphs;
}

function createBlockquote(text) {
  return new Paragraph({
    spacing: { before: 120, after: 120, line: 280 },
    indent: { left: convertInchesToTwip(0.4) },
    border: {
      left: { style: BorderStyle.SINGLE, size: 6, color: COLORS.primary },
    },
    children: [
      new TextRun({
        text: cleanInlineFormatting(text),
        font: FONT,
        size: 19,
        italics: true,
        color: COLORS.muted,
      }),
    ],
  });
}

function createListItem(text, indent = 0, ordered = false, number = null) {
  const bullet = ordered ? `${number || "•"}. ` : "• ";
  const indentTwips = convertInchesToTwip(0.3 + indent * 0.3);

  return new Paragraph({
    spacing: { after: 60, line: 280 },
    indent: { left: indentTwips, hanging: convertInchesToTwip(0.25) },
    children: [
      new TextRun({
        text: bullet,
        font: FONT,
        size: 20,
        color: COLORS.muted,
      }),
      ...parseInlineFormatting(cleanInlineFormatting(text)),
    ],
  });
}

function parseTable(tableLines) {
  if (tableLines.length < 2) return null;

  // Parse cells
  const rows = tableLines
    .filter((line) => !/^\|[\s-:|]+\|$/.test(line.trim())) // Skip separator rows
    .map((line) =>
      line
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c !== "")
    );

  if (rows.length === 0) return null;

  const numCols = rows[0].length;

  // Calculate column widths (equal distribution)
  const totalWidth = 9500; // ~6.5 inches in twips-like units for percentage
  const colWidth = Math.floor(totalWidth / numCols);

  const tableRows = rows.map((cells, rowIndex) => {
    const isHeader = rowIndex === 0;

    const tableCells = [];
    for (let c = 0; c < numCols; c++) {
      const cellText = cells[c] || "";

      tableCells.push(
        new TableCell({
          width: { size: colWidth, type: WidthType.DXA },
          shading: isHeader
            ? { type: ShadingType.CLEAR, fill: COLORS.tableHeaderBg }
            : rowIndex % 2 === 0
            ? { type: ShadingType.CLEAR, fill: COLORS.tableAltBg }
            : undefined,
          margins: {
            top: convertInchesToTwip(0.04),
            bottom: convertInchesToTwip(0.04),
            left: convertInchesToTwip(0.08),
            right: convertInchesToTwip(0.08),
          },
          children: [
            new Paragraph({
              spacing: { after: 0 },
              children: [
                new TextRun({
                  text: cleanInlineFormatting(cellText),
                  bold: isHeader,
                  font: cellText.includes("`") ? CODE_FONT : FONT,
                  size: isHeader ? 18 : 18,
                  color: isHeader ? COLORS.tableHeaderText : COLORS.text,
                }),
              ],
            }),
          ],
        })
      );
    }

    return new TableRow({ children: tableCells });
  });

  return new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

// ─── Document Builder ───────────────────────────────────────────

function buildDocument() {
  const allSections = [];

  // ── Title Page ─────────────────────────────────────────────
  const titlePageElements = [
    new Paragraph({ spacing: { before: 4000 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "ASSET MANAGEMENT SYSTEM",
          bold: true,
          size: 52,
          color: COLORS.primary,
          font: FONT,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: "Complete Project Documentation",
          size: 32,
          color: COLORS.heading3,
          font: FONT,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 2, color: COLORS.primary },
      },
      children: [
        new TextRun({
          text: " ",
          size: 10,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: "Multi-company enterprise platform for managing assets, inventory,",
          size: 22,
          color: COLORS.muted,
          font: FONT,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: "maintenance, transfers, and employee handovers.",
          size: 22,
          color: COLORS.muted,
          font: FONT,
        }),
      ],
    }),
    new Paragraph({ spacing: { before: 2000 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "Technology Stack: Next.js 16 • TypeScript • Prisma 7 • PostgreSQL • Supabase • Vercel",
          size: 18,
          color: COLORS.muted,
          font: FONT,
          italics: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
      children: [
        new TextRun({
          text: `Generated: ${new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}`,
          size: 18,
          color: COLORS.muted,
          font: FONT,
        }),
      ],
    }),
  ];

  allSections.push(...titlePageElements);

  // ── Table of Contents Header ───────────────────────────────
  allSections.push(
    new Paragraph({
      pageBreakBefore: true,
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: "TABLE OF CONTENTS",
          bold: true,
          size: 36,
          color: COLORS.primary,
          font: FONT,
        }),
      ],
    })
  );

  allSections.push(
    new Paragraph({
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 2, color: COLORS.primary },
      },
      spacing: { after: 300 },
      children: [new TextRun({ text: " ", size: 10 })],
    })
  );

  DOC_FILES.forEach((docFile, index) => {
    allSections.push(
      new Paragraph({
        spacing: { after: 120 },
        indent: { left: convertInchesToTwip(0.2) },
        children: [
          new TextRun({
            text: `${index + 1}.  `,
            bold: true,
            size: 22,
            color: COLORS.primary,
            font: FONT,
          }),
          new TextRun({
            text: docFile.title,
            size: 22,
            color: COLORS.text,
            font: FONT,
          }),
        ],
      })
    );
  });

  // ── Document Sections ──────────────────────────────────────
  DOC_FILES.forEach((docFile, index) => {
    const filePath = path.join(docsDir, docFile.file);

    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${filePath}`);
      return;
    }

    const markdown = fs.readFileSync(filePath, "utf-8");

    // Section divider page break
    allSections.push(
      new Paragraph({
        pageBreakBefore: true,
        spacing: { after: 40 },
        children: [
          new TextRun({
            text: `SECTION ${index + 1}`,
            bold: true,
            size: 18,
            color: COLORS.muted,
            font: FONT,
            allCaps: true,
          }),
        ],
      })
    );

    // Section title
    allSections.push(
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: docFile.title,
            bold: true,
            size: 36,
            color: COLORS.primary,
            font: FONT,
          }),
        ],
      })
    );

    allSections.push(
      new Paragraph({
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 2, color: COLORS.primary },
        },
        spacing: { after: 240 },
        children: [new TextRun({ text: " ", size: 6 })],
      })
    );

    // Parse and add markdown content
    const docElements = parseMarkdownToDocElements(markdown, docFile.title);
    allSections.push(...docElements);
  });

  // ── Footer ─────────────────────────────────────────────────
  allSections.push(
    new Paragraph({
      pageBreakBefore: true,
      alignment: AlignmentType.CENTER,
      spacing: { before: 4000, after: 200 },
      children: [
        new TextRun({
          text: "— End of Documentation —",
          size: 28,
          color: COLORS.muted,
          font: FONT,
          italics: true,
        }),
      ],
    })
  );

  allSections.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "Asset Management System • Complete Project Documentation",
          size: 18,
          color: COLORS.muted,
          font: FONT,
        }),
      ],
    })
  );

  return new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT,
            size: 20,
            color: COLORS.text,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.8),
              bottom: convertInchesToTwip(0.8),
              left: convertInchesToTwip(0.9),
              right: convertInchesToTwip(0.9),
            },
          },
        },
        children: allSections,
      },
    ],
  });
}

// ─── Main ───────────────────────────────────────────────────────

async function main() {
  console.log("📄 Generating .docx from documentation...\n");

  DOC_FILES.forEach((f) => {
    const fullPath = path.join(docsDir, f.file);
    const exists = fs.existsSync(fullPath);
    console.log(`  ${exists ? "✅" : "❌"} ${f.file} (${f.title})`);
  });

  console.log("");

  const doc = buildDocument();
  const buffer = await Packer.toBuffer(doc);

  const outputPath = path.join(__dirname, "..", "docs", "Asset_Management_System_Documentation.docx");
  fs.writeFileSync(outputPath, buffer);

  const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
  console.log(`✅ Generated: ${outputPath}`);
  console.log(`   Size: ${sizeMB} MB`);
  console.log(`   Sections: ${DOC_FILES.length}`);
}

main().catch(console.error);
