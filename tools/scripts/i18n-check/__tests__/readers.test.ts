import { describe, expect, it } from 'vitest';
import { collectReaders, unreadKeys } from '../readers';

const NAMESPACES = ['errors', 'help', 'library', 'settings', 'timeline'];

function readers(...sources: string[]) {
  return collectReaders(sources, NAMESPACES);
}

describe('collectReaders', () => {
  it('reads a key written in single quotes', () => {
    expect(readers("t('library.open.title')").literals).toContain('library.open.title');
  });

  it('reads a key written in double quotes', () => {
    expect(readers('<Text path="library.open.title" />').literals).toContain('library.open.title');
  });

  it('ignores a dotted string that is not a key path', () => {
    expect(readers("await Bun.file('catalog.json').json()").literals).not.toContain('catalog.json');
  });

  it('builds no pattern from a template with no interpolation', () => {
    expect(readers('`library.open.title`').patterns).toHaveLength(0);
  });

  it('builds no pattern from a template that starts with something else', () => {
    expect(readers(`\`translate(\${x}px, 0)\``).patterns).toHaveLength(0);
  });

  it('builds one pattern from a template that starts with a namespace', () => {
    expect(readers(`\`errors.\${stem}.title\``).patterns).toHaveLength(1);
  });

  it('does not let an unbalanced backtick swallow the line below it', () => {
    const source = ['// The ` character.', `<Text path={\`help.legend.\${mark.id}\`} />`].join(
      '\n',
    );
    expect(readers(source).patterns).toHaveLength(1);
  });
});

describe('unreadKeys', () => {
  it('reports a key no source mentions', () => {
    expect(unreadKeys(['library.map'], readers("t('library.open.title')"))).toEqual([
      'library.map',
    ]);
  });

  it('reports nothing when every key is written out', () => {
    expect(unreadKeys(['library.open.title'], readers("t('library.open.title')"))).toEqual([]);
  });

  it('reports keys in sorted order', () => {
    expect(unreadKeys(['library.map', 'help.legend.dead'], readers(''))).toEqual([
      'help.legend.dead',
      'library.map',
    ]);
  });

  it('accepts a key a template assembles', () => {
    const source = `return \`errors.\${stemFor(code)}.title\` as const;`;
    expect(unreadKeys(['errors.povDemo.title'], readers(source))).toEqual([]);
  });

  it('lets an interpolation stand for one segment and no more', () => {
    const source = `return \`errors.\${stemFor(code)}.title\` as const;`;
    expect(unreadKeys(['errors.pov.demo.title'], readers(source))).toEqual([
      'errors.pov.demo.title',
    ]);
  });

  it('does not let a template cover a key outside its literal parts', () => {
    const source = `<Text path={\`settings.motion.\${preference}\`} />`;
    expect(unreadKeys(['settings.motion.full', 'settings.language.en'], readers(source))).toEqual([
      'settings.language.en',
    ]);
  });

  it('reads a namespace prefix as text rather than as a pattern', () => {
    const source = `<Text path={\`timeline.outcome.\${stem}\`} />`;
    expect(unreadKeys(['timelineXoutcome.draw'], readers(source))).toEqual([
      'timelineXoutcome.draw',
    ]);
  });
});
