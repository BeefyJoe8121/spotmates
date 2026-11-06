import React, { useState } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Post, useData } from '@/lib/data';
import { photoUrl } from '@/lib/supabase';
import { prevBest, prLbs, prReps, prScore, TROPHY } from '@/lib/prs';
import { F, useTheme } from '@/lib/theme';
import { ageMs, dayLabel, fmt, today, macroKcal, num, POST_TTL_MS, relTime, timeOf, ttlText } from '@/lib/util';
import { Btn, Field, T } from './ui';

export function PostCard({ post }: { post: Post }) {
  const c = useTheme();
  const { uid, nameOf, props, comments, toggleProp, deletePost, prs, copyMeal } = useData();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [armDelete, setArmDelete] = useState(false);
  const mine = post.author === uid;
  const meal = post.kind === 'meal';
  const photo = post.photo_path && ageMs(post.created_at) < POST_TTL_MS ? photoUrl(post.photo_path) : null;
  const propCount = props.filter((p) => p.post_id === post.id).length;
  const gave = props.some((p) => p.post_id === post.id && p.user_id === uid);
  const thread = comments.filter((x) => x.post_id === post.id);
  const pr = post.kind === 'pr';
  const tagLabel = pr ? 'PR' : meal ? [post.meal_type || 'Meal', post.place].filter(Boolean).join(' · ') : post.wtype || 'Workout';

  const meta = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <T bold size={13}>{nameOf(post.author)}</T>
      <View style={{ backgroundColor: pr ? c.sunk : meal ? c.mealSoft : c.liftSoft, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 }}>
        <T bold size={11} style={{ color: pr ? c.gold : meal ? c.meal : c.lift, letterSpacing: 1, textTransform: 'uppercase' }}>{tagLabel}</T>
      </View>
      <T mono muted size={12} style={{ marginLeft: 'auto' }}>{pr ? dayLabel(post.day) : timeOf(post.created_at)}</T>
      {meal || photo ? <T muted size={11}>{meal ? ttlText(post.created_at) : `Photo ${ttlText(post.created_at).toLowerCase()}`}</T> : null}
    </View>
  );

  const actions = (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: c.line, paddingTop: 10 }}>
        <Pill title={`Props ${propCount}`} on={gave} disabled={mine} onPress={() => toggleProp(post)} />
        <Pill title={thread.length ? `Comments ${thread.length}` : 'Comment'} on={showComments} onPress={() => setShowComments(!showComments)} />
        {mine && meal ? <Pill title={copied ? 'Logged ✓' : 'Log again'} disabled={copied} onPress={async () => {
          const e = await copyMeal(post, today());
          if (e) Alert.alert("Couldn't log it", e); else setCopied(true);
        }} /> : null}
        {mine ? (
          <Pressable style={{ marginLeft: 'auto', padding: 4 }} accessibilityRole="button"
            onPress={() => { if (armDelete) deletePost(post); else { setArmDelete(true); setTimeout(() => setArmDelete(false), 3500); } }}>
            <T size={13} bold={armDelete} style={{ color: armDelete ? c.danger : c.muted }}>{armDelete ? 'Tap again to delete' : 'Delete'}</T>
          </Pressable>
        ) : null}
      </View>
      {showComments ? <Comments postId={post.id} mineAuthor={mine} /> : thread.length ? (
        <Pressable onPress={() => setShowComments(true)}><T size={13} numberOfLines={1}><T bold size={13}>{nameOf(thread[thread.length - 1].author)}</T> {thread[thread.length - 1].body}{thread.length > 1 ? `  · view all ${thread.length}` : ''}</T></Pressable>
      ) : null}
    </View>
  );

  if (pr) {
    const lbs = prLbs(post), reps = prReps(post), est = prScore(post);
    const pb = prevBest(prs, post);
    const delta = pb ? Math.round(est - prScore(pb)) : null;
    return (
      <View style={{ backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 }}>
        {meta}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <SvgXml xml={TROPHY} width={40} height={40} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: F.display, fontSize: 26, lineHeight: 28, textTransform: 'uppercase', color: c.ink }} numberOfLines={2}>{post.title}</Text>
            <T mono size={15}><T mono bold size={20}>{fmt(lbs)}</T> lb × {fmt(reps)} rep{reps === 1 ? '' : 's'}</T>
          </View>
        </View>
        <View style={{ gap: 2 }}>
          {reps > 1 ? <T muted size={13}>Est. 1-rep max <T bold size={13}>{fmt(est)}</T> lb</T> : null}
          <T muted size={13}>{pb ? (delta! > 0 ? <><T bold size={13} style={{ color: c.protein }}>+{fmt(delta)} lb</T> over last PR ({fmt(prLbs(pb))}×{fmt(prReps(pb))})</> : `Last PR ${fmt(prLbs(pb))}×${fmt(prReps(pb))}`) : 'First logged PR for this lift'}</T>
        </View>
        {post.notes ? <T>{post.notes}</T> : null}
        {actions}
      </View>
    );
  }

  if (meal) {
    const kc = post.kcal ?? macroKcal(post.protein, post.carbs, post.fat);
    return (
      <View style={{ backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 14, overflow: 'hidden' }}>
        {photo ? <Image source={{ uri: photo }} style={{ width: '100%', aspectRatio: 4 / 3, backgroundColor: c.sunk }} accessibilityLabel={`Meal photo: ${post.title ?? ''}`} /> : null}
        <View style={{ padding: 14, gap: 10 }}>
          {meta}
          {post.title ? <T bold size={18}>{post.title}</T> : null}
          <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: c.line, borderRadius: 10, overflow: 'hidden' }}>
            {[['Calories', fmt(kc), ''], ['Protein', fmt(num(post.protein)), 'g'], ['Carbs', fmt(num(post.carbs)), 'g'], ['Fat', fmt(num(post.fat)), 'g']].map(([l, v, u], i) => (
              <View key={l} style={{ flex: 1, padding: 8, borderLeftWidth: i ? 1 : 0, borderLeftColor: c.line, backgroundColor: i ? 'transparent' : c.mealSoft }}>
                <T bold muted size={10} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>{l}</T>
                <T mono bold size={16}>{v}<T mono muted size={12}>{u}</T></T>
              </View>
            ))}
          </View>
          {post.foods?.length ? (
            <View style={{ gap: 6 }}>
              {post.foods.map((x, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'baseline' }}>
                  <T size={14} style={{ flex: 1 }} numberOfLines={1}>{x.name}<T muted size={12}>  {x.serving}{x.qty !== 1 ? ` × ${x.qty}` : ''}</T></T>
                  <T mono muted size={13}>{x.kcal} cal</T>
                </View>
              ))}
            </View>
          ) : null}
          {post.notes ? <T>{post.notes}</T> : null}
          {actions}
        </View>
      </View>
    );
  }

  const ex = post.exercises ?? [];
  const sets = ex.reduce((a, e) => a + (num(e.sets) ?? 0), 0);
  const vol = ex.reduce((a, e) => a + (num(e.sets) ?? 0) * (num(e.reps) ?? 0) * (num(e.lbs) ?? 0), 0);
  const bits = [ex.length ? `${ex.length} exercise${ex.length === 1 ? '' : 's'}` : '', post.minutes ? `${post.minutes} min` : ''].filter(Boolean).join(' · ');
  return (
    <View style={{ backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 14, overflow: 'hidden' }}>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        {photo ? <Image source={{ uri: photo }} style={{ width: '100%', aspectRatio: 4 / 3, backgroundColor: c.sunk }} accessibilityLabel={`Workout photo: ${post.title ?? ''}`} /> : null}
        <View style={{ padding: 14, gap: 6 }}>
          {meta}
          <Text style={{ fontFamily: F.display, fontSize: 28, lineHeight: 30, textTransform: 'uppercase', color: c.ink }}>{post.title || post.wtype || 'Workout'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <T bold size={13} style={{ color: c.lift }}>{open ? 'Hide workout' : 'See the workout'}</T>
            {bits ? <T mono muted size={12}>{bits}</T> : null}
            <T bold style={{ marginLeft: 'auto', color: c.lift }}>{open ? '▴' : '▾'}</T>
          </View>
        </View>
      </Pressable>
      {open ? (
        <View style={{ paddingHorizontal: 14, paddingBottom: 12, gap: 10, borderTopWidth: 1, borderTopColor: c.line, paddingTop: 12 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            {post.minutes ? <T mono muted size={13}><T mono bold size={13}>{post.minutes}</T> min</T> : null}
            {sets ? <T mono muted size={13}><T mono bold size={13}>{fmt(sets)}</T> sets</T> : null}
            {vol ? <T mono muted size={13}><T mono bold size={13}>{fmt(vol)}</T> lb volume</T> : null}
          </View>
          {ex.length ? (
            <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: 10, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', backgroundColor: c.liftSoft, paddingVertical: 6, paddingHorizontal: 10 }}>
                {['Exercise', 'Sets', 'Reps', 'Lbs'].map((h, i) => <T key={h} bold muted size={10} style={{ flex: i ? 0.6 : 2, textAlign: i ? 'right' : 'left', letterSpacing: 1, textTransform: 'uppercase' }}>{h}</T>)}
              </View>
              {ex.map((e, i) => (
                <View key={i} style={{ flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: c.line }}>
                  <T size={14} style={{ flex: 2 }}>{e.name}</T>
                  {[e.sets, e.reps, e.lbs].map((v, j) => <T key={j} mono size={14} style={{ flex: 0.6, textAlign: 'right' }}>{v || '–'}</T>)}
                </View>
              ))}
            </View>
          ) : null}
          {post.notes ? <T>{post.notes}</T> : null}
          {actions}
        </View>
      ) : null}
    </View>
  );
}

function Pill({ title, on, disabled, onPress }: { title: string; on?: boolean; disabled?: boolean; onPress?: () => void }) {
  const c = useTheme();
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
      style={{ borderWidth: 1, borderColor: on ? c.ink : c.line, backgroundColor: on ? c.ink : 'transparent', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12, opacity: disabled ? 0.5 : 1 }}>
      <T bold size={13} style={{ color: on ? c.bg : c.ink }}>{title}</T>
    </Pressable>
  );
}

function Comments({ postId, mineAuthor }: { postId: string; mineAuthor: boolean }) {
  const c = useTheme();
  const { comments, nameOf, uid, addComment, deleteComment } = useData();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const list = comments.filter((x) => x.post_id === postId);
  return (
    <View style={{ backgroundColor: c.sunk, borderRadius: 10, padding: 10, gap: 10 }}>
      {list.length ? list.map((x) => (
        <View key={x.id} style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <T size={14}><T bold size={14}>{nameOf(x.author)}</T>  <T mono muted size={12}>{relTime(x.created_at)}</T></T>
            <T size={14}>{x.body}</T>
          </View>
          {x.author === uid ? <Pressable onPress={() => deleteComment(x.id)} accessibilityLabel="Delete comment" style={{ padding: 4 }}><T muted size={12}>✕</T></Pressable> : null}
        </View>
      )) : <T muted size={13}>{mineAuthor ? "No comments yet. Your friends' comments show up here." : 'No comments yet. Say something to keep them honest.'}</T>}
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Field value={text} onChangeText={setText} placeholder="Add a comment…" maxLength={300} accessibilityLabel="Add a comment" style={{ backgroundColor: c.surface, borderRadius: 999, paddingVertical: 8 }} />
        <Btn small kind="primary" title="Post" disabled={busy || !text.trim()} onPress={async () => {
          setBusy(true); const e = await addComment(postId, text); setBusy(false);
          if (e) setErr(e); else { setText(''); setErr(null); }
        }} />
      </View>
      {err ? <T size={12} style={{ color: c.danger }}>{err}</T> : null}
    </View>
  );
}
