import type { FieldDiff } from '@disa/admin-contract';
import { Text, useT } from '@disa/i18n';
import { formatValue } from '../helpers/format';

export function DiffList({ diff }: { diff: readonly FieldDiff[] }) {
  const t = useT();
  const none = t('admin.row.none');
  return (
    <div className="overflow-x-auto rounded-chip border border-line">
      <table className="w-full min-w-[32rem] text-left text-12">
        <thead className="text-ink-dim">
          <tr>
            <th scope="col" className="px-2 py-1 font-medium" />
            <th scope="col" className="px-2 py-1 font-medium">
              <Text path="admin.row.stored" />
            </th>
            <th scope="col" className="px-2 py-1 font-medium">
              <Text path="admin.row.incoming" />
            </th>
          </tr>
        </thead>
        <tbody>
          {diff.map((entry) => (
            <tr
              key={entry.field}
              className="align-top [border-block-start:1px_solid_var(--color-line-soft)]"
            >
              <th scope="row" className="numeric px-2 py-1 font-medium text-ink">
                {entry.field}
              </th>
              <td className="numeric break-all px-2 py-1 text-ink-dim">
                {formatValue(entry.before) ?? none}
              </td>
              <td className="numeric break-all px-2 py-1 text-ink">
                {formatValue(entry.after) ?? none}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
