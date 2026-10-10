import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Button } from '../button';

describe('Button', () => {
  it('is a plain button unless told otherwise', () => {
    expect(renderToStaticMarkup(createElement(Button))).toContain('type="button"');
  });

  it('honours a passed type', () => {
    expect(renderToStaticMarkup(createElement(Button, { type: 'submit' }))).toContain(
      'type="submit"',
    );
  });
});
