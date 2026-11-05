import React from 'react';
import { Feed } from '@/components/Feed';

export default function MealsScreen() {
  return <Feed kind="meal" scope="mine" />;
}
