export async function afterRouteNavigation(
  navigate: () => Promise<unknown>,
  action: () => void,
): Promise<void> {
  await navigate();
  action();
}
