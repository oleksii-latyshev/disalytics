import { Text } from '@disa/i18n';

interface Props {
  map: string;
}

export function UnknownMap({ map }: Props) {
  return (
    <div className="flex flex-col gap-2 rounded-instrument border border-line border-dashed p-6">
      <p className="text-14">
        <Text path="radar.unknownMap.title" />
      </p>
      <p className="text-13 text-ink-dim leading-prose">
        <Text path="radar.unknownMap.hint" values={{ map }} />
      </p>
    </div>
  );
}
