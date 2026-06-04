import type { Content } from "pdfmake/interfaces";

/** תא בטבלת pdfmake — מחרוזת או אובייקט תוכן. */
type PdfTableCell = string | Content;

import { getColumnPreset, getColumnPresetHeaders } from "../schema/column-presets";
import { normalizeReportBlocks } from "../schema/normalize";
import type {
  BlockColumnDef,
  BlockColumnId,
  ChecklistBlock,
  FindingRow,
  FindingsTableBlock,
  FreeTextBlock,
  ImageBlock,
  ProgressTableBlock,
  ReportBlock,
} from "../schema/types";
import type { LinePhotoData } from "./types";

const LINE_STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: "בתהליך",
  DONE: "בוצע",
  NEEDS_ACTION: "יש להשלים",
};

/** גודל thumbnail בעמודת תמונות (FR-3.2). */
const INLINE_PHOTO_THUMB_SIZE = 40;

export type LinePhotoLookup = ReadonlyMap<string, readonly string[]>;

export type RenderBlocksOptions = {
  visitType: string;
  /** שורות דוח — fallback derive ל-findings כשאין blocks מפורשים (לא בשימוש כאן). */
  reportLines?: unknown[] | null;
  linePhotos?: LinePhotoData[];
};

/** האם נשמר מערך blocks מפורש ב-header_fields (לא מיגרציה אוטומטית בלבד). */
export function hasExplicitBlocksInHeader(
  headerFields: Record<string, unknown>
): boolean {
  return Array.isArray(headerFields.blocks) && headerFields.blocks.length > 0;
}

/**
 * מרender גוף דוח מ-blocks[] לפי sort_order (FR-2.3).
 */
export function renderBlocks(
  blocks: ReportBlock[],
  options: RenderBlocksOptions
): Content[] {
  const sorted = [...blocks].sort(
    (left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0)
  );

  const content: Content[] = [];

  for (const block of sorted) {
    switch (block.kind) {
      case "progress_table":
        content.push(...renderProgressTable(block));
        break;
      case "findings_table":
        content.push(
          ...renderFindingsTable(block, options.linePhotos ?? [])
        );
        break;
      case "checklist":
        content.push(...renderChecklist(block));
        break;
      case "free_text":
        content.push(...renderFreeText(block));
        break;
      case "image":
        content.push(...renderImageBlock(block));
        break;
      default: {
        const _exhaustive: never = block;
        void _exhaustive;
      }
    }
  }

  return content;
}

/**
 * טוען blocks מפורשים מ-header_fields ומרender — לשימוש ב-buildVisitReportDocDefinition.
 */
export function renderExplicitBlocksFromHeader(
  headerFields: Record<string, unknown>,
  options: RenderBlocksOptions
): Content[] {
  const blocks = normalizeReportBlocks(
    headerFields,
    options.visitType,
    options.reportLines ?? null
  );
  return renderBlocks(blocks, options);
}

export function renderProgressTable(block: ProgressTableBlock): Content[] {
  const rows = block.rows.filter(
    (row) => row.description || row.status || row.completion_date
  );
  if (rows.length === 0) {
    return [];
  }

  const columns = pdfColumnsForPreset(block.column_preset);
  const headers = columns.map((column) => column.header_he);
  const body = rows
    .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0))
    .map((row) => progressRowToCells(row, columns));

  return [
    {
      text: block.title_he,
      style: "sectionTitle",
      margin: [0, 12, 0, 6],
    },
    {
      table: {
        headerRows: 1,
        widths: headers.map(() => "*"),
        body: [headers, ...body],
      },
      layout: "lightHorizontalLines",
      margin: [0, 0, 0, 12],
    },
  ];
}

export function buildLinePhotoLookup(
  linePhotos: LinePhotoData[] = []
): LinePhotoLookup {
  const lookup = new Map<string, string[]>();
  for (const photo of linePhotos) {
    if (!photo.lineId || !photo.dataUrl) {
      continue;
    }
    const existing = lookup.get(photo.lineId) ?? [];
    lookup.set(photo.lineId, [...existing, photo.dataUrl]);
  }
  return lookup;
}

/** האם preset כולל עמודת תמונות (rich / simple). */
export function findingsPresetIncludesPhotosColumn(
  preset: FindingsTableBlock["column_preset"]
): boolean {
  return getColumnPreset(preset).some((column) => column.id === "photos");
}

/**
 * שורות שצפויות לקבל thumbnail inline — לסינון תמונות בסוף הדוח (FR-3.2).
 */
export function collectInlineRenderedPhotoLineIds(
  headerFields: Record<string, unknown>,
  visitType: string,
  reportLines: unknown[] | null | undefined,
  linePhotos: LinePhotoData[] = []
): Set<string> {
  const lookup = buildLinePhotoLookup(linePhotos);
  if (lookup.size === 0) {
    return new Set();
  }

  const blocks = normalizeReportBlocks(
    headerFields,
    visitType,
    reportLines ?? null
  );
  const lineIds = new Set<string>();

  for (const block of blocks) {
    if (block.kind !== "findings_table") {
      continue;
    }
    if (!findingsPresetIncludesPhotosColumn(block.column_preset)) {
      continue;
    }

    for (const row of block.rows) {
      if (!rowHasPhotoMarker(row)) {
        continue;
      }
      const dataUrls = lookup.get(row.id);
      if (dataUrls?.length) {
        lineIds.add(row.id);
      }
    }
  }

  return lineIds;
}

export function renderFindingsTable(
  block: FindingsTableBlock,
  linePhotos: LinePhotoData[] = []
): Content[] {
  const rows = [...block.rows].sort(
    (left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0)
  );
  const columns = pdfColumnsForFindingsPreset(block.column_preset);
  const photoLookup = buildLinePhotoLookup(linePhotos);
  const includeCatalogColumns =
    block.column_preset === "rich"
    && rows.some((row) => Boolean(row.issue_id));
  const headers = columns.map((column) => column.header_he);
  if (includeCatalogColumns) {
    headers.push("תקן", "חומרה");
  }
  const widths = tableWidthsForColumns(columns, includeCatalogColumns);

  const content: Content[] = [
    {
      text: block.title_he,
      style: "sectionTitle",
      margin: [0, 12, 0, 6],
    },
  ];

  if (rows.length === 0) {
    content.push({
      text: "אין שורות ממצאים בדוח.",
      alignment: "right",
      margin: [0, 0, 0, 12],
    });
    return content;
  }

  for (const segment of segmentFindingsRowsByGroup(rows)) {
    if (segment.groupLabelHe) {
      content.push({
        text: segment.groupLabelHe,
        bold: true,
        fontSize: 11,
        alignment: "right",
        margin: [0, 8, 0, 4],
      });
    }

    const body = segment.rows.map((row) =>
      findingRowToCells(row, columns, includeCatalogColumns, photoLookup)
    );

    const tableBody: PdfTableCell[][] = [headers, ...body];

    content.push({
      table: {
        headerRows: 1,
        widths,
        body: tableBody,
      },
      layout: "lightHorizontalLines",
      margin: [0, 0, 0, segment.groupLabelHe ? 8 : 12],
    } as Content);
  }

  return content;
}

/** מחלק שורות ממצאים לפי group_key תוך שמירה על sort_order (FR-3.1). */
export function segmentFindingsRowsByGroup(
  rows: FindingRow[]
): { groupLabelHe: string | null; rows: FindingRow[] }[] {
  const segments: { groupLabelHe: string | null; rows: FindingRow[] }[] = [];
  let index = 0;

  while (index < rows.length) {
    const row = rows[index];
    const groupKey = row.group_key?.trim() || null;

    if (groupKey) {
      const groupLabelHe = row.group_label_he?.trim() || groupKey;
      const groupRows: FindingRow[] = [];

      while (
        index < rows.length
        && (rows[index].group_key?.trim() || null) === groupKey
      ) {
        groupRows.push(rows[index]);
        index += 1;
      }

      segments.push({ groupLabelHe, rows: groupRows });
      continue;
    }

    const ungroupedRows: FindingRow[] = [];
    while (index < rows.length && !rows[index].group_key?.trim()) {
      ungroupedRows.push(rows[index]);
      index += 1;
    }

    segments.push({ groupLabelHe: null, rows: ungroupedRows });
  }

  return segments;
}

export function renderChecklist(block: ChecklistBlock): Content[] {
  const items = [...block.items].sort(
    (left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0)
  );
  if (items.length === 0) {
    return [];
  }

  const body: string[][] = [
    ["פריט", "סטטוס", "הערות"],
    ...items.map((item) => [
      item.label_he,
      item.checked ? "בוצע" : "לא בוצע",
      item.notes?.trim() || "",
    ]),
  ];

  return [
    {
      text: block.title_he,
      style: "sectionTitle",
      margin: [0, 12, 0, 6],
    },
    {
      table: {
        headerRows: 1,
        widths: ["*", "auto", "*"],
        body,
      },
      layout: "lightHorizontalLines",
      margin: [0, 0, 0, 12],
    },
  ];
}

export function renderFreeText(block: FreeTextBlock): Content[] {
  const body = block.body_he?.trim();
  if (!body) {
    return [];
  }

  return [
    {
      text: block.title_he,
      style: "sectionTitle",
      margin: [0, 12, 0, 6],
    },
    {
      text: body,
      alignment: "right",
      margin: [0, 0, 0, 12],
    },
  ];
}

export function renderImageBlock(block: ImageBlock): Content[] {
  const content: Content[] = [];
  const caption = block.caption_he?.trim() || block.title_he;

  if (caption) {
    content.push({
      text: caption,
      style: "sectionTitle",
      margin: [0, 12, 0, 6],
    });
  }

  if (block.image_url) {
    content.push({
      image: block.image_url,
      width: 280,
      alignment: "right",
      margin: [0, 0, 0, 12],
    });
  }

  return content;
}

function pdfColumnsForPreset(
  preset: ProgressTableBlock["column_preset"]
): readonly BlockColumnDef[] {
  return getColumnPreset(preset);
}

function pdfColumnsForFindingsPreset(
  preset: FindingsTableBlock["column_preset"]
): readonly BlockColumnDef[] {
  return getColumnPreset(preset);
}

function tableWidthsForColumns(
  columns: readonly BlockColumnDef[],
  includeCatalogColumns: boolean
): Array<number | "*" | "auto"> {
  const widths: Array<number | "*" | "auto"> = columns.map((column) =>
    column.id === "photos" ? INLINE_PHOTO_THUMB_SIZE * 3 + 12 : "*"
  );
  if (includeCatalogColumns) {
    widths.push("auto", "auto");
  }
  return widths;
}

function progressRowToCells(
  row: ProgressTableBlock["rows"][number],
  columns: readonly BlockColumnDef[]
): string[] {
  return columns.map((column) => {
    switch (column.id) {
      case "description":
        return row.description;
      case "status":
        return row.status;
      case "completion_date":
        return row.completion_date;
      default:
        return "";
    }
  });
}

function findingRowToCells(
  row: FindingRow,
  columns: readonly BlockColumnDef[],
  includeCatalogColumns: boolean,
  photoLookup: LinePhotoLookup
): PdfTableCell[] {
  const statusNotes = [
    row.status ? formatLineStatus(row.status) : "",
    row.notes || "",
  ]
    .filter(Boolean)
    .join(" — ");

  const cells: PdfTableCell[] = columns.map((column) => {
    switch (column.id as BlockColumnId) {
      case "location":
        return row.location || "";
      case "trade":
        return row.trade || "";
      case "status":
        return statusNotes;
      case "description":
        return row.description || "";
      case "notes":
        return row.notes || "";
      case "photos":
        return renderInlinePhotoCell(row, photoLookup);
      default:
        return "";
    }
  });

  if (includeCatalogColumns) {
    cells.push(row.issue_id ? row.standard_ref || "" : "");
    cells.push(row.issue_id ? row.severity || "" : "");
  }

  return cells;
}

function rowHasPhotoMarker(row: FindingRow): boolean {
  if (row.has_photo) {
    return true;
  }
  return Boolean(row.photo_ids?.length);
}

function renderInlinePhotoCell(
  row: FindingRow,
  photoLookup: LinePhotoLookup
): PdfTableCell {
  if (!rowHasPhotoMarker(row)) {
    return "";
  }

  const dataUrls = photoLookup.get(row.id);
  if (!dataUrls?.length) {
    return "";
  }

  return {
    columns: dataUrls.map((dataUrl) => ({
      width: INLINE_PHOTO_THUMB_SIZE,
      stack: [
        {
          image: dataUrl,
          width: INLINE_PHOTO_THUMB_SIZE,
          height: INLINE_PHOTO_THUMB_SIZE,
          alignment: "center",
        },
      ],
    })),
    columnGap: 4,
    alignment: "center",
    margin: [0, 2, 0, 2],
  } as PdfTableCell;
}

function formatLineStatus(status: string): string {
  return LINE_STATUS_LABELS[status] || status;
}

/** כותרות preset — לבדיקות. */
export function findingsTableHeadersForPreset(
  preset: FindingsTableBlock["column_preset"]
): string[] {
  return getColumnPresetHeaders(preset);
}
