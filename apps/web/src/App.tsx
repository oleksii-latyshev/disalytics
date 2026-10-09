import { PlateSettingsProvider } from '@disa/plate';
import { MotionProvider } from '@disa/ui';
import { RouterProvider } from '@tanstack/react-router';
import { useCallback, useRef, useState } from 'react';
import { afterRouteNavigation } from '@/core/navigation';
import { useDemoParse } from '@/core/parsing';
import { useLaunchedFiles, useWorkerUpdate } from '@/core/pwa';
import { useSetting } from '@/core/settings';
import { AppRouteContext } from '@/routes/context';
import { createAppRouter } from '@/routes/router';

const REDUCED_MOTION = { system: 'user', reduced: 'always', full: 'never' } as const;

export function App() {
  const parse = useDemoParse();
  const [motion] = useSetting('motion');
  const [palette] = useSetting('palette');
  const [radarTheme] = useSetting('radarTheme');
  const update = useWorkerUpdate();
  const parseOrigin = useRef<string | null>(null);
  const [router] = useState(() => createAppRouter({ parse, onUpdate: update, parseOrigin }));
  const openLaunchedFile = useCallback(
    (file: File) => {
      void afterRouteNavigation(
        () => router.navigate({ to: '/' }),
        () => {
          parseOrigin.current = '/';
          parse.open(file);
        },
      );
    },
    [parse.open, router],
  );

  useLaunchedFiles(openLaunchedFile);

  return (
    <MotionProvider reducedMotion={REDUCED_MOTION[motion]}>
      <PlateSettingsProvider
        palette={palette}
        radarTheme={radarTheme}
        imageBase={import.meta.env.BASE_URL}
      >
        <AppRouteContext.Provider value={{ parse, onUpdate: update, parseOrigin }}>
          <RouterProvider router={router} context={{ parse, onUpdate: update, parseOrigin }} />
        </AppRouteContext.Provider>
      </PlateSettingsProvider>
    </MotionProvider>
  );
}
