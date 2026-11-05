import React, { useState } from 'react';
import { Feed } from '@/components/Feed';
import { Seg } from '@/components/ui';

export default function FriendsScreen() {
  const [kind, setKind] = useState<'meal' | 'workout'>('meal');
  return <Feed key={kind} kind={kind} scope="friends" header={<Seg value={kind} options={[['meal', 'Meals'], ['workout', 'Workouts']]} onChange={setKind} />} />;
}
