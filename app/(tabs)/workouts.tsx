import React from 'react';
import { Feed } from '@/components/Feed';

export default function WorkoutsScreen() {
  return <Feed kind="workout" scope="mine" />;
}
