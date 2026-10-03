import { useState, useSyncExternalStore } from 'react';
import {
  type CoachSession,
  type CoachSessionState,
  createCoachSession,
} from '../helpers/coach-session';

export function useCoachSession(): CoachSession {
  const [session] = useState(createCoachSession);

  return session;
}

export function useCoachState(session: CoachSession): CoachSessionState {
  return useSyncExternalStore(session.subscribe, session.getState);
}
