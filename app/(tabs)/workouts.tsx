import React from 'react';
import { Feed } from '@/components/Feed';
import { RestDayCard } from '@/components/RestDayCard';

export default function WorkoutsScreen() {
  return <Feed kind="workout" scope="mine" header={<RestDayCard />} />;
}
