import type { Question } from '../../../../src/types/questionIntelligence.ts';

/**
 * Deterministic PDF Document Builder
 * Generates a valid, well-formed PDF-1.4 binary stream containing formatted questions,
 * options, answer keys, and pedagogical metadata without requiring native external binaries.
 */
export function buildPdfBuffer(spec: {
  title: string;
  subject: string;
  topic: string;
  educationLevel: string;
  questions: Question[];
  metadata?: Record<string, any>;
}): Buffer {
  const { title, subject, topic, educationLevel, questions, metadata } = spec;

  // Sanitize text for PDF single-byte font encoding
  const sanitize = (text: string) => {
    return text
      .replace(/[\\()]/g, (match) => `\\${match}`)
      .replace(/[^\x20-\x7E\n]/g, ' ')
      .trim();
  };

  const lines: string[] = [];
  lines.push(`J.A.R.V.I.S. EDUCATION OS - CURRICULUM ASSET`);
  lines.push(`================================================================`);
  lines.push(`Title: ${sanitize(title)}`);
  lines.push(`Subject: ${sanitize(subject)} | Topic: ${sanitize(topic)} | Level: ${sanitize(educationLevel)}`);
  lines.push(`Total Questions: ${questions.length} | Generated: ${new Date().toISOString()}`);
  if (metadata?.provenance) {
    lines.push(`Provenance: ${sanitize(String(metadata.provenance))}`);
  }
  lines.push(`================================================================`);
  lines.push(``);

  // Questions Section
  questions.forEach((q, idx) => {
    lines.push(`Q${idx + 1}. [${q.difficulty.toUpperCase()}] ${sanitize(q.prompt)}`);
    if (Array.isArray(q.options) && q.options.length > 0) {
      q.options.forEach((opt: string, optIdx: number) => {
        const letter = String.fromCharCode(65 + optIdx);
        lines.push(`   (${letter}) ${sanitize(opt)}`);
      });
    }
    lines.push(``);
  });

  // Solutions & Answer Key Section
  lines.push(`----------------------------------------------------------------`);
  lines.push(`ANSWER KEY & PEDAGOGICAL EXPLANATIONS`);
  lines.push(`----------------------------------------------------------------`);
  questions.forEach((q, idx) => {
    const ans = Array.isArray(q.answer) ? q.answer.join(', ') : String(q.answer);
    lines.push(`Q${idx + 1} Answer: ${sanitize(ans)}`);
    if (q.explanation) {
      lines.push(`   Explanation: ${sanitize(q.explanation)}`);
    }
    lines.push(``);
  });

  // Construct PDF stream content with coordinate positioning
  let streamText = `BT\n/F1 10 Tf\n50 750 Td\n14 TL\n`;
  for (const line of lines) {
    if (line === '') {
      streamText += `T*\n`;
    } else {
      // Chunk long lines to fit page margins
      const maxLen = 80;
      for (let i = 0; i < line.length; i += maxLen) {
        const chunk = line.substring(i, i + maxLen);
        streamText += `(${chunk}) '\n`;
      }
    }
  }
  streamText += `ET\n`;

  const streamLength = Buffer.byteLength(streamText, 'utf-8');

  // Build standard PDF 1.4 objects
  const bodyParts: string[] = [];
  bodyParts.push(`%PDF-1.4\n%âãÏÓ\n`);

  const offsets: number[] = [];

  const addObj = (objContent: string) => {
    offsets.push(Buffer.byteLength(bodyParts.join(''), 'utf-8'));
    bodyParts.push(objContent);
  };

  // 1: Catalog
  addObj(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);

  // 2: Pages
  addObj(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`);

  // 3: Page
  addObj(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`
  );

  // 4: Contents Stream
  addObj(`4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamText}endstream\nendobj\n`);

  // 5: Font (Standard Helvetica Type1)
  addObj(`5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`);

  // Cross-reference table
  const startXref = Buffer.byteLength(bodyParts.join(''), 'utf-8');
  let xref = `xref\n0 6\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    const pad = String(offset).padStart(10, '0');
    xref += `${pad} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

  bodyParts.push(xref);
  bodyParts.push(trailer);

  return Buffer.from(bodyParts.join(''), 'utf-8');
}
