import { describe, expect, it } from 'vitest';
import { decodeDataUrl, sniffImageType } from '../helpers/images';
import { diffLineups, findDuplicate, photoStats, planLineups } from '../helpers/plan';
import { lineup, PHOTO_BASE, PNG_DATA_URL } from './support';

describe('planLineups', () => {
  it('marks a lineup with an unseen id and no twin as new', () => {
    const [item] = planLineups(
      [lineup()],
      [lineup({ id: 'far', origin: { x: 5000, y: 0, z: 0 } })],
    );
    expect(item?.status).toBe('new');
  });

  it('marks an identical lineup unchanged, whatever the key order or isBuiltIn', () => {
    const stored = { ...lineup(), isBuiltIn: true };
    const reordered = Object.fromEntries(Object.entries(lineup()).reverse()) as ReturnType<
      typeof lineup
    >;
    expect(planLineups([stored], [reordered])[0]?.status).toBe('unchanged');
  });

  it('marks the same id with other content an update and lists the fields', () => {
    const [item] = planLineups([lineup()], [lineup({ title: 'Renamed', pitch: -11 })]);
    expect(item?.status).toBe('update');
    expect(item?.diff?.map((d) => d.field)).toEqual(['pitch', 'title']);
    expect(item?.diff?.find((d) => d.field === 'title')).toEqual({
      field: 'title',
      before: 'Smoke window',
      after: 'Renamed',
    });
  });

  it('marks another id at nearly the same throw a duplicate and names the candidate', () => {
    const [item] = planLineups(
      [lineup()],
      [
        lineup({
          id: 'other',
          origin: { x: 120, y: 210, z: 0 },
          landing: { x: 310, y: 390, z: 0 },
        }),
      ],
    );
    expect(item?.status).toBe('duplicate');
    expect(item?.candidate).toEqual({ id: 'mirage-1', title: 'Smoke window' });
  });

  it('is not a duplicate across kind, side, or beyond the radius', () => {
    const near = { origin: { x: 110, y: 200, z: 0 }, landing: { x: 300, y: 400, z: 0 } };
    expect(findDuplicate(lineup({ id: 'a', kind: 'flash', ...near }), [lineup()])).toBeNull();
    expect(findDuplicate(lineup({ id: 'a', side: 'CT', ...near }), [lineup()])).toBeNull();
    expect(
      findDuplicate(lineup({ id: 'a', origin: { x: 100, y: 260, z: 0 } }), [lineup()]),
    ).toBeNull();
  });
});

describe('diffLineups', () => {
  it('reports a removed optional field', () => {
    const diff = diffLineups(lineup({ notes: 'x' }), lineup());
    expect(diff).toEqual([{ field: 'notes', before: 'x', after: undefined }]);
  });
});

describe('photoStats', () => {
  it('counts distinct embedded refs, links and our own urls', () => {
    const hash = 'a'.repeat(64);
    const stats = photoStats(
      [
        lineup({ imageUrls: [`local:${hash}`, 'https://files.catbox.moe/a.webp'] }),
        lineup({ id: 'b', imageUrls: [`local:${hash}`, `${PHOTO_BASE}/${hash}`] }),
      ],
      PHOTO_BASE,
    );
    expect(stats).toEqual({ embedded: 1, links: 1, ours: 1 });
  });
});

describe('images', () => {
  it('recognises webp, png and jpeg by their bytes', () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    const webp = new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 ');
    expect(sniffImageType(webp)).toBe('image/webp');
    expect(sniffImageType(new TextEncoder().encode('<html>'))).toBeNull();
  });

  it('decodes a real data url and rejects a lying one', () => {
    expect(decodeDataUrl(PNG_DATA_URL)).toMatchObject({ ok: true, type: 'image/png' });
    const lie = `data:image/png;base64,${btoa('not an image')}`;
    expect(decodeDataUrl(lie)).toEqual({ ok: false, reason: 'not_an_image' });
    expect(decodeDataUrl('data:text/html;base64,AAAA')).toEqual({
      ok: false,
      reason: 'not_a_data_url',
    });
  });

  it('refuses more than 5 MB', () => {
    const big = `data:image/png;base64,${'A'.repeat(7_200_000)}`;
    expect(decodeDataUrl(big)).toEqual({ ok: false, reason: 'too_large' });
  });
});
