import type { Lineup } from '@disa/demo-core';
import type { LineupPoint } from './use-lineup-point-actions';

export function useLineupPlacement({
  origin,
  setOrigin,
  setDraftWaypoints,
  setIsAddingBounce,
  setIsPlacing,
  setDraftLanding,
  setIsModalOpen,
  setEditingLineup,
}: {
  readonly origin: LineupPoint | null;
  readonly setOrigin: React.Dispatch<React.SetStateAction<LineupPoint | null>>;
  readonly setDraftWaypoints: React.Dispatch<React.SetStateAction<LineupPoint[]>>;
  readonly setIsAddingBounce: React.Dispatch<React.SetStateAction<boolean>>;
  readonly setIsPlacing: React.Dispatch<React.SetStateAction<boolean>>;
  readonly setDraftLanding: React.Dispatch<React.SetStateAction<LineupPoint | null>>;
  readonly setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  readonly setEditingLineup: React.Dispatch<React.SetStateAction<Lineup | null>>;
}) {
  const handlePlacePoint = (point: LineupPoint, isBounce?: boolean) => {
    if (origin === null) {
      setOrigin(point);
      return;
    }
    if (isBounce) {
      setDraftWaypoints((previous) => [...previous, point]);
      setIsAddingBounce(false);
      return;
    }
    setDraftLanding(point);
    setIsPlacing(false);
    setIsModalOpen(true);
  };

  const handleCancelPlacement = () => {
    setIsPlacing(false);
    setOrigin(null);
    setDraftWaypoints([]);
    setIsAddingBounce(false);
    setDraftLanding(null);
  };

  const dismissForm = () => {
    setIsModalOpen(false);
    setEditingLineup(null);
    setOrigin(null);
    setDraftWaypoints([]);
    setIsAddingBounce(false);
    setDraftLanding(null);
  };

  return { handlePlacePoint, handleCancelPlacement, dismissForm };
}
