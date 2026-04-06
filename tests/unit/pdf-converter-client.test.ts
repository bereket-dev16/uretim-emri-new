import { describe, expect, it } from 'vitest';

import {
  buildPdfFilename,
  resolveOfficeMimeType
} from '@/shared/pdf-converter/client';

describe('pdf converter client helpers', () => {
  it('builds pdf filenames from office documents', () => {
    expect(buildPdfFilename('teklif.docx')).toBe('teklif.pdf');
    expect(buildPdfFilename('rapor final.xlsx')).toBe('rapor final.pdf');
    expect(buildPdfFilename('  ')).toBe('dosya.pdf');
  });

  it('resolves office mime types from mime or extension', () => {
    expect(
      resolveOfficeMimeType(
        new File(['a'], 'plan.docx', {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        })
      )
    ).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    expect(resolveOfficeMimeType(new File(['a'], 'liste.xlsx'))).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    expect(resolveOfficeMimeType(new File(['a'], 'dokuman.pdf', { type: 'application/pdf' }))).toBeNull();
  });
});
