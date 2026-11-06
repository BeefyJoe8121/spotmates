import React, { useState } from 'react';
import { Feed } from '@/components/Feed';
import { PRFeed } from '@/components/PRFeed';
import { Seg } from '@/components/ui';

type Tab = 'meal' | 'workout' | 'pr';

export default function FriendsScreen() {
  const [kind, setKind] = useState<Tab>('meal');
  const header = <Seg value={kind} options={[['meal', 'Meals'], ['workout', 'Workouts'], ['pr', 'PRs']]} onChange={setKind} />;
  if (kind === 'pr') return <PRFeed header={header} />;
  return <Feed key={kind} kind={kind} scope="friends" header={header} />;
}
