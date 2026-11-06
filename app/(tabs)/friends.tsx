import React, { useState } from 'react';
import { View } from 'react-native';
import { CrewRecap } from '@/components/CrewRecap';
import { Feed } from '@/components/Feed';
import { PRFeed } from '@/components/PRFeed';
import { Seg } from '@/components/ui';

type Tab = 'meal' | 'workout' | 'pr';

export default function FriendsScreen() {
  const [kind, setKind] = useState<Tab>('meal');
  const header = (
    <View style={{ gap: 14 }}>
      <CrewRecap />
      <Seg value={kind} options={[['meal', 'Meals'], ['workout', 'Workouts'], ['pr', 'PRs']]} onChange={setKind} />
    </View>
  );
  if (kind === 'pr') return <PRFeed header={header} />;
  return <Feed key={kind} kind={kind} scope="friends" header={header} />;
}
