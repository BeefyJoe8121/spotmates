import { decode } from 'base64-arraybuffer';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { addDays, ageMs, POST_TTL_MS, today, uuid } from './util';

export type Exercise = { name: string; sets: string; reps: string; lbs: string };
export type Post = {
  id: string; author: string; crew_id: string; kind: 'meal' | 'workout'; day: string;
  title: string | null; notes: string | null; photo_path: string | null;
  meal_type: string | null; place: string | null; kcal: number | null; protein: number | null; carbs: number | null; fat: number | null;
  wtype: string | null; minutes: number | null; exercises: Exercise[]; created_at: string;
};
export type Profile = {
  id: string; display_name: string | null; crew_id: string | null;
  kcal_goal: number | null; macro_mode: 'pct' | 'g'; pct_p: number | null; pct_c: number | null; pct_f: number | null;
  protein_goal: number | null; carb_goal: number | null; fat_goal: number | null; water_goal: number; workout_goal: number;
};
export type Crew = { id: string; name: string; code: string };
export type Comment = { id: string; post_id: string; author: string; body: string; created_at: string };
export type Prop = { post_id: string; user_id: string };
export type WaterDay = { oz: number; entries: { oz: number; t: number }[] };

type Ctx = {
  session: Session | null; ready: boolean; uid: string | null;
  profile: Profile | null; crew: Crew | null; members: Record<string, Profile>;
  posts: Post[]; props: Prop[]; comments: Comment[]; water: WaterDay; loading: boolean;
  refresh: () => Promise<void>;
  nameOf: (id: string) => string;
  saveProfile: (patch: Partial<Profile>) => Promise<string | null>;
  createCrew: (name: string) => Promise<string | null>;
  joinCrew: (code: string) => Promise<string | null>;
  addPost: (p: Partial<Post>, photoBase64?: string | null) => Promise<string | null>;
  deletePost: (p: Post) => Promise<void>;
  toggleProp: (post: Post) => Promise<void>;
  addComment: (postId: string, body: string) => Promise<string | null>;
  deleteComment: (id: string) => Promise<void>;
  addWater: (oz: number) => Promise<void>;
  undoWater: () => Promise<void>;
};

const DataCtx = createContext<Ctx | null>(null);
export const useData = () => {
  const c = useContext(DataCtx);
  if (!c) throw new Error('useData outside provider');
  return c;
};

const errMsg = (e: unknown) => (e && typeof e === 'object' && 'message' in e ? String((e as any).message) : 'Something went wrong. Try again.');

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [crew, setCrew] = useState<Crew | null>(null);
  const [members, setMembers] = useState<Record<string, Profile>>({});
  const [posts, setPosts] = useState<Post[]>([]);
  const [props, setProps] = useState<Prop[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [water, setWater] = useState<WaterDay>({ oz: 0, entries: [] });
  const [loading, setLoading] = useState(false);
  const uid = session?.user.id ?? null;
  const cleaned = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadProfile = useCallback(async () => {
    if (!uid) { setProfile(null); setCrew(null); return null; }
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    setProfile((data as Profile) ?? null);
    if (data?.crew_id) {
      const { data: c } = await supabase.from('crews').select('id,name,code').eq('id', data.crew_id).maybeSingle();
      setCrew((c as Crew) ?? null);
    } else setCrew(null);
    return (data as Profile) ?? null;
  }, [uid]);

  const loadFeed = useCallback(async (crewId: string | null) => {
    if (!uid) return;
    const since = addDays(today(), -60);
    const [{ data: ps }, { data: ms }, { data: w }] = await Promise.all([
      crewId ? supabase.from('posts').select('*').eq('crew_id', crewId).gte('day', since).order('created_at', { ascending: false }).limit(500) : Promise.resolve({ data: [] as Post[] }),
      crewId ? supabase.from('profiles').select('*').eq('crew_id', crewId) : Promise.resolve({ data: [] as Profile[] }),
      supabase.from('water').select('oz,entries').eq('user_id', uid).eq('day', today()).maybeSingle(),
    ]);
    const list = (ps as Post[]) ?? [];
    setPosts(list);
    const map: Record<string, Profile> = {};
    ((ms as Profile[]) ?? []).forEach((m) => (map[m.id] = m));
    setMembers(map);
    setWater(w ? { oz: (w as any).oz ?? 0, entries: (w as any).entries ?? [] } : { oz: 0, entries: [] });
    const ids = list.map((p) => p.id);
    if (ids.length) {
      const [{ data: pr }, { data: cm }] = await Promise.all([
        supabase.from('props').select('post_id,user_id').in('post_id', ids),
        supabase.from('comments').select('*').in('post_id', ids).order('created_at'),
      ]);
      setProps((pr as Prop[]) ?? []);
      setComments((cm as Comment[]) ?? []);
    } else { setProps([]); setComments([]); }
  }, [uid]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try { const p = await loadProfile(); await loadFeed(p?.crew_id ?? null); } finally { setLoading(false); }
  }, [loadProfile, loadFeed]);

  useEffect(() => { if (uid) refresh(); else { setPosts([]); setMembers({}); setProfile(null); setCrew(null); } }, [uid, refresh]);

  // Live updates from the crew
  useEffect(() => {
    if (!uid || !crew) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const bump = () => { if (timer) clearTimeout(timer); timer = setTimeout(() => loadFeed(crew.id), 400); };
    const ch = supabase.channel(`crew-${crew.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `crew_id=eq.${crew.id}` }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'props' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, bump)
      .subscribe();
    return () => { if (timer) clearTimeout(timer); supabase.removeChannel(ch); };
  }, [uid, crew, loadFeed]);

  // Remove my photos once posts are 3 days old (the post itself stays so macro history and workouts remain)
  useEffect(() => {
    if (!uid || cleaned.current || !posts.length) return;
    const old = posts.filter((p) => p.author === uid && p.photo_path && ageMs(p.created_at) > POST_TTL_MS);
    if (!old.length) return;
    cleaned.current = true;
    (async () => {
      const paths = old.map((p) => p.photo_path!) ;
      await supabase.storage.from('photos').remove(paths);
      await supabase.from('posts').update({ photo_path: null }).in('id', old.map((p) => p.id));
      if (crew) loadFeed(crew.id);
    })().catch(() => {});
  }, [uid, posts, crew, loadFeed]);

  const nameOf = useCallback((id: string) => members[id]?.display_name || (id === uid ? 'You' : 'Teammate'), [members, uid]);

  const value = useMemo<Ctx>(() => ({
    session, ready, uid, profile, crew, members, posts, props, comments, water, loading, refresh, nameOf,

    async saveProfile(patch) {
      if (!uid) return 'Sign in first.';
      const { error } = await supabase.from('profiles').update(patch).eq('id', uid);
      if (error) return errMsg(error);
      await loadProfile();
      return null;
    },
    async createCrew(name) {
      const { error } = await supabase.rpc('create_crew', { crew_name: name });
      if (error) return errMsg(error);
      await refresh();
      return null;
    },
    async joinCrew(code) {
      const { error } = await supabase.rpc('join_crew', { crew_code: code });
      if (error) return errMsg(error);
      await refresh();
      return null;
    },
    async addPost(p, photoBase64) {
      if (!uid || !crew) return 'Join a crew first.';
      let photo_path: string | null = null;
      if (photoBase64) {
        photo_path = `${uid}/${uuid()}.jpg`;
        const { error } = await supabase.storage.from('photos').upload(photo_path, decode(photoBase64), { contentType: 'image/jpeg' });
        if (error) return `The photo didn't upload: ${errMsg(error)}`;
      }
      const { error } = await supabase.from('posts').insert({ ...p, author: uid, crew_id: crew.id, photo_path });
      if (error) { if (photo_path) supabase.storage.from('photos').remove([photo_path]); return errMsg(error); }
      await loadFeed(crew.id);
      return null;
    },
    async deletePost(p) {
      await supabase.from('posts').delete().eq('id', p.id);
      if (p.photo_path) await supabase.storage.from('photos').remove([p.photo_path]);
      if (crew) await loadFeed(crew.id);
    },
    async toggleProp(post) {
      if (!uid || post.author === uid) return;
      const has = props.some((x) => x.post_id === post.id && x.user_id === uid);
      setProps((cur) => (has ? cur.filter((x) => !(x.post_id === post.id && x.user_id === uid)) : [...cur, { post_id: post.id, user_id: uid }]));
      if (has) await supabase.from('props').delete().eq('post_id', post.id).eq('user_id', uid);
      else await supabase.from('props').insert({ post_id: post.id, user_id: uid });
    },
    async addComment(postId, body) {
      const text = body.trim().slice(0, 300);
      if (!text) return null;
      const { error } = await supabase.from('comments').insert({ post_id: postId, body: text });
      if (error) return errMsg(error);
      if (crew) await loadFeed(crew.id);
      return null;
    },
    async deleteComment(id) {
      setComments((cur) => cur.filter((c) => c.id !== id));
      await supabase.from('comments').delete().eq('id', id);
    },
    async addWater(oz) {
      if (!uid || !(oz > 0)) return;
      const entries = [...water.entries, { oz: Math.round(oz), t: Date.now() }].slice(-80);
      const total = entries.reduce((a, e) => a + e.oz, 0);
      setWater({ oz: total, entries });
      await supabase.from('water').upsert({ user_id: uid, day: today(), oz: total, entries });
    },
    async undoWater() {
      if (!uid || !water.entries.length) return;
      const entries = water.entries.slice(0, -1);
      const total = entries.reduce((a, e) => a + e.oz, 0);
      setWater({ oz: total, entries });
      await supabase.from('water').upsert({ user_id: uid, day: today(), oz: total, entries });
    },
  }), [session, ready, uid, profile, crew, members, posts, props, comments, water, loading, refresh, nameOf, loadProfile, loadFeed]);

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}
